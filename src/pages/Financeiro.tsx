import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp, TrendingDown, DollarSign, AlertCircle,
  Download, MessageCircle, CheckCircle, ArrowUpRight,
  ArrowDownRight, BarChart3, Wallet, Clock,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDateBR, whatsappLink } from "@/lib/business";
import { toast } from "sonner";
import { startOfMonth, format, subDays, subMonths } from "date-fns";

/* ─────────────── types ─────────────── */
interface ServiceRow {
  id: string;
  type: string;
  price: number | null;
  cost: number | null;
  status: string;
  payment_status: string;
  payment_method: string | null;
  completed_at: string | null;
  installments: any;
  clients: { name: string; phone: string | null } | null;
  profiles: { full_name: string } | null;
}

type Period = "7d" | "30d" | "90d" | "12m" | "custom";
type Tab = "overview" | "revenue" | "delinquency" | "margin";

/* ─────────────── helpers ─────────────── */
function periodToDates(period: Period): { from: Date; to: Date } {
  const to = new Date();
  switch (period) {
    case "7d": return { from: subDays(to, 7), to };
    case "30d": return { from: subDays(to, 30), to };
    case "90d": return { from: subDays(to, 90), to };
    case "12m": return { from: subMonths(to, 12), to };
    default: return { from: startOfMonth(to), to };
  }
}

