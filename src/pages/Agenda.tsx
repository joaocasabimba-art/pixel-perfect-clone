import { Calendar, Clock, MapPin, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const serviceColors: Record<string, string> = {
  "Dedetização": "border-l-primary-mid",
  "Caixa d'água": "border-l-success",
  "Desratização": "border-l-warning",
};

const mockAgenda = [
  { time: "09:00", end: "11:00", client: "João da Silva", service: "Dedetização", address: "Av. Paulista, 1200", tech: "Carlos", status: "Em andamento" },
  { time: "11:30", end: "13:00", client: "Maria Costa", service: "Caixa d'água", address: "Rua Augusta, 500", tech: "Paulo", status: "Agendado" },
  { time: "14:00", end: "16:00", client: "Posto Ipiranga", service: "Desratização", address: "Av. Industrial, 300 - ABC", tech: "Carlos", status: "Agendado" },
];

export default function Agenda() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
        <Badge className="bg-primary-light text-primary-mid border-0">Hoje · 5 de março</Badge>
      </div>

      <div className="space-y-3">
        {mockAgenda.map((item, i) => (
          <div
            key={i}
            className={`bg-card border border-border rounded-lg p-4 border-l-4 ${serviceColors[item.service] || "border-l-muted"} hover:shadow-md transition-shadow cursor-pointer`}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary-mid" />
                  <span className="text-sm font-semibold text-foreground">{item.time} – {item.end}</span>
                </div>
                <p className="font-semibold text-foreground">{item.client}</p>
                <p className="text-sm text-muted-foreground">{item.service}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {item.address}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="w-3 h-3" />
                  Téc: {item.tech}
                </div>
              </div>
              <Badge
                className={`border-0 text-xs ${
                  item.status === "Em andamento"
                    ? "bg-warning-light text-warning"
                    : "bg-primary-light text-primary-mid"
                }`}
              >
                {item.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
