import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { format } from "date-fns";

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
  const companyId = useCompanyId();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*, client:clients(name), tech:profiles!services_assigned_to_fkey(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

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
        <div className="text-center py-12 text-muted-foreground">Nenhuma ordem de serviço ainda.</div>
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
                    {os.scheduled_date && <p className="text-xs text-muted-foreground">{format(new Date(os.scheduled_date), "dd/MM/yyyy")}</p>}
                  </div>
                  {os.value > 0 && <span className="text-sm font-semibold text-foreground">R$ {Number(os.value).toFixed(2).replace(".", ",")}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
