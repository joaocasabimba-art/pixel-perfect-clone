import { Plus, Phone, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type LeadStatus = "new" | "quoted" | "negotiating" | "won" | "lost";

interface Lead {
  id: string;
  name: string;
  phone: string;
  service: string;
  location: string;
  origin: string;
  timeAgo: string;
  followup?: string;
}

const columns: { key: LeadStatus; label: string; badgeClass: string }[] = [
  { key: "new", label: "Novo", badgeClass: "bg-primary-light text-primary-mid" },
  { key: "quoted", label: "Orçado", badgeClass: "bg-warning-light text-warning" },
  { key: "negotiating", label: "Negociando", badgeClass: "bg-accent text-accent-foreground" },
  { key: "won", label: "Fechado", badgeClass: "bg-success-light text-success" },
  { key: "lost", label: "Perdido", badgeClass: "bg-danger-light text-danger" },
];

const mockLeads: Record<LeadStatus, Lead[]> = {
  new: [
    { id: "1", name: "João da Silva", phone: "(11) 99999-9999", service: "Dedetização residencial", location: "São Paulo - SP", origin: "WhatsApp", timeAgo: "2 horas", followup: "Follow-up D+1 agendado" },
    { id: "2", name: "Ana Souza", phone: "(11) 98888-7777", service: "Desratização", location: "Osasco - SP", origin: "Instagram", timeAgo: "5 horas" },
  ],
  quoted: [
    { id: "3", name: "Posto Shell", phone: "(11) 3333-4444", service: "Dedetização comercial", location: "Guarulhos - SP", origin: "Google", timeAgo: "1 dia" },
  ],
  negotiating: [
    { id: "4", name: "Maria Costa", phone: "(21) 97777-6666", service: "Limpeza caixa d'água", location: "Rio de Janeiro - RJ", origin: "Indicação", timeAgo: "3 dias" },
  ],
  won: [
    { id: "5", name: "Condomínio Verde", phone: "(11) 2222-1111", service: "Descupinização", location: "ABC - SP", origin: "WhatsApp", timeAgo: "1 dia" },
  ],
  lost: [],
};

function LeadCard({ lead }: { lead: Lead }) {
  return (
    <div className="bg-card border border-border rounded-lg p-3 space-y-2 hover:shadow-md transition-shadow cursor-pointer">
      <p className="font-semibold text-sm text-foreground">{lead.name}</p>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Phone className="w-3 h-3" />
        {lead.phone}
      </div>
      <p className="text-xs text-muted-foreground">{lead.service}</p>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="w-3 h-3" />
        {lead.location}
      </div>
      <div className="border-t border-border pt-2 mt-2 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Origem: {lead.origin}</span>
          <span className="text-xs text-muted-foreground">Há {lead.timeAgo}</span>
        </div>
        {lead.followup && (
          <Badge variant="outline" className="text-[10px] bg-primary-light text-primary-mid border-0">
            {lead.followup}
          </Badge>
        )}
      </div>
    </div>
  );
}

export default function Leads() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Leads</h1>
      </div>

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const leads = mockLeads[col.key];
          return (
            <div key={col.key} className="min-w-[260px] flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge className={`${col.badgeClass} border-0 text-xs font-semibold`}>
                    {col.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-medium">{leads.length}</span>
                </div>
              </div>
              <div className="space-y-3">
                {leads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} />
                ))}
                {leads.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                    Nenhum lead
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAB */}
      <Button
        className="fixed bottom-20 md:bottom-6 right-6 w-14 h-14 rounded-full shadow-lg bg-primary-mid hover:bg-primary-mid/90 text-primary-mid-foreground z-30"
        size="icon"
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  );
}
