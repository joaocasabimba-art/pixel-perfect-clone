import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { LeadCard } from "./LeadCard";
import type { Lead, LeadStatus } from "@/lib/types";

interface ColumnConfig {
  key: LeadStatus;
  label: string;
  badgeClass: string;
}

interface KanbanColumnProps {
  column: ColumnConfig;
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
}

export function KanbanColumn({ column, leads, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });

  return (
    <div
      ref={setNodeRef}
      className={`min-w-[260px] flex-shrink-0 transition-colors rounded-lg ${
        isOver ? "bg-muted/60 ring-2 ring-primary-mid/30" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge
            className={`${column.badgeClass} border-0 text-xs font-semibold`}
          >
            {column.label}
          </Badge>
          <span className="text-xs text-muted-foreground font-medium">
            {leads.length}
          </span>
        </div>
      </div>
      <SortableContext
        items={leads.map((l) => l.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3 min-h-[100px]">
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={() => onCardClick(lead)}
            />
          ))}
          {leads.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
              Arraste leads aqui
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
