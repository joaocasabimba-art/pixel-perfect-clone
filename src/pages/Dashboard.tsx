import { useNavigate } from "react-router-dom";
import {
  Inbox, Calendar, DollarSign, RotateCcw, AlertCircle, Clock, FileText, CreditCard,
  MessageCircle, Pen, ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, whatsappLink } from "@/lib/business";
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Dashboard() {
  const companyId = useCompanyId();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isTechnician = profile?.role === "technician";
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(today), "yyyy-MM-dd");
  const twoDaysAgo = subDays(today, 2).toISOString();
  const sevenDaysAgo = subDays(today, 7).toISOString();
  const sevenDaysAhead = format(new Date(Date.now() + 7 * 86400000), "yyyy-MM-dd");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [
        leadsToday,
        servicesToday,
        monthRevenue,
        recurrencesWeek,
        urgentLeads,
        draftReports,
        pendingPayments,
        todayServices,
      ] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", todayStr + "T00:00:00"),
        supabase.from("services").select("id", { count: "exact", head: true }).eq("scheduled_date", todayStr),
        supabase.from("services").select("value").gte("scheduled_date", monthStart).lte("scheduled_date", monthEnd).in("status", ["completed", "done"]),
        supabase.from("recurrences").select("id", { count: "exact", head: true }).lte("next_service_date", sevenDaysAhead),
        supabase.from("leads").select("id, name, phone, service_type").eq("status", "new").lt("created_at", twoDaysAgo),
        supabase.from("reports").select("id, client:clients(name)").eq("status", "draft"),
        supabase.from("services").select("id, value, client:clients(name, phone)").eq("status", "done").eq("payment_status", "pending").lt("completed_at", sevenDaysAgo),
        supabase.from("services").select("*, client:clients(name), tech:profiles!services_assigned_to_fkey(full_name)").eq("scheduled_date", todayStr).order("start_time"),
      ]);

      const totalRevenue = (monthRevenue.data ?? []).reduce((sum: number, s: any) => sum + (Number(s.value) || 0), 0);
      const pendingTotal = (pendingPayments.data ?? []).reduce((sum: number, s: any) => sum + (Number(s.value) || 0), 0);

      return {
        leadsToday: leadsToday.count ?? 0,
        servicesToday: servicesToday.count ?? 0,
        totalRevenue,
        recurrencesWeek: recurrencesWeek.count ?? 0,
        urgentLeads: urgentLeads.data ?? [],
        draftReports: draftReports.data ?? [],
        pendingPayments: pendingPayments.data ?? [],
        pendingTotal,
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
    { icon: Inbox, label: "Leads hoje", value: String(stats?.leadsToday ?? 0), sub: `${stats?.urgentLeads.length ?? 0} sem resposta`, color: "text-primary", bg: "bg-primary/10" },
    { icon: Calendar, label: "Serviços hoje", value: String(stats?.servicesToday ?? 0), sub: "agendados", color: "text-green-600", bg: "bg-green-100" },
    ...(!isTechnician ? [
      { icon: DollarSign, label: "Faturamento mês", value: formatCurrency(stats?.totalRevenue ?? 0), sub: "serviços concluídos", color: "text-amber-600", bg: "bg-amber-100" },
      { icon: CreditCard, label: "A receber", value: formatCurrency(stats?.pendingTotal ?? 0), sub: `${stats?.pendingPayments.length ?? 0} pendentes`, color: "text-red-600", bg: "bg-red-100" },
    ] : [
      { icon: RotateCcw, label: "Recorrências", value: String(stats?.recurrencesWeek ?? 0), sub: "vencendo esta semana", color: "text-amber-600", bg: "bg-amber-100" },
    ]),
  ];

  // Build urgent actions
  const urgentActions: { icon: any; text: string; level: string; action: () => void; btnLabel: string }[] = [];

  (stats?.urgentLeads ?? []).forEach((l: any) => {
    urgentActions.push({
      icon: AlertCircle,
      text: `Lead "${l.name}" sem resposta há +48h`,
      level: "danger",
      btnLabel: "Follow-up",
      action: () => {
        if (l.phone) window.open(whatsappLink(l.phone, `Olá ${l.name}! Gostaria de retomar nosso contato sobre ${l.service_type || "nossos serviços"}. 😊`), "_blank");
        else navigate("/leads");
      },
    });
  });

  (stats?.draftReports ?? []).forEach((r: any) => {
    urgentActions.push({
      icon: FileText,
      text: `Laudo de "${(r.client as any)?.name || "—"}" em rascunho`,
      level: "warning",
      btnLabel: "Assinar",
      action: () => navigate(`/laudos/${r.id}`),
    });
  });

  if (!isTechnician) {
    (stats?.pendingPayments ?? []).forEach((s: any) => {
      urgentActions.push({
        icon: CreditCard,
        text: `OS "${(s.client as any)?.name || "—"}" sem pagamento há +7d`,
        level: "warning",
        btnLabel: "Cobrar",
        action: () => {
          const phone = (s.client as any)?.phone;
          if (phone) window.open(whatsappLink(phone, `Olá! Passando sobre o pagamento pendente de ${formatCurrency(Number(s.value) || 0)}. Podemos resolver? 😊`), "_blank");
        },
      });
    });
  }

  if (stats?.recurrencesWeek) {
    urgentActions.push({
      icon: RotateCcw,
      text: `${stats.recurrencesWeek} recorrências vencem esta semana`,
      level: "warning",
      btnLabel: "Ver",
      action: () => navigate("/recorrencias"),
    });
  }

  const levelColors: Record<string, string> = {
    danger: "bg-red-100 text-red-700",
    warning: "bg-amber-100 text-amber-700",
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
        {/* Urgent Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              Ações Urgentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {urgentActions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma ação urgente 🎉</p>
            ) : (
              urgentActions.slice(0, 6).map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <Badge variant="outline" className={`${levelColors[item.level]} border-0 px-2 py-1`}>
                    <item.icon className="w-3.5 h-3.5" />
                  </Badge>
                  <span className="text-sm text-foreground flex-1">{item.text}</span>
                  <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={item.action}>
                    {item.btnLabel} <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Today's Agenda */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Agenda do Dia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(stats?.todayAgenda?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum serviço agendado para hoje.</p>
            ) : (
              stats?.todayAgenda.map((a: any) => (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer" onClick={() => navigate("/agenda")}>
                  <span className="text-sm font-mono font-semibold text-primary min-w-[45px]">
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
