import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";

export interface CatalogService {
  id: string;
  name: string;
  type_key: string;
  description: string | null;
  recurrence_days: number | null;
  base_price: number | null;
  is_active: boolean;
}

const FALLBACK_SERVICES = [
  "Dedetização",
  "Desratização",
  "Descupinização",
  "Limpeza de caixa d'água",
  "Sanitização",
  "Desentupimento",
  "Outro",
];

export function useServiceCatalog() {
  const companyId = useCompanyId();

  const { data: company } = useQuery({
    queryKey: ["company-settings", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("companies")
        .select("settings")
        .eq("id", companyId!)
        .single();
      return data;
    },
    enabled: !!companyId,
  });

  const catalog: CatalogService[] =
    (company?.settings as any)?.service_catalog ?? [];

  const active = catalog.filter((s) => s.is_active);

  // If no catalog configured yet, fall back to static list
  const serviceNames: string[] =
    active.length > 0 ? active.map((s) => s.name) : FALLBACK_SERVICES;

  const options = active.length > 0
    ? active.map((s) => ({
        value: s.name,
        label: s.name,
        recurrenceDays: s.recurrence_days,
        basePrice: s.base_price,
        typeKey: s.type_key,
      }))
    : FALLBACK_SERVICES.map((name) => ({ value: name, label: name, recurrenceDays: null, basePrice: null, typeKey: "outros" }));

  return { catalog, active, serviceNames, options };
}
