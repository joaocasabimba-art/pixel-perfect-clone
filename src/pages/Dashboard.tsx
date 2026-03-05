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

const metricCards = [
  { icon: Inbox, label: "Leads hoje", value: "12", sub: "3 sem resposta", color: "text-primary-mid", bg: "bg-primary-light" },
  { icon: Calendar, label: "Serviços hoje", value: "4", sub: "1 em andamento", color: "text-success", bg: "bg-success-light" },
  { icon: DollarSign, label: "A receber", value: "R$ 2.400", sub: "2 atrasados", color: "text-warning", bg: "bg-warning-light" },
  { icon: RotateCcw, label: "Recorrências", value: "7", sub: "vencendo esta semana", color: "text-danger", bg: "bg-danger-light" },
];

const urgentItems = [
  { icon: AlertCircle, text: "3 leads sem resposta há mais de 48h", level: "danger" as const },
  { icon: RotateCcw, text: "7 recorrências vencem esta semana", level: "warning" as const },
  { icon: FileText, text: "2 laudos em rascunho", level: "warning" as const },
  { icon: ClipboardList, text: "1 OS aguardando laudo", level: "info" as const },
];

const agenda = [
  { time: "08:00", client: "João Silva", service: "Dedetização", location: "Osasco" },
  { time: "10:30", client: "Maria Costa", service: "Caixa d'água", location: "São Paulo" },
  { time: "14:00", client: "Posto Ipiranga", service: "Desratização", location: "Santo André" },
];

const levelColors = {
  danger: "bg-danger-light text-danger",
  warning: "bg-warning-light text-warning",
  info: "bg-primary-light text-primary-mid",
};

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      {/* Metric cards */}
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

      {/* Urgent + Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Urgent actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-danger" />
              Ação Urgente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {urgentItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
              >
                <Badge variant="outline" className={`${levelColors[item.level]} border-0 px-2 py-1`}>
                  <item.icon className="w-3.5 h-3.5" />
                </Badge>
                <span className="text-sm text-foreground">{item.text}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Agenda */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-mid" />
              Agenda do Dia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {agenda.map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
              >
                <span className="text-sm font-mono font-semibold text-primary-mid min-w-[45px]">
                  {a.time}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{a.client}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.service} · {a.location}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Revenue */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-success" />
            Faturamento do Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-2xl font-bold text-foreground">R$ 8.400</span>
            <span className="text-sm text-muted-foreground">meta R$ 12.000</span>
          </div>
          <Progress value={70} className="h-3" />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">70% da meta</span>
            <Badge className="bg-success-light text-success border-0 text-xs">+23% vs mês anterior</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
