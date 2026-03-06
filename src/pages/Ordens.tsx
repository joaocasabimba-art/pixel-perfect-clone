import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useServices } from "@/hooks/useServices";
import { EmptyState } from "@/components/EmptyState";
import { formatDateBR, formatCurrency } from "@/lib/business";

const statusBadge: Record<string, string> = {
  scheduled: "bg-primary-light text-primary-mid",
  in_progress: "bg-warning-light text-warning",
  completed: "bg-success-light text-success",
  cancelled: "bg-muted text-muted-foreground",
};

const statusLabel: Record<string, string> = {
  scheduled: "Aberta",
  in_progress: "Em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export default function Ordens() {
  const { data: orders, isLoading } = useServices();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Ordens de Serviço</h1>

      {(!orders || orders.length === 0) ? (
        <EmptyState
          icon="📋"
          title="Nenhuma ordem de serviço"
          description="Ordens são criadas ao agendar serviços a partir de leads fechados"
        />
      ) : (
        <div className="space-y-3">
          {orders.map((os: any, index: number) => (
            <Card key={os.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-primary-mid">OS #{String(index + 1).padStart(4, "0")}</span>
                      <Badge className={`${statusBadge[os.status] || ""} border-0 text-xs`}>{statusLabel[os.status] || os.status}</Badge>
                    </div>
                    <p className="font-semibold text-foreground">{os.client?.name || "—"}</p>
                    <p className="text-sm text-muted-foreground">{os.service_type}{os.tech?.full_name ? ` · Téc: ${os.tech.full_name}` : ""}</p>
                    {os.scheduled_date && <p className="text-xs text-muted-foreground">{formatDateBR(os.scheduled_date)}</p>}
                  </div>
                  {os.value > 0 && <span className="text-sm font-semibold text-foreground">{formatCurrency(Number(os.value))}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
