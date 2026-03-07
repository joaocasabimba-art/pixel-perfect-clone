import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { EmptyState } from "@/components/EmptyState";
import { formatDateBR } from "@/lib/business";
import { useNavigate } from "react-router-dom";

const statusBadge: Record<string, string> = {
  draft: "bg-warning-light text-warning",
  signed: "bg-success-light text-success",
  sent: "bg-primary-light text-primary-mid",
};
const statusLabel: Record<string, string> = { draft: "Rascunho", signed: "Assinado", sent: "Enviado" };

export default function Laudos() {
  const companyId = useCompanyId();
  const navigate = useNavigate();

  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*, client:clients(name), tech:profiles!reports_tech_id_fkey(full_name), service:services(service_type)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Laudos</h1>

      {(!reports || reports.length === 0) ? (
        <EmptyState
          icon="📄"
          title="Nenhum laudo cadastrado"
          description="Laudos são gerados a partir de ordens de serviço concluídas"
        />
      ) : (
        <div className="space-y-3">
          {reports.map((l: any) => (
            <Card key={l.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/laudos/${l.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary-mid" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">{l.client?.name || "—"}</p>
                      <p className="text-sm text-muted-foreground">{l.service?.service_type || "—"} · {formatDateBR(l.created_at)}</p>
                      {l.tech?.full_name && <p className="text-xs text-muted-foreground">Téc: {l.tech.full_name}</p>}
                      {l.validity_date && <p className="text-xs text-muted-foreground">Validade: {formatDateBR(l.validity_date)}</p>}
                    </div>
                  </div>
                  <Badge className={`${statusBadge[l.status] || ""} border-0 text-xs`}>{statusLabel[l.status] || l.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
