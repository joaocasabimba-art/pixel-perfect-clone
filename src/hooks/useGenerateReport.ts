import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/errorHandler";

export function useGenerateReport() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (serviceId: string) => {
      const { data, error } = await supabase.functions.invoke("generate-report", {
        body: { service_id: serviceId },
      });
      if (error) throw error;
      return data as { success: boolean; report_id: string; preview_url: string; html: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      toast({ title: "Laudo gerado! Abrindo visualização..." });
    },
    onError: (err: any) =>
      toast({ title: "Erro ao gerar laudo", description: friendlyError(err), variant: "destructive" }),
  });
}
