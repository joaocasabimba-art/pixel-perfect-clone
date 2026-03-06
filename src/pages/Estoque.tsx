import { Package, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useProducts } from "@/hooks/useProducts";
import { EmptyState } from "@/components/EmptyState";
import { formatCurrency } from "@/lib/business";

const statusConfig = {
  critical: { label: "Crítico", class: "bg-danger-light text-danger" },
  low: { label: "Baixo", class: "bg-warning-light text-warning" },
  ok: { label: "OK", class: "bg-success-light text-success" },
};

function getStockStatus(stock: number, minStock: number) {
  if (stock <= 0 || stock < minStock * 0.5) return "critical";
  if (stock < minStock) return "low";
  return "ok";
}

export default function Estoque() {
  const { data: products, isLoading } = useProducts();

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
      <h1 className="text-2xl font-bold text-foreground">Estoque</h1>

      {(!products || products.length === 0) ? (
        <EmptyState
          icon="📦"
          title="Estoque não cadastrado"
          description="Cadastre seus produtos para controlar o uso por serviço"
        />
      ) : (
        <div className="space-y-3">
          {products.map((p: any) => {
            const status = getStockStatus(Number(p.stock), Number(p.min_stock));
            const st = statusConfig[status];
            return (
              <Card key={p.id} className={cn("hover:shadow-md transition-shadow", status === "critical" && "border-danger/30")}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", status === "critical" ? "bg-danger-light" : "bg-primary-light")}>
                        {status === "critical" ? <AlertTriangle className="w-5 h-5 text-danger" /> : <Package className="w-5 h-5 text-primary-mid" />}
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.category}{p.supplier ? ` · ${p.supplier}` : ""}</p>
                        <p className="text-sm text-foreground">
                          <span className="font-bold">{Number(p.stock)}</span>
                          <span className="text-muted-foreground"> / mín. {Number(p.min_stock)} {p.unit}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge className={`${st.class} border-0 text-xs`}>{st.label}</Badge>
                      {p.cost > 0 && <p className="text-xs text-muted-foreground">{formatCurrency(Number(p.cost))}/{p.unit}</p>}
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