function groupByPeriod(services: ServiceRow[], period: Period) {
  const groups: Record<string, { label: string; revenue: number; received: number; cost: number }> = {};
  services.forEach((s) => {
    if (!s.completed_at) return;
    const date = new Date(s.completed_at);
    const key = period === "12m"
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(Math.ceil(date.getDate() / 7)).padStart(2, "0")}`;
    if (!groups[key]) {
      groups[key] = {
        label: period === "12m"
          ? date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
          : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        revenue: 0,
        received: 0,
        cost: 0,
      };
    }
    groups[key].revenue += s.price ?? 0;
    groups[key].received += s.payment_status === "paid" ? (s.price ?? 0) : 0;
    groups[key].cost += s.cost ?? 0;
  });
  return Object.values(groups);
}

function exportCSV(services: ServiceRow[]) {
  const rows = [
    ["Data", "Cliente", "Serviço", "Técnico", "Valor", "Custo", "Margem", "Pagamento"],
    ...services.map((s) => [
      s.completed_at ? formatDateBR(s.completed_at) : "",
      s.clients?.name ?? "",
      s.type,
      s.profiles?.full_name ?? "",
      s.price ?? 0,
      s.cost ?? 0,
      (s.price ?? 0) - (s.cost ?? 0),
      s.payment_status,
    ]),
  ];
  const csv = rows.map((r) => r.join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `financeiro-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════ */
export default function Financeiro() {
  const companyId = useCompanyId();
  const { profile } = useAuth();
  const isOwner = profile?.role === "owner" || profile?.role === "admin";

  const [period, setPeriod] = useState<Period>("30d");
  const [customRange, setCustomRange] = useState({
    from: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    to: format(new Date(), "yyyy-MM-dd"),
  });
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [technicianFilter, setTechnicianFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const { from, to } = period === "custom"
    ? { from: new Date(customRange.from), to: new Date(customRange.to) }
    : periodToDates(period);

  /* ── service types for filter ── */
  const { data: services = [], isLoading } = useQuery({
    queryKey: ["financeiro-services", companyId, from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, type, price, cost, status, payment_status, payment_method, completed_at, installments, clients(name, phone), profiles!services_assigned_to_fkey(full_name)")
        .eq("company_id", companyId!)
        .eq("status", "completed")
        .gte("completed_at", from.toISOString())
        .lte("completed_at", to.toISOString())
        .order("completed_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as any as ServiceRow[];
    },
    enabled: !!companyId,
  });

  const { data: allUnpaid = [] } = useQuery({
    queryKey: ["financeiro-unpaid", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("id, type, price, cost, completed_at, payment_status, installments, clients(name, phone), profiles!services_assigned_to_fkey(full_name)")
        .eq("company_id", companyId!)
        .eq("status", "completed")
        .neq("payment_status", "paid")
        .order("completed_at", { ascending: true })
        .limit(200);
      return (data ?? []) as any as ServiceRow[];
    },
    enabled: !!companyId,
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ["technicians-list", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name").eq("company_id", companyId!);
      return data ?? [];
    },
    enabled: !!companyId,
  });

  /* ── apply filters ── */
  const filtered = useMemo(() => {
    let s = services;
    if (serviceTypeFilter !== "all") s = s.filter((r) => r.type === serviceTypeFilter);
    if (technicianFilter !== "all") s = s.filter((r) => (r.profiles as any)?.id === technicianFilter);
    return s;
  }, [services, serviceTypeFilter, technicianFilter]);

  const serviceTypes = useMemo(() => [...new Set(services.map((s) => s.type))], [services]);

  /* ── metrics ── */
  const metrics = useMemo(() => {
    const revenue = filtered.reduce((s, r) => s + (r.price ?? 0), 0);
    const received = filtered.filter((s) => s.payment_status === "paid").reduce((s, r) => s + (r.price ?? 0), 0);
    const pending = filtered.filter((s) => s.payment_status !== "paid").reduce((s, r) => s + (r.price ?? 0), 0);
    const cost = filtered.reduce((s, r) => s + (r.cost ?? 0), 0);
    const margin = revenue - cost;
    const marginPct = revenue > 0 ? ((margin / revenue) * 100).toFixed(1) : "0";
    const overdue = allUnpaid.filter((s) => {
      if (!s.completed_at) return false;
      return Date.now() - new Date(s.completed_at).getTime() > 7 * 86400000;
    }).reduce((s, r) => s + (r.price ?? 0), 0);
    return { revenue, received, pending, cost, margin, marginPct, overdue, count: filtered.length };
  }, [filtered, allUnpaid]);

  const PERIOD_LABELS: Record<Period, string> = {
    "7d": "7 dias", "30d": "30 dias", "90d": "90 dias", "12m": "12 meses", custom: "Custom",
  };

  const TABS = [
    { id: "overview", label: "Visão Geral", icon: BarChart3 },
    { id: "revenue", label: "Receita", icon: DollarSign },
    { id: "delinquency", label: "Inadimplência", icon: AlertCircle },
    { id: "margin", label: "Margem", icon: TrendingUp },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Wallet className="w-6 h-6" />
          Financeiro
        </h1>
        <Button variant="outline" size="sm" onClick={() => exportCSV(filtered)}>
          <Download className="w-4 h-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex gap-1 flex-wrap">
              {(["7d", "30d", "90d", "12m", "custom"] as Period[]).map((p) => (
                <Button
                  key={p}
                  variant={period === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPeriod(p)}
                >
                  {PERIOD_LABELS[p]}
                </Button>
              ))}
            </div>
            {period === "custom" && (
              <div className="flex items-center gap-2">
                <Input type="date" value={customRange.from} className="w-36 text-sm" onChange={(e) => setCustomRange((c) => ({ ...c, from: e.target.value }))} />
                <span className="text-muted-foreground text-sm">até</span>
                <Input type="date" value={customRange.to} className="w-36 text-sm" onChange={(e) => setCustomRange((c) => ({ ...c, to: e.target.value }))} />
              </div>
            )}
            <div className="flex gap-2 ml-auto">
              <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                <SelectTrigger className="w-44 text-sm"><SelectValue placeholder="Serviço: Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os serviços</SelectItem>
                  {serviceTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
                <SelectTrigger className="w-40 text-sm"><SelectValue placeholder="Técnico: Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os técnicos</SelectItem>
                  {(technicians as any[]).map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          {activeTab === "overview" && (
            <TabOverview services={filtered} metrics={metrics} period={period} isOwner={isOwner} />
          )}
          {activeTab === "revenue" && (
            <TabRevenue services={filtered} companyId={companyId!} metrics={metrics} isOwner={isOwner} />
          )}
          {activeTab === "delinquency" && (
            <TabDelinquency
              unpaid={allUnpaid}
              metrics={metrics}
              companyId={companyId!}
            />
          )}
          {activeTab === "margin" && isOwner && (
            <TabMargin services={filtered} metrics={metrics} />
          )}
          {activeTab === "margin" && !isOwner && (
            <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">Sem permissão para ver margens.</CardContent></Card>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   TAB VISÃO GERAL
═══════════════════════════════════════ */
function TabOverview({ services, metrics, period, isOwner }: {
  services: ServiceRow[];
  metrics: ReturnType<typeof buildMetrics>;
  period: Period;
  isOwner: boolean;
}) {
  const chartData = useMemo(() => groupByPeriod(services, period), [services, period]);

  const byType = useMemo(() => {
    const acc: Record<string, { type: string; revenue: number; count: number }> = {};
    services.forEach((s) => {
      if (!acc[s.type]) acc[s.type] = { type: s.type, revenue: 0, count: 0 };
      acc[s.type].revenue += s.price ?? 0;
      acc[s.type].count++;
    });
    return Object.values(acc).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [services]);

  const receivedPct = metrics.revenue > 0
    ? ((metrics.received / metrics.revenue) * 100).toFixed(0)
    : "0";

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Faturamento"
          value={formatCurrency(metrics.revenue)}
          sub={`${metrics.count} OS no período`}
          color="blue"
          icon={DollarSign}
        />
        <MetricCard
          title="Recebido"
          value={formatCurrency(metrics.received)}
          sub={`${receivedPct}% do faturado`}
          color="green"
          icon={CheckCircle}
        />
        <MetricCard
          title="A receber"
          value={formatCurrency(metrics.pending)}
          sub={`${allUnpaidCount(services)} OS pendentes`}
          color="amber"
          icon={Clock}
        />
        {isOwner && (
          <MetricCard
            title="Margem bruta"
            value={`${metrics.marginPct}%`}
            sub={formatCurrency(metrics.margin)}
            color="teal"
            icon={TrendingUp}
          />
        )}
      </div>

      {/* Area chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receita por período</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
              Sem dados no período selecionado
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1565C0" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1565C0" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1B7A4A" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1B7A4A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                <Legend />
                <Area type="monotone" dataKey="revenue" name="Faturado" stroke="#1565C0" fill="url(#gRevenue)" strokeWidth={2} />
                <Area type="monotone" dataKey="received" name="Recebido" stroke="#1B7A4A" fill="url(#gReceived)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Ranking */}
      <Card>
        <CardHeader><CardTitle className="text-base">Top serviços por receita</CardTitle></CardHeader>
        <CardContent>
          {byType.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados</p>
          ) : (
            <div className="space-y-3">
              {byType.map((s, i) => {
                const pct = metrics.revenue > 0 ? ((s.revenue / metrics.revenue) * 100) : 0;
                return (
                  <div key={s.type} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                        <span className="font-medium">{s.type}</span>
                        <span className="text-xs text-muted-foreground">{s.count} OS</span>
                      </span>
                      <span className="font-semibold">{formatCurrency(s.revenue)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">{pct.toFixed(0)}% do total</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function allUnpaidCount(services: ServiceRow[]) {
  return services.filter((s) => s.payment_status !== "paid").length;
}

/* ═══════════════════════════════════════
   TAB RECEITA
═══════════════════════════════════════ */
function TabRevenue({ services, companyId, metrics, isOwner }: {
  services: ServiceRow[];
  companyId: string;
  metrics: ReturnType<typeof buildMetrics>;
  isOwner: boolean;
}) {
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<ServiceRow | null>(null);
  const [payMethod, setPayMethod] = useState("pix");
  const [payDate, setPayDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const qc = useQueryClient();

  const markPaid = useMutation({
    mutationFn: async () => {
      await supabase.from("services").update({
        payment_status: "paid",
        payment_method: payMethod,
      } as any).eq("id", payTarget!.id);
    },
    onSuccess: () => {
      toast.success("Pagamento registrado!");
      qc.invalidateQueries({ queryKey: ["financeiro-services"] });
      qc.invalidateQueries({ queryKey: ["financeiro-unpaid"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setPayModalOpen(false);
    },
    onError: () => toast.error("Erro ao registrar pagamento"),
  });

  const monthlyData = useMemo(() => {
    const acc: Record<string, { month: string; gross_revenue: number; received: number }> = {};
    services.forEach((s) => {
      if (!s.completed_at) return;
      const d = new Date(s.completed_at);
      const key = format(d, "yyyy-MM");
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      if (!acc[key]) acc[key] = { month: label, gross_revenue: 0, received: 0 };
      acc[key].gross_revenue += s.price ?? 0;
      if (s.payment_status === "paid") acc[key].received += s.price ?? 0;
    });
    return Object.values(acc);
  }, [services]);

  const payStatusLabel = (s: ServiceRow) => {
    if (s.payment_status === "paid") return { label: "Pago", color: "green" };
    if (Array.isArray(s.installments) && s.installments.length > 0) {
      const paid = s.installments.filter((i: any) => i.paid).length;
      return { label: `${paid}/${s.installments.length} parcelas`, color: "amber" };
    }
    return { label: "Pendente", color: "red" };
  };

  return (
    <div className="space-y-6">
      {/* Bar chart - monthly */}
      <Card>
        <CardHeader><CardTitle className="text-base">Receita mensal</CardTitle></CardHeader>
        <CardContent>
          {monthlyData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                <Legend />
                <Bar dataKey="gross_revenue" name="Faturado" fill="#90CAF9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="received" name="Recebido" fill="#1B7A4A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Detailed table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Detalhamento de OS ({services.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={() => exportCSV(services)}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  {isOwner && <TableHead className="text-right">Custo</TableHead>}
                  {isOwner && <TableHead className="text-right">Margem</TableHead>}
                  <TableHead>Pgto</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Sem OS no período</TableCell></TableRow>
                ) : services.map((s) => {
                  const margin = (s.price ?? 0) - (s.cost ?? 0);
                  const ps = payStatusLabel(s);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">{s.completed_at ? formatDateBR(s.completed_at) : "—"}</TableCell>
                      <TableCell className="font-medium text-sm">{s.clients?.name ?? "—"}</TableCell>
                      <TableCell className="text-sm">{s.type}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{(s.profiles as any)?.full_name ?? "—"}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(s.price ?? 0)}</TableCell>
                      {isOwner && <TableCell className="text-right text-muted-foreground">{formatCurrency(s.cost ?? 0)}</TableCell>}
                      {isOwner && (
                        <TableCell className={`text-right font-medium ${margin >= 0 ? "text-green-700" : "text-destructive"}`}>
                          {formatCurrency(margin)}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            ps.color === "green" ? "border-green-500 text-green-700 bg-green-50" :
                            ps.color === "amber" ? "border-amber-500 text-amber-700 bg-amber-50" :
                            "border-red-500 text-red-700 bg-red-50"
                          }`}
                        >
                          {ps.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {s.payment_status !== "paid" && (
                          <Button
                            size="sm" variant="ghost" className="h-7 px-2 text-xs"
                            onClick={() => { setPayTarget(s); setPayModalOpen(true); }}
                            title="Registrar pagamento"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payment modal */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
            <DialogDescription>
              {payTarget?.clients?.name} — {payTarget?.type} — {formatCurrency(payTarget?.price ?? 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data do pagamento</Label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => markPaid.mutate()} disabled={markPaid.isPending}>
              {markPaid.isPending ? "Salvando..." : "Confirmar pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════
   TAB INADIMPLÊNCIA
═══════════════════════════════════════ */
function TabDelinquency({ unpaid, metrics, companyId }: {
  unpaid: ServiceRow[];
  metrics: ReturnType<typeof buildMetrics>;
  companyId: string;
}) {
  const qc = useQueryClient();
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<ServiceRow | null>(null);
  const [payMethod, setPayMethod] = useState("pix");

  const { data: company } = useQuery({
    queryKey: ["company-settings", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("name, phone").eq("id", companyId).single();
      return data;
    },
    enabled: !!companyId,
  });

  const markPaid = useMutation({
    mutationFn: async () => {
      await supabase.from("services").update({ payment_status: "paid", payment_method: payMethod } as any).eq("id", payTarget!.id);
    },
    onSuccess: () => {
      toast.success("Pagamento registrado!");
      qc.invalidateQueries({ queryKey: ["financeiro-unpaid"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setPayModalOpen(false);
    },
  });

  const overdueItems = unpaid.filter((s) => {
    if (!s.completed_at) return false;
    return Date.now() - new Date(s.completed_at).getTime() > 7 * 86400000;
  });

  const overdueTotal = overdueItems.reduce((s, r) => s + (r.price ?? 0), 0);
  const pendingTotal = unpaid.reduce((s, r) => s + (r.price ?? 0), 0);
  const inadRate = metrics.revenue > 0 ? ((pendingTotal / metrics.revenue) * 100).toFixed(1) : "0";

  const pieData = [
    { name: "Recebido", value: metrics.received, color: "#1B7A4A" },
    { name: "A receber", value: Math.max(0, pendingTotal - overdueTotal), color: "#E65100" },
    { name: "Vencido", value: overdueTotal, color: "#B71C1C" },
  ].filter((d) => d.value > 0);

  function daysOverdue(completedAt: string | null) {
    if (!completedAt) return 0;
    return Math.floor((Date.now() - new Date(completedAt).getTime()) / 86400000);
  }

  function overdueBadge(days: number) {
    if (days <= 7) return { label: "Vencendo", className: "border-amber-500 text-amber-700 bg-amber-50" };
    if (days <= 30) return { label: "Atrasado", className: "border-orange-500 text-orange-700 bg-orange-50" };
    return { label: "Crítico", className: "border-red-500 text-red-700 bg-red-50" };
  }

  function buildMsg(s: ServiceRow) {
    const client = s.clients;
    const co = company;
    if (!client || !co) return "";
    return `Olá, ${client.name}! 👋\n\nPassando para lembrar sobre o pagamento do serviço de *${s.type}* realizado em ${s.completed_at ? formatDateBR(s.completed_at) : ""}.\n\n💰 *Valor:* ${formatCurrency(s.price ?? 0)}\n\nQualquer dúvida estou à disposição! 😊\n\n— ${co.name}${co.phone ? "\n" + co.phone : ""}`;
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Total em aberto" value={formatCurrency(pendingTotal)} sub={`${unpaid.length} OS pendentes`} color="amber" icon={Clock} />
        <MetricCard title="Vencido +7 dias" value={formatCurrency(overdueTotal)} sub={`${overdueItems.length} OS`} color="red" icon={AlertCircle} />
        <MetricCard title="Taxa inadimplência" value={`${inadRate}%`} sub="do faturamento no período" color="red" icon={TrendingDown} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">Distribuição de pagamentos</CardTitle></CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} dataKey="value" paddingAngle={3}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* List of unpaid */}
        <Card>
          <CardHeader><CardTitle className="text-base">OS inadimplentes ({unpaid.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {unpaid.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma OS em aberto! 🎉</p>}
            {unpaid.map((s) => {
              const days = daysOverdue(s.completed_at);
              const badge = overdueBadge(days);
              return (
                <div key={s.id} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-foreground">{s.clients?.name ?? "—"}</p>
                    <Badge variant="outline" className={`text-xs ${badge.className}`}>
                      {days > 0 ? `${badge.label} há ${days}d` : badge.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {s.type} · {s.completed_at ? formatDateBR(s.completed_at) : "—"} · {formatCurrency(s.price ?? 0)}
                  </p>
                  {(s.profiles as any)?.full_name && (
                    <p className="text-xs text-muted-foreground">Técnico: {(s.profiles as any).full_name}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm" variant="outline" className="h-7 text-xs gap-1"
                      onClick={() => {
                        const msg = buildMsg(s);
                        if (s.clients?.phone) window.open(whatsappLink(s.clients.phone, msg), "_blank");
                        else toast.error("Cliente sem telefone cadastrado");
                      }}
                    >
                      <MessageCircle className="w-3 h-3" /> Cobrar WhatsApp
                    </Button>
                    <Button
                      size="sm" variant="outline" className="h-7 text-xs gap-1"
                      onClick={() => { setPayTarget(s); setPayModalOpen(true); }}
                    >
                      <CheckCircle className="w-3 h-3" /> Marcar pago
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Payment modal */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
            <DialogDescription>
              {payTarget?.clients?.name} — {payTarget?.type} — {formatCurrency(payTarget?.price ?? 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Forma de pagamento</Label>
            <Select value={payMethod} onValueChange={setPayMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => markPaid.mutate()} disabled={markPaid.isPending}>
              {markPaid.isPending ? "Salvando..." : "Confirmar pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════
   TAB MARGEM
═══════════════════════════════════════ */
function TabMargin({ services, metrics }: {
  services: ServiceRow[];
  metrics: ReturnType<typeof buildMetrics>;
}) {
  const byType = useMemo(() => {
    const acc: Record<string, { type: string; revenue: number; cost: number; count: number }> = {};
    services.forEach((s) => {
      if (!acc[s.type]) acc[s.type] = { type: s.type, revenue: 0, cost: 0, count: 0 };
      acc[s.type].revenue += s.price ?? 0;
      acc[s.type].cost += s.cost ?? 0;
      acc[s.type].count++;
    });
    return Object.values(acc).map((d) => ({
      ...d,
      margin: d.revenue - d.cost,
      marginPct: d.revenue > 0 ? ((d.revenue - d.cost) / d.revenue) * 100 : 0,
      ticket: d.count > 0 ? d.revenue / d.count : 0,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [services]);

  const byTech = useMemo(() => {
    const acc: Record<string, { tech: string; revenue: number; cost: number; count: number }> = {};
    services.forEach((s) => {
      const k = (s.profiles as any)?.full_name ?? "Sem técnico";
      if (!acc[k]) acc[k] = { tech: k, revenue: 0, cost: 0, count: 0 };
      acc[k].revenue += s.price ?? 0;
      acc[k].cost += s.cost ?? 0;
      acc[k].count++;
    });
    return Object.values(acc).map((d) => ({
      ...d,
      margin: d.revenue - d.cost,
      marginPct: d.revenue > 0 ? ((d.revenue - d.cost) / d.revenue) * 100 : 0,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [services]);

  return (
    <div className="space-y-6">
      {/* Horizontal bar chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">Receita vs Custo vs Margem por serviço</CardTitle></CardHeader>
        <CardContent>
          {byType.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, byType.length * 60)}>
              <BarChart data={byType} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="type" width={130} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                <Legend />
                <Bar dataKey="revenue" name="Receita" fill="#1565C0" radius={[0, 4, 4, 0]} />
                <Bar dataKey="cost" name="Custo" fill="#EF9A9A" radius={[0, 4, 4, 0]} />
                <Bar dataKey="margin" name="Margem" fill="#1B7A4A" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* By service type table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Margem por tipo de serviço</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-center">OS</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">Margem</TableHead>
                <TableHead className="text-right">Ticket</TableHead>
                <TableHead className="w-32">Margem%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byType.map((s) => (
                <TableRow key={s.type}>
                  <TableCell className="font-medium">{s.type}</TableCell>
                  <TableCell className="text-center">{s.count}</TableCell>
                  <TableCell className="text-right">{formatCurrency(s.revenue)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(s.cost)}</TableCell>
                  <TableCell className={`text-right font-medium ${s.margin >= 0 ? "text-green-700" : "text-destructive"}`}>{formatCurrency(s.margin)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(s.ticket)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${s.marginPct >= 60 ? "bg-green-500" : s.marginPct >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${Math.min(100, s.marginPct)}%` }}
                        />
                      </div>
                      <span className="text-xs w-8 text-right">{s.marginPct.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* By technician table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Margem por técnico</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Técnico</TableHead>
                <TableHead className="text-center">OS</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">Margem</TableHead>
                <TableHead className="w-32">Margem%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byTech.map((t) => (
                <TableRow key={t.tech}>
                  <TableCell className="font-medium">{t.tech}</TableCell>
                  <TableCell className="text-center">{t.count}</TableCell>
                  <TableCell className="text-right">{formatCurrency(t.revenue)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(t.cost)}</TableCell>
                  <TableCell className={`text-right font-medium ${t.margin >= 0 ? "text-green-700" : "text-destructive"}`}>{formatCurrency(t.margin)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${t.marginPct >= 60 ? "bg-green-500" : t.marginPct >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${Math.min(100, t.marginPct)}%` }}
                        />
                      </div>
                      <span className="text-xs w-8 text-right">{t.marginPct.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════
   SHARED COMPONENTS
═══════════════════════════════════════ */
type MetricColor = "blue" | "green" | "amber" | "teal" | "red";

const COLOR_MAP: Record<MetricColor, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  green: "bg-green-50 text-green-700 border-green-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  teal: "bg-teal-50 text-teal-700 border-teal-200",
  red: "bg-red-50 text-red-700 border-red-200",
};

function MetricCard({ title, value, sub, color, icon: Icon }: {
  title: string;
  value: string;
  sub: string;
  color: MetricColor;
  icon: any;
}) {
  return (
    <Card className={`border ${COLOR_MAP[color]}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">{title}</p>
          <Icon className="w-4 h-4 opacity-60" />
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs opacity-70 mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

/* Helper type for metrics return */
function buildMetrics(x: any) { return x; }
