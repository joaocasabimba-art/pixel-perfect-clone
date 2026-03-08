import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUpdateLeadStatus } from "@/hooks/useLeads";
import { formatCurrency } from "@/lib/business";
import type { Lead, LeadStatus } from "@/lib/types";

const columns: { key: LeadStatus; label: string }[] = [
  { key: "new", label: "Novo" },
  { key: "quoted", label: "Orçado" },
  { key: "negotiating", label: "Negociando" },
  { key: "won", label: "Fechado" },
  { key: "lost", label: "Perdido" },
];

interface Props {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (lead: Lead, status: LeadStatus) => void;
}

export function LeadDetailSheet({ lead, open, onOpenChange, onStatusChange }: Props) {
  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{lead.name}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          {lead.phone && (
            <div>
              <p className="text-xs text-muted-foreground">Telefone</p>
              <p className="text-sm font-medium text-foreground">{lead.phone}</p>
            </div>
          )}
          {lead.email && (
            <div>
              <p className="text-xs text-muted-foreground">E-mail</p>
              <p className="text-sm font-medium text-foreground">{lead.email}</p>
            </div>
          )}
          {lead.service_type && (
            <div>
              <p className="text-xs text-muted-foreground">Serviço</p>
              <p className="text-sm font-medium text-foreground">{lead.service_type}</p>
            </div>
          )}
          {lead.location && (
            <div>
              <p className="text-xs text-muted-foreground">Localização</p>
              <p className="text-sm font-medium text-foreground">{lead.location}</p>
            </div>
          )}
          {lead.origin && (
            <div>
              <p className="text-xs text-muted-foreground">Origem</p>
              <p className="text-sm font-medium text-foreground">{lead.origin}</p>
            </div>
          )}
          {(lead as any).quote_value && (
            <div>
              <p className="text-xs text-muted-foreground">Valor estimado</p>
              <p className="text-sm font-medium text-foreground">
                {formatCurrency((lead as any).quote_value)}
              </p>
            </div>
          )}
          {lead.notes && (
            <div>
              <p className="text-xs text-muted-foreground">Observações</p>
              <p className="text-sm text-foreground whitespace-pre-line">{lead.notes}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Mover para</p>
            <div className="flex flex-wrap gap-2">
              {columns
                .filter((c) => c.key !== lead.status)
                .map((c) => (
                  <Button
                    key={c.key}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => onStatusChange(lead, c.key)}
                  >
                    {c.label}
                  </Button>
                ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
