import { Package, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const mockProducts = [
  { name: "Cipermetrina 250ml", category: "Inseticida", unit: "L", stock: 3, min: 5, cost: "R$ 45,00", supplier: "QuímicaBR", status: "critical" },
  { name: "Gel Barata 20g", category: "Gel", unit: "un", stock: 12, min: 10, cost: "R$ 22,00", supplier: "PestControl", status: "ok" },
  { name: "Raticida Bloco", category: "Raticida", unit: "kg", stock: 8, min: 5, cost: "R$ 38,00", supplier: "QuímicaBR", status: "ok" },
  { name: "Cloro Granulado", category: "Higienização", unit: "kg", stock: 2, min: 3, cost: "R$ 28,00", supplier: "AguaLimpa", status: "low" },
];

const statusConfig = {
  critical: { label: "Crítico", class: "bg-danger-light text-danger animate-pulse-danger" },
  low: { label: "Baixo", class: "bg-warning-light text-warning" },
  ok: { label: "OK", class: "bg-success-light text-success" },
};

export default function Estoque() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Estoque</h1>

      <div className="space-y-3">
        {mockProducts.map((p) => {
          const st = statusConfig[p.status as keyof typeof statusConfig];
          return (
            <Card key={p.name} className={cn("hover:shadow-md transition-shadow", p.status === "critical" && "border-danger/30")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", p.status === "critical" ? "bg-danger-light" : "bg-primary-light")}>
                      {p.status === "critical" ? <AlertTriangle className="w-5 h-5 text-danger" /> : <Package className="w-5 h-5 text-primary-mid" />}
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.category} · {p.supplier}</p>
                      <p className="text-sm text-foreground">
                        <span className="font-bold">{p.stock}</span>
                        <span className="text-muted-foreground"> / mín. {p.min} {p.unit}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge className={`${st.class} border-0 text-xs`}>{st.label}</Badge>
                    <p className="text-xs text-muted-foreground">{p.cost}/{p.unit}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
