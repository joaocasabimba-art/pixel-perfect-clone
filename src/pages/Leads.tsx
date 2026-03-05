import { Plus, Phone, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type LeadStatus = "new" | "quoted" | "negotiating" | "won" | "lost";

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  origin: string | null;
  service_type: string | null;
  location: string | null;
  notes: string | null;
  status: string;
  last_action: string | null;
  created_at: string;
}

const columns: { key: LeadStatus; label: string; badgeClass: string }[] = [
  { key: "new", label: "Novo", badgeClass: "bg-primary-light text-primary-mid" },
  { key: "quoted", label: "Orçado", badgeClass: "bg-warning-light text-warning" },
  { key: "negotiating", label: "Negociando", badgeClass: "bg-accent text-accent-foreground" },
  { key: "won", label: "Fechado", badgeClass: "bg-success-light text-success" },
  { key: "lost", label: "Perdido", badgeClass: "bg-danger-light text-danger" },
];

function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  return (
    <div onClick={onClick} className="bg-card border border-border rounded-lg p-3 space-y-2 hover:shadow-md transition-shadow cursor-pointer">
      <p className="font-semibold text-sm text-foreground">{lead.name}</p>
      {lead.phone && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Phone className="w-3 h-3" />{lead.phone}
        </div>
      )}
      {lead.service_type && <p className="text-xs text-muted-foreground">{lead.service_type}</p>}
      {lead.location && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />{lead.location}
        </div>
      )}
      <div className="border-t border-border pt-2 mt-2">
        <div className="flex items-center justify-between">
          {lead.origin && <span className="text-xs text-muted-foreground">Origem: {lead.origin}</span>}
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ptBR })}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Leads() {
  const { toast } = useToast();
  const companyId = useCompanyId();
  const queryClient = useQueryClient();
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [origin, setOrigin] = useState("WhatsApp");
  const [serviceType, setServiceType] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!companyId,
  });

  const createLead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("leads").insert({
        company_id: companyId!,
        name,
        phone: phone || null,
        origin,
        service_type: serviceType || null,
        location: location || null,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Lead criado!" });
      setNewLeadOpen(false);
      setName(""); setPhone(""); setOrigin("WhatsApp"); setServiceType(""); setLocation(""); setNotes("");
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("leads")
        .update({ status, last_action: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const leadsByStatus = (status: LeadStatus) => leads?.filter((l) => l.status === status) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-4">
          {columns.map((c) => (
            <div key={c.key} className="min-w-[260px] space-y-3">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Leads</h1>
      </div>

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colLeads = leadsByStatus(col.key);
          return (
            <div key={col.key} className="min-w-[260px] flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge className={`${col.badgeClass} border-0 text-xs font-semibold`}>{col.label}</Badge>
                  <span className="text-xs text-muted-foreground font-medium">{colLeads.length}</span>
                </div>
              </div>
              <div className="space-y-3">
                {colLeads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} onClick={() => setSelectedLead(lead)} />
                ))}
                {colLeads.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                    Nenhum lead
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Lead Dialog */}
      <Dialog open={newLeadOpen} onOpenChange={setNewLeadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do lead" />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-2">
              <Label>Origem</Label>
              <Select value={origin} onValueChange={setOrigin}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="Google">Google</SelectItem>
                  <SelectItem value="Indicação">Indicação</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de serviço</Label>
              <Input value={serviceType} onChange={(e) => setServiceType(e.target.value)} placeholder="Ex: Dedetização" />
            </div>
            <div className="space-y-2">
              <Label>Localização</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Cidade - UF" />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalhes do lead" />
            </div>
            <Button
              className="w-full bg-primary-mid hover:bg-primary-mid/90 text-primary-mid-foreground"
              onClick={() => createLead.mutate()}
              disabled={!name || createLead.isPending}
            >
              {createLead.isPending ? "Criando..." : "Criar Lead"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lead Detail Sheet */}
      <Sheet open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selectedLead?.name}</SheetTitle>
          </SheetHeader>
          {selectedLead && (
            <div className="space-y-4 mt-4">
              {selectedLead.phone && (
                <div>
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <p className="text-sm font-medium text-foreground">{selectedLead.phone}</p>
                </div>
              )}
              {selectedLead.email && (
                <div>
                  <p className="text-xs text-muted-foreground">E-mail</p>
                  <p className="text-sm font-medium text-foreground">{selectedLead.email}</p>
                </div>
              )}
              {selectedLead.service_type && (
                <div>
                  <p className="text-xs text-muted-foreground">Serviço</p>
                  <p className="text-sm font-medium text-foreground">{selectedLead.service_type}</p>
                </div>
              )}
              {selectedLead.location && (
                <div>
                  <p className="text-xs text-muted-foreground">Localização</p>
                  <p className="text-sm font-medium text-foreground">{selectedLead.location}</p>
                </div>
              )}
              {selectedLead.origin && (
                <div>
                  <p className="text-xs text-muted-foreground">Origem</p>
                  <p className="text-sm font-medium text-foreground">{selectedLead.origin}</p>
                </div>
              )}
              {selectedLead.notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Observações</p>
                  <p className="text-sm text-foreground">{selectedLead.notes}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Mover para</p>
                <div className="flex flex-wrap gap-2">
                  {columns
                    .filter((c) => c.key !== selectedLead.status)
                    .map((c) => (
                      <Button
                        key={c.key}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          updateStatus.mutate({ id: selectedLead.id, status: c.key });
                          setSelectedLead({ ...selectedLead, status: c.key });
                        }}
                      >
                        {c.label}
                      </Button>
                    ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* FAB */}
      <Button
        onClick={() => setNewLeadOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-6 w-14 h-14 rounded-full shadow-lg bg-primary-mid hover:bg-primary-mid/90 text-primary-mid-foreground z-30"
        size="icon"
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  );
}
