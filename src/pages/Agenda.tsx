import { Clock, MapPin, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useWeekServices } from "@/hooks/useServices";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EmptyState } from "@/components/EmptyState";

const serviceColors: Record<string, string> = {
  "Dedetização": "border-l-primary-mid",
  "Caixa d'água": "border-l-success",
  "Desratização": "border-l-warning",
};

export default function Agenda() {
  const today = new Date();
  const { data: services, isLoading } = useWeekServices();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  const statusLabel: Record<string, { label: string; class: string }> = {
    scheduled: { label: "Agendado", class: "bg-primary-light text-primary-mid" },
    in_progress: { label: "Em andamento", class: "bg-warning-light text-warning" },
    completed: { label: "Concluído", class: "bg-success-light text-success" },
    cancelled: { label: "Cancelado", class: "bg-muted text-muted-foreground" },
  };

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
        />
      ) : (
        <div className="space-y-3">
          {services.map((item: any) => {
            const st = statusLabel[item.status] || statusLabel.scheduled;
            return (
              <div
                key={item.id}
                className={`bg-card border border-border rounded-lg p-4 border-l-4 ${serviceColors[item.service_type] || "border-l-muted"} hover:shadow-md transition-shadow cursor-pointer`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    {item.start_time && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary-mid" />
                        <span className="text-sm font-semibold text-foreground">
                          {item.start_time?.slice(0, 5)}{item.end_time ? ` – ${item.end_time.slice(0, 5)}` : ""}
                        </span>
                      </div>
                    )}
                    <p className="font-semibold text-foreground">{item.client?.name || "—"}</p>
                    <p className="text-sm text-muted-foreground">{item.service_type}</p>
                    {item.address && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />{item.address}
                      </div>
                    )}
                    {item.tech?.full_name && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />Téc: {item.tech.full_name}
                      </div>
                    )}
                  </div>
                  <Badge className={`${st.class} border-0 text-xs`}>{st.label}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
