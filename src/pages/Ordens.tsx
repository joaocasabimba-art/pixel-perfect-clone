import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useServices } from "@/hooks/useServices";
import { useGenerateReport } from "@/hooks/useGenerateReport";
import { EmptyState } from "@/components/EmptyState";
import { formatDateBR, formatCurrency } from "@/lib/business";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { FileText, Loader2, Eye } from "lucide-react";

const statusBadge: Record<string, string> = {
  scheduled: "bg-primary-light text-primary-mid",
  in_progress: "bg-warning-light text-warning",
  completed: "bg-success-light text-success",
  done: "bg-success-light text-success",
  cancelled: "bg-muted text-muted-foreground",
};

const statusLabel: Record<string, string> = {
  scheduled: "Aberta",
  in_progress: "Em andamento",
  completed: "Concluída",
  done: "Concluída",
  cancelled: "Cancelada",
};

export default function Ordens() {
  const { data: orders, isLoading } = useServices();
  const navigate = useNavigate();
  const companyId = useCompanyId();
  const { mutate: generateReport, isPending: isGenerating, variables: generatingId } = useGenerateReport();

  // Fetch existing reports to know which services already have one
  const { data: reports } = useQuery({
    queryKey: ["reports-by-service"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, service_id");
      if (error) throw error;
      return data as { id: string; service_id: string | null }[];
    },
    enabled: !!companyId,
  });

  const reportByServiceId = new Map(
    (reports ?? []).filter((r) => r.service_id).map((r) => [r.service_id!, r.id])
  );

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
          {orders.map((os: any, index: number) => {
            const isDone = os.status === "done" || os.status === "completed";
            const existingReportId = reportByServiceId.get(os.id);
            const isThisGenerating = isGenerating && generatingId === os.id;

            return (
              <Card key={os.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-primary-mid">
                          OS #{String(index + 1).padStart(4, "0")}
                        </span>
                        <Badge className={`${statusBadge[os.status] || ""} border-0 text-xs`}>
                          {statusLabel[os.status] || os.status}
                        </Badge>
                      </div>
                      <p className="font-semibold text-foreground">{os.client?.name || "—"}</p>
                      <p className="text-sm text-muted-foreground">
                        {os.service_type}
                        {os.tech?.full_name ? ` · Téc: ${os.tech.full_name}` : ""}
                      </p>
                      {os.scheduled_date && (
                        <p className="text-xs text-muted-foreground">{formatDateBR(os.scheduled_date)}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {os.value > 0 && (
                        <span className="text-sm font-semibold text-foreground">
                          {formatCurrency(Number(os.value))}
                        </span>
                      )}
                      {isDone && existingReportId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => navigate(`/laudos/${existingReportId}`)}
                        >
                          <Eye className="w-4 h-4" /> Ver Laudo
                        </Button>
                      )}
                      {isDone && !existingReportId && (
                        <Button
                          size="sm"
                          className="gap-1.5"
                          disabled={isThisGenerating}
                          onClick={() =>
                            generateReport(os.id, {
                              onSuccess: (data) => {
                                if (data?.report_id) navigate(`/laudos/${data.report_id}`);
                              },
                            })
                          }
                        >
                          {isThisGenerating ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> Gerando...
                            </>
                          ) : (
                            <>
                              <FileText className="w-4 h-4" /> Gerar Laudo
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
