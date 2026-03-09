import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDateBR, formatCurrency, whatsappLink } from "@/lib/business";
import { friendlyError } from "@/lib/errorHandler";
import { ArrowLeft, Phone, Mail, MapPin, Plus, MessageCircle, AlertTriangle, Eye, FileText, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

function ClientAvatar({ name, id }: { name: string; id: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  // Generate consistent color from id
  const hue = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
      style={{ backgroundColor: `hsl(${hue}, 60%, 50%)` }}
    >
      {initials}
    </div>
  );
}

export default function ClienteDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const companyId = useCompanyId();
  const { profile } = useAuth();
  const isTechnician = profile?.role === "technician";

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteIsAlert, setNoteIsAlert] = useState(false);

  // Fetch client
  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch services
  const { data: services } = useQuery({
    queryKey: ["client-services", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*, tech:profiles!services_assigned_to_fkey(full_name)")
        .eq("client_id", id!)
        .order("scheduled_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch reports for this client
  const { data: reports } = useQuery({
    queryKey: ["client-reports", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*, service:services(service_type, completed_at)")
        .eq("client_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch work_orders for services
  const { data: workOrders } = useQuery({
    queryKey: ["client-work-orders", id],
    queryFn: async () => {
      if (!services?.length) return [];
      const serviceIds = services.map((s) => s.id);
      const { data, error } = await supabase
        .from("work_orders")
        .select("id, service_id, status")
        .in("service_id", serviceIds);
      if (error) throw error;
      return data;
    },
    enabled: !!services?.length,
  });

  // Fetch recurrences
  const { data: recurrences } = useQuery({
    queryKey: ["client-recurrences", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurrences")
        .select("*")
        .eq("client_id", id!)
        .order("next_service_date");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Add note mutation
  const addNote = useMutation({
    mutationFn: async () => {
      const currentNotes = Array.isArray(client?.notes) ? client.notes : [];
      const newNote = {
        text: noteText,
        is_alert: noteIsAlert,
        created_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("clients")
        .update({ notes: [newNote, ...currentNotes] as any })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", id] });
      setNoteOpen(false);
      setNoteText("");
      setNoteIsAlert(false);
      toast({ title: "Anotação adicionada!" });
    },
    onError: (err: any) =>
      toast({ title: "Erro ao salvar", description: friendlyError(err), variant: "destructive" }),
  });

  const woMap = new Map((workOrders ?? []).map((wo) => [wo.service_id, wo]));
  const notes = Array.isArray(client?.notes) ? (client.notes as any[]) : [];
  const alertNotes = notes.filter((n) => n.is_alert);
  const normalNotes = notes.filter((n) => !n.is_alert);
  const sortedNotes = [...alertNotes, ...normalNotes];

  // Metrics
  const totalServices = services?.length || 0;
  const totalSpent = (services ?? [])
    .filter((s: any) => s.payment_status === "paid")
    .reduce((sum: number, s: any) => sum + (Number(s.value) || 0), 0);
  const lastService = services?.[0];
  const nextRecurrence = recurrences?.[0]?.next_service_date;

  if (clientLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Cliente não encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/clientes")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  const statusBadge: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-800",
    in_progress: "bg-amber-100 text-amber-800",
    done: "bg-green-100 text-green-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-600",
  };

  const reportStatusBadge: Record<string, { label: string; className: string }> = {
    draft: { label: "Rascunho", className: "bg-gray-100 text-gray-600 border-0" },
    signed: { label: "Assinado", className: "bg-blue-100 text-blue-800 border-0" },
    sent: { label: "Enviado", className: "bg-green-100 text-green-800 border-0" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <ClientAvatar name={client.name} id={client.id} />
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <h1 className="text-xl font-bold text-foreground">{client.name}</h1>
                <div className="flex gap-2">
                  {client.phone && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        window.open(
                          whatsappLink(client.phone!, `Olá, ${client.name}! 😊`),
                          "_blank"
                        )
                      }
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => navigate(`/agenda?new=true&client_id=${client.id}`)}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Nova OS
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {client.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> {client.phone}
                  </span>
                )}
                {client.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> {client.email}
                  </span>
                )}
                {(client.address || client.city || client.state) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {[client.address, client.city, client.state].filter(Boolean).join(" – ")}
                  </span>
                )}
              </div>

              {client.tags && client.tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {client.tags.map((t: string) => (
                    <Badge key={t} variant="outline" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{totalServices}</p>
            <p className="text-xs text-muted-foreground">Total serviços</p>
          </CardContent>
        </Card>
        {!isTechnician && (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totalSpent)}</p>
              <p className="text-xs text-muted-foreground">Total gasto</p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm font-bold text-foreground">
              {lastService?.scheduled_date ? formatDateBR(lastService.scheduled_date) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Último serviço</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm font-bold text-foreground">
              {nextRecurrence ? formatDateBR(nextRecurrence) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Próxima recorrência</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="reports">Laudos</TabsTrigger>
          <TabsTrigger value="notes">Anotações</TabsTrigger>
        </TabsList>

        {/* History */}
        <TabsContent value="history" className="mt-4 space-y-3">
          {(!services || services.length === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum serviço registrado.</p>
          ) : (
            services.map((s: any) => {
              const wo = woMap.get(s.id);
              const paid = s.payment_status === "paid";
              return (
                <Card key={s.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${
                            s.status === "done" || s.status === "completed" ? "bg-green-500" :
                            s.status === "in_progress" ? "bg-amber-500" : "bg-blue-500"
                          }`} />
                          <span className="text-sm font-medium">
                            {s.scheduled_date ? formatDateBR(s.scheduled_date) : "—"}
                          </span>
                          <span className="text-sm text-foreground">{s.service_type}</span>
                        </div>
                        <p className="text-xs text-muted-foreground ml-5">
                          {s.tech?.full_name && `Técnico: ${s.tech.full_name}`}
                          {!isTechnician && s.value ? ` · ${formatCurrency(Number(s.value))}` : ""}
                          {!isTechnician && paid && " ✅ Pago"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {wo && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/ordens/${wo.id}`)}
                          >
                            <ClipboardList className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports" className="mt-4 space-y-3">
          {(!reports || reports.length === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum laudo gerado.</p>
          ) : (
            reports.map((r: any) => {
              const st = reportStatusBadge[r.status] || reportStatusBadge.draft;
              return (
                <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/laudos/${r.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{r.service?.service_type || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateBR(r.created_at)}
                          {r.validity_date && ` · Válido até ${formatDateBR(r.validity_date)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={st.className}>{st.label}</Badge>
                        <Button size="sm" variant="ghost">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes" className="mt-4 space-y-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setNoteOpen(true)}
          >
            <Plus className="w-4 h-4" /> Adicionar anotação
          </Button>

          {sortedNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma anotação.</p>
          ) : (
            sortedNotes.map((note: any, idx: number) => (
              <Card
                key={idx}
                className={note.is_alert ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20" : ""}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    {note.is_alert && <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />}
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{note.text}</p>
                      {note.created_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDateBR(note.created_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Add Note Modal */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova anotação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Escreva a anotação..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
            />
            <div className="flex items-center gap-3">
              <Switch
                checked={noteIsAlert}
                onCheckedChange={setNoteIsAlert}
              />
              <label className="text-sm">Marcar como alerta ⚠️</label>
            </div>
            <Button
              className="w-full"
              onClick={() => addNote.mutate()}
              disabled={addNote.isPending || !noteText.trim()}
            >
              {addNote.isPending ? "Salvando..." : "Salvar anotação"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
