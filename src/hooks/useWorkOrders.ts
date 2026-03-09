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
            id,
            service_type,
            scheduled_date,
            start_time,
            value,
            payment_status,
            payment_method,
            paid_at,
            started_at,
            completed_at,
            address,
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

      // Client-side search filter
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
            id,
            service_type,
            scheduled_date,
            start_time,
            value,
            payment_status,
            payment_method,
            paid_at,
            started_at,
            completed_at,
            address,
            notes,
            client:clients (id, name, phone, address, city, state, email),
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
      // Check if WO already exists
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
      id,
      products_used,
      areas_treated,
      target_pests,
      tech_notes,
      client_signature,
      photos,
      status,
      started_at,
      completed_at,
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
      if (products_used !== undefined) updates.products_used = (products_used ?? []) as unknown as Json;
      if (areas_treated !== undefined) updates.areas_treated = (areas_treated ?? []) as unknown as Json;
      if (target_pests !== undefined) updates.target_pests = target_pests ?? [];
      if (tech_notes !== undefined) updates.tech_notes = tech_notes || null;
      if (client_signature !== undefined) updates.client_signature = client_signature;
      if (photos !== undefined) updates.photos = photos ?? [];
      if (status !== undefined) updates.status = status;
      if (started_at !== undefined) updates.started_at = started_at;
      if (completed_at !== undefined) updates.completed_at = completed_at;

      console.log("[updateWO] payload:", updates, "id:", id);

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

      // Update work_order
      const { error: woError } = await supabase
        .from("work_orders")
        .update({ status: "in_progress", started_at: now, updated_at: now })
        .eq("id", wo.id);

      if (woError) throw woError;

      // Update service
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

      const woPayload = { status: "done" as const, completed_at: now, updated_at: now };
      const svcPayload = { status: "done" as const, completed_at: now };

      console.log("[completeWO] wo payload:", woPayload, "wo.id:", wo.id);
      console.log("[completeWO] service payload:", svcPayload, "service_id:", wo.service_id);

      // Update work_order
      const { error: woError } = await supabase
        .from("work_orders")
        .update(woPayload)
        .eq("id", wo.id);

      if (woError) {
        console.error("[completeWO] work_order error:", woError);
        throw woError;
      }

      // Update service
      const { error: sError } = await supabase
        .from("services")
        .update(svcPayload)
        .eq("id", wo.service_id);

      if (sError) {
        console.error("[completeWO] service error:", sError);
        throw sError;
      }

      // Generate report with retry (up to 3 attempts)
      let reportId: string | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`[generate-report] attempt ${attempt}`);
          const { data: reportData, error: reportError } = await supabase.functions.invoke(
            "generate-report",
            { body: { service_id: wo.service_id, work_order_id: wo.id } }
          );

          if (reportError) {
            console.error(`[generate-report] attempt ${attempt} error:`, reportError);
            throw reportError;
          }

          if (reportData?.report_id) {
            reportId = reportData.report_id;
            break;
          }
        } catch (err) {
          console.error(`[generate-report] attempt ${attempt} failed:`, err);
          if (attempt < 3) {
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }

      return { wo_id: wo.id, report_id: reportId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["work_orders"] });
      qc.invalidateQueries({ queryKey: ["work_order", data.wo_id] });
      qc.invalidateQueries({ queryKey: ["services"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      toast({ title: data.report_id ? "OS concluída! Laudo gerado." : "OS concluída! O laudo será gerado em breve." });
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
      serviceId,
      payment_status,
      payment_method,
      paid_at,
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
