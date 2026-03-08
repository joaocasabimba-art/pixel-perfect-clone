import { Phone, MapPin, GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Lead } from "@/lib/types";

interface LeadCardProps {
  lead: Lead;
  onClick?: () => void;
  overlay?: boolean;
}

export function LeadCard({ lead, onClick, overlay }: LeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? undefined : style}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      onClick={onClick}
      className={`bg-card border border-border rounded-lg p-3 space-y-2 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing touch-manipulation ${
        isDragging ? "shadow-lg ring-2 ring-primary-mid" : ""
      } ${overlay ? "shadow-xl ring-2 ring-primary-mid rotate-2" : ""}`}
    >
      <div className="flex items-start justify-between">
        <p className="font-semibold text-sm text-foreground">{lead.name}</p>
        <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>
      {lead.phone && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Phone className="w-3 h-3" />
          {lead.phone}
        </div>
      )}
      {lead.service_type && (
        <p className="text-xs text-muted-foreground">{lead.service_type}</p>
      )}
      {lead.location && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          {lead.location}
        </div>
      )}
      <div className="border-t border-border pt-2 mt-2">
        <div className="flex items-center justify-between">
          {lead.origin && (
            <span className="text-xs text-muted-foreground">
              {lead.origin}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(lead.created_at), {
              addSuffix: true,
              locale: ptBR,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
