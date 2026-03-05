import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Inbox,
  Calendar,
  ClipboardList,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { icon: LayoutDashboard, label: "Home", path: "/dashboard" },
  { icon: Inbox, label: "Leads", path: "/leads" },
  { icon: Calendar, label: "Agenda", path: "/agenda" },
  { icon: ClipboardList, label: "Ordens", path: "/ordens" },
  { icon: MoreHorizontal, label: "Mais", path: "/mais" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 py-1 px-3 min-w-[44px] min-h-[44px] justify-center transition-colors",
                isActive ? "text-primary-mid" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
