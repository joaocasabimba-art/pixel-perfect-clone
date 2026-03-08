import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Clock, MapPin, User, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWeekServices } from "@/hooks/useServices";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EmptyState } from "@/components/EmptyState";
import { NewServiceModal } from "@/components/agenda/NewServiceModal";

const serviceColors: Record<string, string> = {
  "Dedetização": "border-l-primary-mid",
  "Caixa d'água": "border-l-success",
  "Limpeza de caixa d'água": "border-l-success",
  "Desratização": "border-l-warning",
};

const statusLabel: Record<string, { label: string; class: string }> = {
  scheduled: { label: "Agendado", class: "bg-primary-light text-primary-mid" },
  in_progress: { label: "Em andamento", class: "bg-warning-light text-warning" },
  completed: { label: "Concluído", class: "bg-success-light text-success" },
  cancelled: { label: "Cancelado", class: "bg-muted text-muted-foreground" },
};

export default function Agenda() {
  const today = new Date();
  const { data: services, isLoading } = useWeekServices();
  const [searchParams, setSearchParams] = useSearchParams();
  const [newServiceOpen, setNewServiceOpen] = useState(false);

  const defaultClientId = searchParams.get("client_id") || undefined;
  const defaultLeadId = searchParams.get("lead_id") || undefined;

  // Auto-open modal if coming from lead conversion
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setNewServiceOpen(true);
      // Clear the param
      searchParams.delete("new");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
        <Badge className="bg-primary-light text-primary-mid border-0">
          Hoje · {format(today, "d 'de' MMMM", { locale: ptBR })}
        </Badge>
      </div>

      {(!services || services.length === 0) ? (
        <EmptyState
          icon="📅"
          title="Sem serviços esta semana"
          description="Agende um serviço a partir de um lead fechado"
          action={{ label: "Novo Serviço", onClick: () => setNewServiceOpen(true) }}
        />
      ) : (
        <div className="space-y-3">
          {services.map((item: any) => {
            const st = statusLabel[item.status] || statusLabel.scheduled;
            return (
              <div
                key={item.id}
                className={`bg-card border border-border rounded-lg p-4 border-l-4 ${
                  serviceColors[item.service_type] || "border-l-muted"
                } hover:shadow-md transition-shadow cursor-pointer`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    {item.start_time && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary-mid" />
                        <span className="text-sm font-semibold text-foreground">
                          {item.start_time?.slice(0, 5)}
                          {item.end_time ? ` – ${item.end_time.slice(0, 5)}` : ""}
                        </span>
                      </div>
                    )}
                    <p className="font-semibold text-foreground">
                      {item.client?.name || "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">{item.service_type}</p>
                    {item.address && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {item.address}
                      </div>
                    )}
                    {item.tech?.full_name && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        Téc: {item.tech.full_name}
                      </div>
                    )}
                  </div>
                  <Badge className={`${st.class} border-0 text-xs`}>
                    {st.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NewServiceModal
        open={newServiceOpen}
        onOpenChange={setNewServiceOpen}
        defaultClientId={defaultClientId}
        defaultLeadId={defaultLeadId}
      />

      {/* FAB */}
      <Button
        onClick={() => setNewServiceOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-6 w-14 h-14 rounded-full shadow-lg bg-primary-mid hover:bg-primary-mid/90 text-primary-mid-foreground z-30"
        size="icon"
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  );
}
