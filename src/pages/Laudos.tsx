import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const statusBadge: Record<string, string> = {
  Rascunho: "bg-warning-light text-warning",
  Assinado: "bg-success-light text-success",
  Enviado: "bg-primary-light text-primary-mid",
};

const mockLaudos = [
  { id: "1", client: "João da Silva", service: "Dedetização", date: "14/03/2026", tech: "Carlos", status: "Assinado", validity: "14/09/2026" },
  { id: "2", client: "Maria Costa", service: "Caixa d'água", date: "12/03/2026", tech: "Paulo", status: "Rascunho", validity: "12/09/2026" },
  { id: "3", client: "Condomínio Verde", service: "Descupinização", date: "05/03/2026", tech: "Carlos", status: "Enviado", validity: "05/03/2027" },
];

export default function Laudos() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Laudos</h1>

      <div className="space-y-3">
        {mockLaudos.map((l) => (
          <Card key={l.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary-mid" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{l.client}</p>
                    <p className="text-sm text-muted-foreground">{l.service} · {l.date}</p>
                    <p className="text-xs text-muted-foreground">Téc: {l.tech} · Validade: {l.validity}</p>
                  </div>
                </div>
                <Badge className={`${statusBadge[l.status]} border-0 text-xs`}>{l.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
