import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronRight, X, Rocket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function OnboardingChecklist() {
  const navigate = useNavigate();
  const companyId = useCompanyId();
  const { profile } = useAuth();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("onboarding_dismissed") === "true");

  const { data: company } = useQuery({
    queryKey: ["company-settings", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("*").eq("id", companyId!).single();
      return data;
    },
    enabled: !!companyId,
  });

  const { data: counts } = useQuery({
    queryKey: ["onboarding-counts", companyId],
    queryFn: async () => {
      const [products, leads, services] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("services").select("id", { count: "exact", head: true }),
      ]);
      return {
        products: products.count ?? 0,
        leads: leads.count ?? 0,
        services: services.count ?? 0,
      };
    },
    enabled: !!companyId,
  });

  if (dismissed || !company) return null;

  // Only show for companies < 7 days old
  const createdAt = new Date(company.created_at);
  if (Date.now() - createdAt.getTime() > 7 * 86400000) return null;

  const settings = (company as any).settings || {};

  const items = [
    { done: !!settings.logo_url, label: "Adicionar logo da empresa", path: "/configuracoes?tab=empresa" },
    { done: !!settings.responsible_tech || !!company.responsible_tech, label: "Cadastrar Responsável Técnico", path: "/configuracoes?tab=empresa" },
    { done: (counts?.products ?? 0) > 0, label: "Cadastrar pelo menos 1 produto", path: "/estoque" },
    { done: (counts?.leads ?? 0) > 0, label: "Criar seu primeiro lead", path: "/leads" },
    { done: (counts?.services ?? 0) > 0, label: "Agendar seu primeiro serviço", path: "/agenda" },
  ];

  const doneCount = items.filter((i) => i.done).length;
  if (doneCount === items.length) return null;

  const progress = Math.round((doneCount / items.length) * 100);

  return (
    <Card className="border-primary/20 bg-primary-pale">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Rocket className="w-4 h-4 text-primary-mid" />
          Complete seu perfil para aproveitar tudo 🚀
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => { setDismissed(true); localStorage.setItem("onboarding_dismissed", "true"); }}
        >
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Progress value={progress} className="flex-1 h-2" />
          <span className="text-xs text-muted-foreground font-medium">{doneCount}/{items.length}</span>
        </div>
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => !item.done && navigate(item.path)}
            className={`flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              item.done ? "text-muted-foreground line-through" : "text-foreground hover:bg-primary/5 cursor-pointer"
            }`}
            disabled={item.done}
          >
            {item.done ? (
              <Check className="w-4 h-4 text-success shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-primary-mid shrink-0" />
            )}
            {item.label}
            {!item.done && <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
