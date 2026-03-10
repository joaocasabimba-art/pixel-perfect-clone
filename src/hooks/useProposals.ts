import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/errorHandler";

export interface ProposalItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  notes?: string;
}

export interface Proposal {
  id: string;
  company_id: string;
  client_id: string | null;
  lead_id: string | null;
  number: number;
  title: string;
  status: "draft" | "sent" | "accepted" | "rejected";
  valid_until: string | null;
  items: ProposalItem[];
  notes: string | null;
  discount: number;
  total_value: number | null;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  client?: { id: string; name: string; phone: string | null; email: string | null } | null;
}

export function useProposals(filters?: { status?: string; search?: string }) {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ["proposals", filters],
    queryFn: async () => {
      let query = supabase
        .from("proposals")
        .select("*, client:clients(id, name, phone, email)")
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = data as any[];
      if (filters?.search) {
        const s = filters.search.toLowerCase();
        results = results.filter(
          (p) =>
            p.title?.toLowerCase().includes(s) ||
            p.client?.name?.toLowerCase().includes(s) ||
            String(p.number).padStart(4, "0").includes(s)
        );
      }
      return results as Proposal[];
    },
    enabled: !!companyId,
  });
}

export function useProposal(id: string | undefined) {
  return useQuery({
    queryKey: ["proposal", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*, client:clients(id, name, phone, email, address, city, state, document)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any as Proposal;
    },
    enabled: !!id,
  });
}

export function useCreateProposal() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: async (data: { title: string; client_id?: string; lead_id?: string }) => {
      const { data: result, error } = await supabase
        .from("proposals")
        .insert({
          company_id: companyId!,
          title: data.title,
          client_id: data.client_id || null,
          lead_id: data.lead_id || null,
          items: [],
          total_value: 0,
          discount: 0,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      toast({ title: "Proposta criada!" });
    },
    onError: (err: any) =>
      toast({ title: "Erro ao criar proposta", description: friendlyError(err), variant: "destructive" }),
  });
}

export function useUpdateProposal() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from("proposals")
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      qc.invalidateQueries({ queryKey: ["proposal", data.id] });
    },
    onError: (err: any) =>
      toast({ title: "Erro ao atualizar proposta", description: friendlyError(err), variant: "destructive" }),
  });
}

export function useDeleteProposal() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("proposals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      toast({ title: "Proposta excluída" });
    },
    onError: (err: any) =>
      toast({ title: "Erro ao excluir", description: friendlyError(err), variant: "destructive" }),
  });
}
