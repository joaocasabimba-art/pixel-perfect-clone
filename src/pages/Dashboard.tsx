import {
  Inbox,
  Calendar,
  DollarSign,
  RotateCcw,
  AlertCircle,
  Clock,
  FileText,
  ClipboardList,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Dashboard() {
  const companyId = useCompanyId();
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(today), "yyyy-MM-dd");
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const twoDaysAgo = subDays(today, 2).toISOString();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [leadsToday, servicestoday, monthRevenue, recurrencesWeek, unansweredLeads, draftReports, pendingReportServices, todayServices] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", todayStr + "T00:00:00"),
        supabase.from("services").select("id", { count: "exact", head: true }).eq("scheduled_date", todayStr),
        supabase.from("services").select("value").gte("scheduled_date", monthStart).lte("scheduled_date", monthEnd).eq("status", "completed"),
        supabase.from("recurrences").select("id", { count: "exact", head: true }).gte("next_service_date", weekStart).lte("next_service_date", weekEnd),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new").lt("created_at", twoDaysAgo),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("services").select("id", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("services").select("*, client:clients(name), tech:profiles!services_assigned_to_fkey(full_name)").eq("scheduled_date", todayStr).order("start_time"),
      ]);

      const totalRevenue = (monthRevenue.data ?? []).reduce((sum: number, s: any) => sum + (Number(s.value) || 0), 0);

      return {
        leadsToday: leadsToday.count ?? 0,
        servicesToday: servicestoday.count ?? 0,
        totalRevenue,
        recurrencesWeek: recurrencesWeek.count ?? 0,
        unansweredLeads: unansweredLeads.count ?? 0,
        draftReports: draftReports.count ?? 0,
        pendingReportServices: pendingReportServices.count ?? 0,
        todayAgenda: todayServices.data ?? [],
      };
    },
    enabled: !!companyId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const metricCards = [
    { icon: Inbox, label: "Leads hoje", value: String(stats?.leadsToday ?? 0), sub: `${stats?.unansweredLeads ?? 0} sem resposta`, color: "text-primary-mid", bg: "bg-primary-light" },
    { icon: Calendar, label: "Serviços hoje", value: String(stats?.servicesToday ?? 0), sub: "agendados", color: "text-success", bg: "bg-success-light" },
    { icon: DollarSign, label: "Faturamento mês", value: `R$ ${(stats?.totalRevenue ?? 0).toLocaleString("pt-BR")}`, sub: "serviços concluídos", color: "text-warning", bg: "bg-warning-light" },
    { icon: RotateCcw, label: "Recorrências", value: String(stats?.recurrencesWeek ?? 0), sub: "vencendo esta semana", color: "text-danger", bg: "bg-danger-light" },
  ];

  const urgentItems = [
    ...(stats?.unansweredLeads ? [{ icon: AlertCircle, text: `${stats.unansweredLeads} leads sem resposta há mais de 48h`, level: "danger" as const }] : []),
    ...(stats?.recurrencesWeek ? [{ icon: RotateCcw, text: `${stats.recurrencesWeek} recorrências vencem esta semana`, level: "warning" as const }] : []),
    ...(stats?.draftReports ? [{ icon: FileText, text: `${stats.draftReports} laudos em rascunho`, level: "warning" as const }] : []),
  ];

  const levelColors = {
    danger: "bg-danger-light text-danger",
    warning: "bg-warning-light text-warning",
    info: "bg-primary-light text-primary-mid",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((m) => (
          <Card key={m.label} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg ${m.bg} flex items-center justify-center`}>
                  <m.icon className={`w-5 h-5 ${m.color}`} />
                </div>
                <span className="text-sm text-muted-foreground font-medium">{m.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{m.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{m.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-danger" />
              Ação Urgente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {urgentItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma ação urgente 🎉</p>
            ) : (
              urgentItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                  <Badge variant="outline" className={`${levelColors[item.level]} border-0 px-2 py-1`}>
                    <item.icon className="w-3.5 h-3.5" />
                  </Badge>
                  <span className="text-sm text-foreground">{item.text}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-mid" />
              Agenda do Dia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(stats?.todayAgenda?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum serviço agendado para hoje.</p>
            ) : (
              stats?.todayAgenda.map((a: any) => (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                  <span className="text-sm font-mono font-semibold text-primary-mid min-w-[45px]">
                    {a.start_time?.slice(0, 5) || "--:--"}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.client?.name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{a.service_type}{a.address ? ` · ${a.address}` : ""}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
