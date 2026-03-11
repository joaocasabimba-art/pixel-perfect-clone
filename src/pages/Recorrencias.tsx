import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCcw, MessageCircle, Calendar, Copy, ExternalLink, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { EmptyState } from "@/components/EmptyState";
import { formatDateBR, recurrenceUrgency, whatsappLink, formatCurrency } from "@/lib/business";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Recorrencias() {
  const companyId = useCompanyId();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [urgencyFilter, setUrgencyFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [contactOpen, setContactOpen] = useState(false);
  const [contactMsg, setContactMsg] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactName, setContactName] = useState("");

  // Fetch company for message template
  const { data: company } = useQuery({
    queryKey: ["my-company"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_user_company_id");
      if (!data) return null;
      const { data: co } = await supabase.from("companies").select("*").eq("id", data).single();
      return co;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["recurrences", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurrences")
        .select("*, client:clients(id, name, phone)")
        .order("next_service_date");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  const recs = data ?? [];
  const todayStr = new Date().toISOString().split("T")[0];

  // Categorize by urgency
  const categorize = (r: any) => {
    if (!r.next_service_date) return "none";
    const days = Math.ceil(
      (new Date(r.next_service_date).getTime() - Date.now()) / 86400000
    );
    if (days < 0) return "overdue";
    if (days <= 7) return "7days";
    if (days <= 15) return "15days";
    if (days <= 30) return "30days";
    return "ok";
  };

  const categorized = recs.map((r: any) => ({ ...r, _urgency: categorize(r) }));
  const overdue = categorized.filter((r) => r._urgency === "overdue");
  const week = categorized.filter((r) => r._urgency === "7days");
  const biweek = categorized.filter((r) => r._urgency === "15days");
  const month = categorized.filter((r) => r._urgency === "30days");

  const summaryCards = [
    { key: "overdue", label: "Vencidos", count: overdue.length, className: "bg-red-100 text-red-700 border-red-200" },
    { key: "7days", label: "7 dias", count: week.length, className: "bg-amber-100 text-amber-700 border-amber-200" },
    { key: "15days", label: "15 dias", count: biweek.length, className: "bg-blue-100 text-blue-700 border-blue-200" },
    { key: "30days", label: "30 dias", count: month.length, className: "bg-green-100 text-green-700 border-green-200" },
  ];

  // Filter list
  let filtered = categorized;
  if (urgencyFilter) {
    filtered = filtered.filter((r) => r._urgency === urgencyFilter);
  }
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter((r: any) => r.client?.name?.toLowerCase().includes(s));
  }

  const serviceLabels: Record<string, string> = {
    caixa_dagua: "limpeza de caixa d'água",
    dedetizacao: "dedetização",
    desratizacao: "desratização",
    descupinizacao: "descupinização",
    sanitizacao: "sanitização",
    desentupimento: "desentupimento",
  };

  const handleContact = (rec: any) => {
    const clientName = rec.client?.name || "Cliente";
    const phone = rec.client?.phone || "";
    const companyName = company?.name || "PragaZero";
    const companyPhone = company?.phone || "";
    const svcLabel = serviceLabels[rec.service_type] ?? rec.service_type;

    const msg = `Olá, ${clientName}! 👋\nPassando para lembrar que o serviço de *${svcLabel}* está próximo do vencimento.\n${rec.last_service_date ? `A última aplicação foi em ${formatDateBR(rec.last_service_date)} ` : ""}e o prazo recomendado é a cada ${rec.interval_months} meses.\n\nPosso verificar a agenda para agendarmos? 😊\n\n— ${companyName}${companyPhone ? "\n" + companyPhone : ""}`;

    setContactMsg(msg);
    setContactPhone(phone);
    setContactName(clientName);
    setContactOpen(true);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(contactMsg);
    toast({ title: "Mensagem copiada!" });
  };

  const handleOpenWhatsApp = () => {
    if (!contactPhone) {
      toast({ title: "Cliente sem telefone cadastrado", variant: "destructive" });
      return;
    }
    window.open(whatsappLink(contactPhone, contactMsg), "_blank");
  };

  const handleSchedule = (rec: any) => {
    navigate(`/agenda?new=true&client_id=${rec.client?.id || ""}`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <RotateCcw className="w-6 h-6" />
        Recorrências
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((s) => (
          <Card
            key={s.key}
            className={`cursor-pointer hover:shadow-md transition-shadow border ${
              urgencyFilter === s.key ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setUrgencyFilter(urgencyFilter === s.key ? null : s.key)}
          >
            <CardContent className="p-4 text-center">
              <Badge className={`${s.className} text-xs mb-2`}>{s.label}</Badge>
              <p className="text-2xl font-bold text-foreground">{s.count}</p>
              <p className="text-xs text-muted-foreground">clientes</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🔄"
          title="Nenhuma recorrência encontrada"
          description="Recorrências são criadas ao concluir serviços com intervalo definido"
        />
      ) : !isMobile ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Última vez</TableHead>
                <TableHead>Próxima data</TableHead>
                <TableHead>Urgência</TableHead>
                <TableHead className="w-40">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r: any) => {
                const urgency = r.next_service_date ? recurrenceUrgency(r.next_service_date) : null;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.client?.name || "—"}</TableCell>
                    <TableCell>{r.service_type}</TableCell>
                    <TableCell>{r.last_service_date ? formatDateBR(r.last_service_date) : "—"}</TableCell>
                    <TableCell>{r.next_service_date ? formatDateBR(r.next_service_date) : "—"}</TableCell>
                    <TableCell>
                      {urgency && (
                        <Badge variant={urgency.color === "destructive" ? "destructive" : "outline"} className={`text-xs${urgency.color === "warning" ? " border-amber-500 text-amber-700" : ""}`}>
                          {urgency.label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => handleContact(r)}>
                          <MessageCircle className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => handleSchedule(r)}>
                          <Calendar className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r: any) => {
            const urgency = r.next_service_date ? recurrenceUrgency(r.next_service_date) : null;
            return (
              <Card key={r.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-foreground">{r.client?.name || "—"}</p>
                    {urgency && (
                      <Badge variant={urgency.color === "destructive" ? "destructive" : "outline"} className={`text-xs${urgency.color === "warning" ? " border-amber-500 text-amber-700" : ""}`}>
                        {urgency.label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{r.service_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.last_service_date ? `Último: ${formatDateBR(r.last_service_date)}` : ""}
                    {r.next_service_date ? ` · Próximo: ${formatDateBR(r.next_service_date)}` : ""}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleContact(r)}>
                      <MessageCircle className="w-3.5 h-3.5" /> Contatar
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleSchedule(r)}>
                      <Calendar className="w-3.5 h-3.5" /> Agendar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Contact modal */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contatar {contactName}</DialogTitle>
            <DialogDescription>Edite a mensagem antes de enviar.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={contactMsg}
            onChange={(e) => setContactMsg(e.target.value)}
            rows={8}
            className="text-sm"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleCopy} className="gap-1.5">
              <Copy className="w-4 h-4" /> Copiar
            </Button>
            <Button onClick={handleOpenWhatsApp} className="gap-1.5">
              <ExternalLink className="w-4 h-4" /> Abrir WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
