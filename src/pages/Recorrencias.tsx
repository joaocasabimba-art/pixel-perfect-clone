import { RotateCcw, MessageCircle, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const summaryCards = [
  { label: "Vencidos", count: 3, revenue: "R$ 840", class: "bg-danger-light text-danger" },
  { label: "7 dias", count: 7, revenue: "R$ 1.960", class: "bg-warning-light text-warning" },
  { label: "15 dias", count: 12, revenue: "R$ 3.360", class: "bg-primary-light text-primary-mid" },
  { label: "30 dias", count: 28, revenue: "R$ 7.840", class: "bg-muted text-muted-foreground" },
];

const mockRecorrencias = [
  { client: "João da Silva", service: "Caixa d'água", lastDate: "14/01/2026", nextDate: "14/07/2026" },
  { client: "Maria Costa", service: "Dedetização", lastDate: "05/12/2025", nextDate: "05/06/2026" },
  { client: "Posto Ipiranga", service: "Desratização", lastDate: "01/01/2026", nextDate: "01/04/2026" },
];

export default function Recorrencias() {
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
              <p className="text-xs text-muted-foreground">{s.revenue} est.</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        {mockRecorrencias.map((r, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{r.client}</p>
                  <p className="text-sm text-muted-foreground">{r.service}</p>
                  <p className="text-xs text-muted-foreground">Último: {r.lastDate} · Próximo: {r.nextDate}</p>
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
    </div>
  );
}
