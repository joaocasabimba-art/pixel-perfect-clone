import { RotateCcw, MessageCircle, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";

export default function Recorrencias() {
  const companyId = useCompanyId();
  const today = new Date();
  const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const fifteenDays = format(addDays(today, 15), "yyyy-MM-dd");
  const thirtyDays = format(addDays(today, 30), "yyyy-MM-dd");
  const todayStr = format(today, "yyyy-MM-dd");

  const { data, isLoading } = useQuery({
    queryKey: ["recurrences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurrences")
        .select("*, client:clients(name)")
        .order("next_service_date");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  const recs = data ?? [];
  const overdue = recs.filter((r: any) => r.next_service_date && r.next_service_date < todayStr);
  const within7 = recs.filter((r: any) => r.next_service_date >= todayStr && r.next_service_date <= weekEnd);
  const within15 = recs.filter((r: any) => r.next_service_date >= todayStr && r.next_service_date <= fifteenDays);
  const within30 = recs.filter((r: any) => r.next_service_date >= todayStr && r.next_service_date <= thirtyDays);

  const summaryCards = [
    { label: "Vencidos", count: overdue.length, class: "bg-danger-light text-danger" },
    { label: "7 dias", count: within7.length, class: "bg-warning-light text-warning" },
    { label: "15 dias", count: within15.length, class: "bg-primary-light text-primary-mid" },
    { label: "30 dias", count: within30.length, class: "bg-muted text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <RotateCcw className="w-6 h-6" />
        Recorrências
      </h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((s) => (
          <Card key={s.label} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <Badge className={`${s.class} border-0 text-xs mb-2`}>{s.label}</Badge>
              <p className="text-2xl font-bold text-foreground">{s.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {recs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhuma recorrência cadastrada.</div>
      ) : (
        <div className="space-y-3">
          {recs.map((r: any) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{r.client?.name || "—"}</p>
                    <p className="text-sm text-muted-foreground">{r.service_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.last_service_date ? `Último: ${format(new Date(r.last_service_date), "dd/MM/yyyy")}` : ""}
                      {r.next_service_date ? ` · Próximo: ${format(new Date(r.next_service_date), "dd/MM/yyyy")}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Contatar</span>
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Agendar</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
