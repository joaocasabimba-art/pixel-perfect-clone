import { Phone, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useClients } from "@/hooks/useClients";
import { EmptyState } from "@/components/EmptyState";

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2);
  return (
    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
      {initials}
    </div>
  );
}

export default function Clientes() {
  const { data: clients, isLoading } = useClients();

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
      <h1 className="text-2xl font-bold text-foreground">Clientes</h1>

      {(!clients || clients.length === 0) ? (
        <EmptyState
          icon="👥"
          title="Nenhum cliente cadastrado"
          description="Clientes são criados automaticamente ao fechar um lead"
        />
      ) : (
        <div className="space-y-3">
          {clients.map((c: any) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={c.name} />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between">
                      <p className="font-semibold text-foreground">{c.name}</p>
                      <span className="text-xs text-muted-foreground">{c.services?.[0]?.count ?? 0} serviços</span>
                    </div>
                    {c.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" />{c.phone}
                      </div>
                    )}
                    {(c.city || c.state) && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />{[c.city, c.state].filter(Boolean).join(" - ")}
                      </div>
                    )}
                    {c.tags && c.tags.length > 0 && (
                      <div className="flex gap-1.5 mt-1">
                        {c.tags.map((t: string) => (
                          <Badge key={t} variant="outline" className="text-[10px] bg-primary-light text-primary-mid border-0">{t}</Badge>
                        ))}
                      </div>
                    )}
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
