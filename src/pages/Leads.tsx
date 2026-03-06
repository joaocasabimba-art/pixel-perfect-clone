import { Plus, Phone, MapPin, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeads, useCreateLead, useUpdateLeadStatus } from "@/hooks/useLeads";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { formatPhone } from "@/lib/business";
import { EmptyState } from "@/components/EmptyState";
import type { Lead, LeadStatus } from "@/lib/types";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";

const columns: { key: LeadStatus; label: string; badgeClass: string }[] = [
  { key: "new", label: "Novo", badgeClass: "bg-primary-light text-primary-mid" },
  { key: "quoted", label: "Orçado", badgeClass: "bg-warning-light text-warning" },
  { key: "negotiating", label: "Negociando", badgeClass: "bg-accent text-accent-foreground" },
  { key: "won", label: "Fechado", badgeClass: "bg-success-light text-success" },
  { key: "lost", label: "Perdido", badgeClass: "bg-danger-light text-danger" },
];

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-w-[260px] flex-shrink-0 transition-colors rounded-lg ${isOver ? "bg-muted/50" : ""}`}
    >
      {children}
    </div>
  );
}

function LeadCard({ lead, onClick, isDragging }: { lead: Lead; onClick?: () => void; isDragging?: boolean }) {
  return (
    <div
      onClick={onClick}
      className={`bg-card border border-border rounded-lg p-3 space-y-2 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing ${isDragging ? "opacity-50 shadow-lg ring-2 ring-primary-mid" : ""}`}
    >
      <div className="flex items-start justify-between">
        <p className="font-semibold text-sm text-foreground">{lead.name}</p>
        <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>
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
  const { data: leads, isLoading } = useLeads();
  const createLead = useCreateLead();
  const updateStatus = useUpdateLeadStatus();
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [origin, setOrigin] = useState("WhatsApp");
  const [serviceType, setServiceType] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const leadsByStatus = (status: LeadStatus) => leads?.filter((l) => l.status === status) ?? [];
  const activeLead = activeId ? leads?.find((l) => l.id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const newStatus = over.id as LeadStatus;
    const lead = leads?.find((l) => l.id === active.id);
    if (lead && lead.status !== newStatus) {
      updateStatus.mutate({ id: lead.id, status: newStatus });
    }
  }

  function handleSubmit() {
    createLead.mutate(
      { name, phone: phone || undefined, origin, service_type: serviceType || undefined, location: location || undefined, notes: notes || undefined },
      {
        onSuccess: () => {
          setNewLeadOpen(false);
          setName(""); setPhone(""); setOrigin("WhatsApp"); setServiceType(""); setLocation(""); setNotes("");
        },
      }
    );
  }

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
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map((col) => {
              const colLeads = leadsByStatus(col.key);
              return (
                <DroppableColumn key={col.key} id={col.key}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge className={`${col.badgeClass} border-0 text-xs font-semibold`}>{col.label}</Badge>
                      <span className="text-xs text-muted-foreground font-medium">{colLeads.length}</span>
                    </div>
                  </div>
                  <div className="space-y-3 min-h-[100px]">
                    {colLeads.map((lead) => (
                      <div
                        key={lead.id}
                        data-id={lead.id}
                        draggable
                        onDragStart={() => setActiveId(lead.id)}
                      >
                        <LeadCard
                          lead={lead}
                          onClick={() => setSelectedLead(lead)}
                          isDragging={activeId === lead.id}
                        />
                      </div>
                    ))}
                    {colLeads.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                        Arraste leads aqui
                      </div>
                    )}
                  </div>
                </DroppableColumn>
              );
            })}
          </div>

          <DragOverlay>
            {activeLead ? <LeadCard lead={activeLead} /> : null}
          </DragOverlay>
        </DndContext>
      )}

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
              <Input
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
              />
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
              onClick={handleSubmit}
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
