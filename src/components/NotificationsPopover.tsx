import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useNavigate } from "react-router-dom";
import { subDays } from "date-fns";

export function NotificationsPopover() {
  const companyId = useCompanyId();
  const navigate = useNavigate();

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const twoDaysAgo = subDays(new Date(), 2).toISOString();
      const items: { icon: string; text: string; href: string }[] = [];

      const [urgentLeads, criticalStock, draftReports] = await Promise.all([
        supabase.from("leads").select("id,name").eq("status", "new").lt("created_at", twoDaysAgo).limit(5),
        supabase.from("products").select("id,name,stock,min_stock").limit(100),
        supabase.from("reports").select("id, client:clients(name)").eq("status", "draft").limit(5),
      ]);

      (urgentLeads.data ?? []).forEach(l =>
        items.push({ icon: "📥", text: `Lead ${l.name} sem resposta há +48h`, href: "/leads" })
      );

      (criticalStock.data ?? []).filter((p: any) => Number(p.stock) <= Number(p.min_stock) && Number(p.min_stock) > 0).forEach((p: any) =>
        items.push({ icon: "📦", text: `${p.name} com estoque crítico`, href: "/estoque" })
      );

      (draftReports.data ?? []).forEach((r: any) =>
        items.push({ icon: "📄", text: `Laudo de ${(r as any).client?.name ?? "cliente"} aguarda assinatura`, href: "/laudos" })
      );

      return items;
    },
    enabled: !!companyId,
    refetchInterval: 60000,
  });

  const count = notifications?.length ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="w-5 h-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-danger text-danger-foreground text-[10px] font-bold flex items-center justify-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b">
          <p className="font-semibold text-sm">Notificações</p>
        </div>
        {count === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Tudo em dia! 🎉</p>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {notifications!.map((n, i) => (
              <button
                key={i}
                className="w-full flex items-start gap-2.5 p-3 hover:bg-muted/50 transition-colors text-left"
                onClick={() => navigate(n.href)}
              >
                <span className="text-base mt-0.5">{n.icon}</span>
                <p className="text-xs text-foreground leading-snug">{n.text}</p>
              </button>
            ))}
          </div>
        )}
        <div className="border-t p-2">
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => navigate("/dashboard")}>
            Ver todas
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
