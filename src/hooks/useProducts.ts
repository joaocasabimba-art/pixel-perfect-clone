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
    mutationFn: async (product: {
      name: string;
      category?: string;
      unit?: string;
      stock?: number;
      min_stock?: number;
      cost?: number;
      supplier?: string;
    }) => {
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
      toast({ title: "Produto cadastrado com sucesso!" });
    },
    onError: (err: any) =>
      toast({ title: "Erro ao cadastrar produto", description: friendlyError(err), variant: "destructive" }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; category?: string; unit?: string; stock?: number; min_stock?: number; cost?: number; supplier?: string }) => {
      const { error } = await supabase.from("products").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Produto atualizado!" });
    },
    onError: (err: any) =>
      toast({ title: "Erro ao atualizar produto", description: friendlyError(err), variant: "destructive" }),
  });
}

export function useAddStock() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async ({
      productId,
      qty,
      unitCost,
      notes,
      currentStock,
    }: {
      productId: string;
      qty: number;
      unitCost?: number;
      notes?: string;
      currentStock: number;
    }) => {
      const updates: any = { stock: currentStock + qty };
      if (unitCost !== undefined) updates.cost = unitCost;

      const { error: updateErr } = await supabase.from("products").update(updates).eq("id", productId);
      if (updateErr) throw updateErr;

      const { error: movErr } = await supabase.from("stock_movements" as any).insert({
        product_id: productId,
        company_id: companyId!,
        type: "in",
        qty,
        unit_cost: unitCost ?? null,
        notes: notes ?? null,
      });
      if (movErr) throw movErr;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock-movements", vars.productId] });
      toast({ title: `+${vars.qty} adicionado ao estoque!` });
    },
    onError: (err: any) =>
      toast({ title: "Erro ao dar entrada", description: friendlyError(err), variant: "destructive" }),
  });
}

export function useStockMovements(productId: string | null) {
  return useQuery({
    queryKey: ["stock-movements", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements" as any)
        .select("*")
        .eq("product_id", productId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!productId,
  });
}
