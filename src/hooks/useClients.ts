import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useToast } from "@/hooks/use-toast";

export function useClients() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*, services:services(count)")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async (client: { name: string; phone?: string; email?: string; city?: string; state?: string; lead_id?: string }) => {
      const { data, error } = await supabase
        .from("clients")
        .insert({ ...client, company_id: companyId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Cliente criado com sucesso!" });
    },
    onError: (err: any) =>
      toast({ title: "Erro ao criar cliente", description: err.message, variant: "destructive" }),
  });
}
