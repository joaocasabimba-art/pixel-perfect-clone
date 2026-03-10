import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/errorHandler";
import type { Json } from "@/integrations/supabase/types";

export interface WorkOrder {
  id: string;
  company_id: string;
  service_id: string;
  number: number;
  status: "open" | "in_progress" | "done" | "cancelled";
  products_used: Json;
  areas_treated: Json;
  target_pests: string[];
  tech_notes: string | null;
  client_signature: string | null;
  photos: string[];
  attachments?: any[];
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  service?: {
    id: string;
    service_type: string;
    scheduled_date: string | null;
    start_time: string | null;
    value: number | null;
    payment_status: string | null;
    payment_method: string | null;
    paid_at: string | null;
    started_at: string | null;
    completed_at: string | null;
    address: string | null;
    installments?: any[];
    client?: {
      id: string;
      name: string;
      phone: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
    } | null;
    tech?: {
      id: string;
      full_name: string;
      phone: string | null;
    } | null;
  };
}

export interface ProductUsed {
  product_id: string;
  name: string;
  qty: number;
  unit: string;
  dose?: string;
  unit_cost?: number;
}

export interface AreaTreated {
  area: string;
  sqm: number;
  method: string;
}

export function useWorkOrders(filters?: { status?: string; techId?: string; search?: string }) {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ["work_orders", filters],
    queryFn: async () => {
      let query = supabase
        .from("work_orders")
        .select(`
          *,
          service:services (
            id, service_type, scheduled_date, start_time, value,
            payment_status, payment_method, paid_at, started_at, completed_at,
            address, installments,
            client:clients (id, name, phone, address, city, state),
            tech:profiles!services_assigned_to_fkey (id, full_name, phone)
          )
        `)
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters?.techId) {
        query = query.eq("service.assigned_to", filters.techId);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = data as WorkOrder[];
      if (filters?.search) {
        const s = filters.search.toLowerCase();
        results = results.filter(
          (wo) =>
            wo.service?.client?.name?.toLowerCase().includes(s) ||
            String(wo.number).padStart(4, "0").includes(s)
        );
      }
      return results;
    },
    enabled: !!companyId,
  });
}

export function useWorkOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["work_order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select(`
          *,
          service:services (
            id, service_type, scheduled_date, start_time, value,
            payment_status, payment_method, paid_at, started_at, completed_at,
            address, notes, installments,
            client:clients (id, name, phone, address, city, state, email, document),
            tech:profiles!services_assigned_to_fkey (id, full_name, phone)
          )
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as WorkOrder;
    },
    enabled: !!id,
  });
}

export function useCreateWorkOrder() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: async (serviceId: string) => {
      const { data: existing } = await supabase
        .from("work_orders")
        .select("id")
        .eq("service_id", serviceId)
        .maybeSingle();

      if (existing) return existing;

      const { data, error } = await supabase
        .from("work_orders")
        .insert({
          service_id: serviceId,
          company_id: companyId!,
          status: "open",
          products_used: [],
          areas_treated: [],
          target_pests: [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work_orders"] });
    },
    onError: (err: any) =>
      toast({ title: "Erro ao criar OS", description: friendlyError(err), variant: "destructive" }),
  });
}

export function useUpdateWorkOrder() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id, products_used, areas_treated, target_pests, tech_notes,
      client_signature, photos, status, started_at, completed_at,
    }: {
      id: string;
      products_used?: ProductUsed[];
      areas_treated?: AreaTreated[];
      target_pests?: string[];
      tech_notes?: string;
      client_signature?: string | null;
      photos?: string[];
      status?: string;
      started_at?: string;
      completed_at?: string;
    }) => {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (products_used !== undefined) updates.products_used = (Array.isArray(products_used) ? products_used : []) as unknown as Json;
      if (areas_treated !== undefined) updates.areas_treated = (Array.isArray(areas_treated) ? areas_treated : []) as unknown as Json;
      if (target_pests !== undefined) updates.target_pests = Array.isArray(target_pests) ? target_pests : [];
      if (tech_notes !== undefined) updates.tech_notes = tech_notes || null;
      if (client_signature !== undefined) updates.client_signature = client_signature || null;
      if (photos !== undefined) updates.photos = Array.isArray(photos) ? photos : [];
      if (status !== undefined) updates.status = status;
      if (started_at !== undefined) updates.started_at = started_at;
      if (completed_at !== undefined) updates.completed_at = completed_at;

      const { data, error } = await supabase
        .from("work_orders")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["work_orders"] });
      qc.invalidateQueries({ queryKey: ["work_order", data.id] });
    },
    onError: (err: any) =>
      toast({ title: "Erro ao atualizar OS", description: friendlyError(err), variant: "destructive" }),
  });
}

export function useStartWorkOrder() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (wo: WorkOrder) => {
      const now = new Date().toISOString();
      const { error: woError } = await supabase
        .from("work_orders")
        .update({ status: "in_progress", started_at: now, updated_at: now })
        .eq("id", wo.id);
      if (woError) throw woError;

      const { error: sError } = await supabase
        .from("services")
        .update({ status: "in_progress", started_at: now })
        .eq("id", wo.service_id);
      if (sError) throw sError;

      return { wo_id: wo.id };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["work_orders"] });
      qc.invalidateQueries({ queryKey: ["work_order", data.wo_id] });
      qc.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Serviço iniciado!" });
    },
    onError: (err: any) =>
      toast({ title: "Erro ao iniciar serviço", description: friendlyError(err), variant: "destructive" }),
  });
}

export function useCompleteWorkOrder() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (wo: WorkOrder) => {
      const now = new Date().toISOString();

      // Update work_order
      const { error: woError } = await supabase
        .from("work_orders")
        .update({ status: "done", completed_at: now, updated_at: now })
        .eq("id", wo.id);

      if (woError) throw new Error(`Erro OS: ${woError.message}`);

      // Update service (uses 'completed' status per CHECK constraint)
      const { error: sError } = await supabase
        .from("services")
        .update({ status: "completed", completed_at: now })
        .eq("id", wo.service_id);

      if (sError) throw new Error(`Erro serviço: ${sError.message}`);

      return { wo_id: wo.id };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["work_orders"] });
      qc.invalidateQueries({ queryKey: ["work_order", data.wo_id] });
      qc.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "OS concluída!" });
    },
    onError: (err: any) =>
      toast({ title: "Erro ao concluir OS", description: friendlyError(err), variant: "destructive" }),
  });
}

export function useUpdateServicePayment() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      serviceId, payment_status, payment_method, paid_at,
    }: {
      serviceId: string;
      payment_status: string;
      payment_method?: string;
      paid_at?: string;
    }) => {
      const { error } = await supabase
        .from("services")
        .update({ payment_status, payment_method, paid_at })
        .eq("id", serviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work_orders"] });
      qc.invalidateQueries({ queryKey: ["work_order"] });
      qc.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Pagamento registrado!" });
    },
    onError: (err: any) =>
      toast({ title: "Erro ao atualizar pagamento", description: friendlyError(err), variant: "destructive" }),
  });
}
