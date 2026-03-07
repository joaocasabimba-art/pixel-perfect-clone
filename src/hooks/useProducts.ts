import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/errorHandler";

export function useProducts() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async (product: { name: string; category?: string; unit?: string; stock?: number; min_stock?: number; cost?: number; supplier?: string }) => {
      const { data, error } = await supabase
        .from("products")
        .insert({ ...product, company_id: companyId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Produto criado com sucesso!" });
    },
    onError: (err: any) =>
      toast({ title: "Erro ao criar produto", description: friendlyError(err), variant: "destructive" }),
  });
}
