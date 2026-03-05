import { Link } from "react-router-dom";
import { FileText, Users, Package, RotateCcw, Settings, ChevronRight } from "lucide-react";

const items = [
  { icon: FileText, label: "Laudos", path: "/laudos" },
  { icon: Users, label: "Clientes", path: "/clientes" },
  { icon: RotateCcw, label: "Recorrências", path: "/recorrencias" },
  { icon: Package, label: "Estoque", path: "/estoque" },
  { icon: Settings, label: "Configurações", path: "/configuracoes" },
];

export default function Mais() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Mais</h1>
      <div className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="flex items-center justify-between p-4 bg-card rounded-lg border border-border hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-5 h-5 text-primary-mid" />
              <span className="font-medium text-foreground">{item.label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
