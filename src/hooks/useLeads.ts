import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/errorHandler";
import type { Lead, LeadStatus } from "@/lib/types";

export function useLeads() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!companyId,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async (lead: {
      name: string;
      phone?: string;
      email?: string;
      origin?: string;
      service_type?: string;
      location?: string;
      notes?: string;
      quote_value?: number;
      address?: Record<string, string | undefined>;
    }) => {
      const { data, error } = await supabase
        .from("leads")
        .insert({ ...lead, company_id: companyId! } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Lead criado com sucesso!" });
    },
    onError: (err: any) =>
      toast({ title: "Erro ao salvar lead", description: friendlyError(err), variant: "destructive" }),
  });
}

export function useUpdateLeadStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      lost_reason,
      client_id,
    }: {
      id: string;
      status: LeadStatus;
      lost_reason?: string;
      client_id?: string;
    }) => {
      const update: Record<string, any> = {
        status,
        last_action: new Date().toISOString(),
      };
      if (lost_reason !== undefined) {
        // Append lost reason to notes
        const { data: existing } = await supabase
          .from("leads")
          .select("notes")
          .eq("id", id)
          .single();
        const existingNotes = existing?.notes || "";
        update.notes = existingNotes
          ? `${existingNotes}\n[Motivo da perda]: ${lost_reason}`
          : `[Motivo da perda]: ${lost_reason}`;
      }
      if (client_id) {
        update.client_id = client_id;
      }
      const { error } = await supabase
        .from("leads")
        .update(update as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
    onError: (err: any) =>
      toast({ title: "Erro ao atualizar lead", description: friendlyError(err), variant: "destructive" }),
  });
}
