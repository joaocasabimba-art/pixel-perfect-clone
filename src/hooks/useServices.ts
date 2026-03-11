import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/errorHandler";
import { format, startOfWeek, endOfWeek } from "date-fns";

export function useServices() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ["services", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*, client:clients(name, phone), tech:profiles!services_assigned_to_fkey(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useWeekServices() {
  const companyId = useCompanyId();
  const today = new Date();
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  return useQuery({
    queryKey: ["agenda", companyId, weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*, client:clients(name, phone), tech:profiles!services_assigned_to_fkey(full_name)")
        .gte("scheduled_date", weekStart)
        .lte("scheduled_date", weekEnd)
        .order("scheduled_date")
        .order("start_time");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useCalendarServices(startDate: string, endDate: string) {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ["calendar-services", companyId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*, client:clients(name, phone), tech:profiles!services_assigned_to_fkey(full_name)")
        .gte("scheduled_date", startDate)
        .lte("scheduled_date", endDate)
        .order("scheduled_date")
        .order("start_time");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async (service: { client_id: string; service_type: string; scheduled_date?: string; address?: string; value?: number; lead_id?: string }) => {
      const { data, error } = await supabase
        .from("services")
        .insert({ ...service, company_id: companyId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      qc.invalidateQueries({ queryKey: ["agenda"] });
      qc.invalidateQueries({ queryKey: ["calendar-services"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast({ title: "Serviço criado com sucesso!" });
    },
    onError: (err: any) =>
      toast({ title: "Erro ao criar serviço", description: friendlyError(err), variant: "destructive" }),
  });
}
