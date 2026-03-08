import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeads, useUpdateLeadStatus } from "@/hooks/useLeads";
import { EmptyState } from "@/components/EmptyState";
import { LeadCard } from "@/components/leads/LeadCard";
import { KanbanColumn } from "@/components/leads/KanbanColumn";
import { LeadFormModal } from "@/components/leads/LeadFormModal";
import { LeadDetailSheet } from "@/components/leads/LeadDetailSheet";
import { ConvertLeadModal } from "@/components/leads/ConvertLeadModal";
import { LostReasonModal } from "@/components/leads/LostReasonModal";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Lead, LeadStatus } from "@/lib/types";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";

const COLUMNS: { key: LeadStatus; label: string; badgeClass: string }[] = [
  { key: "new", label: "Novo", badgeClass: "bg-primary-light text-primary-mid" },
  { key: "quoted", label: "Orçado", badgeClass: "bg-warning-light text-warning" },
  { key: "negotiating", label: "Negociando", badgeClass: "bg-accent text-accent-foreground" },
  { key: "won", label: "Fechado", badgeClass: "bg-success-light text-success" },
  { key: "lost", label: "Perdido", badgeClass: "bg-danger-light text-danger" },
];

export default function Leads() {
  const { data: leads, isLoading } = useLeads();
  const updateStatus = useUpdateLeadStatus();
  const isMobile = useIsMobile();

  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Convert modal
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);

  // Lost modal
  const [lostLead, setLostLead] = useState<Lead | null>(null);
  const [lostOpen, setLostOpen] = useState(false);

  // Mobile: column selector
  const [mobileColumn, setMobileColumn] = useState<LeadStatus>("new");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  const leadsByStatus = (status: LeadStatus) =>
    leads?.filter((l) => l.status === status) ?? [];

  const activeLead = activeId ? leads?.find((l) => l.id === activeId) : null;

  function handleStatusChange(lead: Lead, newStatus: LeadStatus) {
    if (newStatus === "won") {
      setConvertLead(lead);
      setConvertOpen(true);
      // Also update status
      updateStatus.mutate({ id: lead.id, status: "won" });
      return;
    }
    if (newStatus === "lost") {
      setLostLead(lead);
      setLostOpen(true);
      return;
    }
    updateStatus.mutate({ id: lead.id, status: newStatus });
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const columnKeys = COLUMNS.map((c) => c.key) as string[];
    const targetStatus = columnKeys.includes(over.id as string)
      ? (over.id as LeadStatus)
      : leads?.find((l) => l.id === over.id)?.status as LeadStatus | undefined;

    if (!targetStatus) return;
    const lead = leads?.find((l) => l.id === active.id);
    if (!lead || lead.status === targetStatus) return;

    handleStatusChange(lead, targetStatus);
  }

  function handleLostConfirm(leadId: string, reason: string) {
    updateStatus.mutate(
      { id: leadId, status: "lost", lost_reason: reason || undefined },
      { onSuccess: () => setLostOpen(false) }
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-4 overflow-hidden">
          {COLUMNS.map((c) => (
            <div key={c.key} className="min-w-[260px] space-y-3">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalLeads = leads?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Leads</h1>
      </div>

      {totalLeads === 0 ? (
        <EmptyState
          icon="📥"
          title="Nenhum lead ainda"
          description="Adicione seu primeiro lead ou aguarde contatos chegarem"
          action={{ label: "Novo Lead", onClick: () => setNewLeadOpen(true) }}
        />
      ) : isMobile ? (
        /* Mobile: column tabs + vertical list */
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {COLUMNS.map((col) => {
              const count = leadsByStatus(col.key).length;
              const isActive = mobileColumn === col.key;
              return (
                <button
                  key={col.key}
                  onClick={() => setMobileColumn(col.key)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    isActive
                      ? `${col.badgeClass}`
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {col.label} ({count})
                </button>
              );
            })}
          </div>
          <div className="space-y-3">
            {leadsByStatus(mobileColumn).map((lead) => (
              <div
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className="bg-card border border-border rounded-lg p-3 space-y-2 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <p className="font-semibold text-sm text-foreground">{lead.name}</p>
                  {lead.origin && (
                    <span className="text-xs text-muted-foreground">{lead.origin}</span>
                  )}
                </div>
                {lead.phone && (
                  <p className="text-xs text-muted-foreground">{lead.phone}</p>
                )}
                {lead.service_type && (
                  <p className="text-xs text-muted-foreground">{lead.service_type}</p>
                )}
              </div>
            ))}
            {leadsByStatus(mobileColumn).length === 0 && (
              <p className="text-center py-8 text-muted-foreground text-sm">
                Nenhum lead nesta coluna
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Desktop: drag-and-drop Kanban */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.key}
                column={col}
                leads={leadsByStatus(col.key)}
                onCardClick={(lead) => setSelectedLead(lead)}
              />
            ))}
          </div>
          <DragOverlay>
            {activeLead ? <LeadCard lead={activeLead} overlay /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Lead form */}
      <LeadFormModal open={newLeadOpen} onOpenChange={setNewLeadOpen} />

      {/* Lead detail */}
      <LeadDetailSheet
        lead={selectedLead}
        open={!!selectedLead}
        onOpenChange={(open) => !open && setSelectedLead(null)}
        onStatusChange={(lead, status) => {
          setSelectedLead(null);
          handleStatusChange(lead, status);
        }}
      />

      {/* Convert to client */}
      <ConvertLeadModal
        lead={convertLead}
        open={convertOpen}
        onOpenChange={(open) => {
          setConvertOpen(open);
          if (!open) setConvertLead(null);
        }}
      />

      {/* Lost reason */}
      <LostReasonModal
        lead={lostLead}
        open={lostOpen}
        onOpenChange={(open) => {
          setLostOpen(open);
          if (!open) setLostLead(null);
        }}
        onConfirm={handleLostConfirm}
        isPending={updateStatus.isPending}
      />

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
