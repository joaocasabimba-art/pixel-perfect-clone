import { Phone, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const mockClientes = [
  { id: "1", name: "João da Silva", phone: "(11) 99999-9999", lastService: "14/01/2026", total: 4, tags: ["residencial", "dedetização"], location: "São Paulo - SP" },
  { id: "2", name: "Maria Costa", phone: "(21) 97777-6666", lastService: "05/12/2025", total: 2, tags: ["residencial"], location: "Rio de Janeiro - RJ" },
  { id: "3", name: "Posto Ipiranga", phone: "(11) 3333-4444", lastService: "01/01/2026", total: 6, tags: ["comercial", "desratização"], location: "Guarulhos - SP" },
];

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2);
  return (
    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
      {initials}
    </div>
  );
}

export default function Clientes() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Clientes</h1>

      <div className="space-y-3">
        {mockClientes.map((c) => (
          <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar name={c.name} />
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-foreground">{c.name}</p>
                    <span className="text-xs text-muted-foreground">{c.total} serviços</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3" />
                    {c.phone}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {c.location}
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    {c.tags.map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px] bg-primary-light text-primary-mid border-0">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Último serviço: {c.lastService}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
