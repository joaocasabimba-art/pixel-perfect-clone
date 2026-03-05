import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const statusBadge: Record<string, string> = {
  Aberta: "bg-primary-light text-primary-mid",
  "Em andamento": "bg-warning-light text-warning",
  Concluída: "bg-success-light text-success",
  Cancelada: "bg-muted text-muted-foreground",
};

const mockOrdens = [
  { number: "0042", client: "João da Silva", service: "Dedetização", tech: "Carlos", date: "14/03/2026", status: "Concluída", value: "R$ 350,00" },
  { number: "0041", client: "Maria Costa", service: "Caixa d'água", tech: "Paulo", date: "12/03/2026", status: "Em andamento", value: "R$ 180,00" },
  { number: "0040", client: "Posto Ipiranga", service: "Desratização", tech: "Carlos", date: "10/03/2026", status: "Aberta", value: "R$ 450,00" },
];

export default function Ordens() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Ordens de Serviço</h1>

      <div className="space-y-3">
        {mockOrdens.map((os) => (
          <Card key={os.number} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-primary-mid">OS #{os.number}</span>
                    <Badge className={`${statusBadge[os.status]} border-0 text-xs`}>{os.status}</Badge>
                  </div>
                  <p className="font-semibold text-foreground">{os.client}</p>
                  <p className="text-sm text-muted-foreground">{os.service} · Téc: {os.tech}</p>
                  <p className="text-xs text-muted-foreground">{os.date}</p>
                </div>
                <span className="text-sm font-semibold text-foreground">{os.value}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
