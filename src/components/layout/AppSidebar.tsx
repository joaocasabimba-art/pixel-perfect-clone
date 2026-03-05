import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Inbox,
  Calendar,
  ClipboardList,
  FileText,
  Users,
  Package,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bug,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Inbox, label: "Leads", path: "/leads" },
  { icon: Calendar, label: "Agenda", path: "/agenda" },
  { icon: ClipboardList, label: "Ordens", path: "/ordens" },
  { icon: FileText, label: "Laudos", path: "/laudos" },
  { icon: Users, label: "Clientes", path: "/clientes" },
  { icon: Package, label: "Estoque", path: "/estoque" },
  { icon: Settings, label: "Config", path: "/configuracoes" },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 h-screen sticky top-0",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary-mid flex items-center justify-center flex-shrink-0">
          <Bug className="w-5 h-5 text-primary-mid-foreground" />
        </div>
        {!collapsed && (
          <span className="font-bold text-base truncate">PragaZero</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/dashboard" && location.pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-sidebar-muted",
                isActive && "sidebar-active bg-sidebar-accent font-semibold",
                collapsed && "justify-center px-0"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-sidebar-border hover:bg-sidebar-muted transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
