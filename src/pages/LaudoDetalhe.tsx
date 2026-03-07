import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/errorHandler";
import { whatsappLink } from "@/lib/business";
import { ArrowLeft, Download, Pen, Send } from "lucide-react";

export default function LaudoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: report, isLoading } = useQuery({
    queryKey: ["report", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*, client:clients(name, phone), service:services(service_type)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  const { data: signedUrl } = useQuery({
    queryKey: ["report-url", id, report?.content?.pdf_path],
    queryFn: async () => {
      const pdfPath = report?.content?.pdf_path;
      if (!pdfPath) return null;
      const { data, error } = await supabase.storage.from("reports").createSignedUrl(pdfPath, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!report?.content?.pdf_path,
  });

  const signMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("reports")
        .update({ status: "signed" as any, signed_at: new Date().toISOString() } as any)
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["report", id] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      toast({ title: "Laudo assinado com sucesso!" });
    },
    onError: (err: any) =>
      toast({ title: "Erro ao assinar", description: friendlyError(err), variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[700px] w-full" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Laudo não encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/laudos")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  const handleWhatsApp = () => {
    const phone = report.client?.phone;
    if (!phone) {
      toast({ title: "Cliente sem telefone cadastrado", variant: "destructive" });
      return;
    }
    const msg = `Olá, ${report.client?.name}! Segue o laudo do serviço de ${report.service?.service_type || "controle de pragas"}.${signedUrl ? `\n\n📄 ${signedUrl}` : ""}`;
    window.open(whatsappLink(phone, msg), "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>

        {report.status !== "signed" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => signMutation.mutate()}
            disabled={signMutation.isPending}
          >
            <Pen className="w-4 h-4 mr-2" /> Assinar
          </Button>
        )}

        <Button size="sm" variant="outline" onClick={handleWhatsApp}>
          <Send className="w-4 h-4 mr-2" /> Enviar por WhatsApp
        </Button>

        {signedUrl && (
          <Button size="sm" variant="outline" onClick={() => window.open(signedUrl, "_blank")}>
            <Download className="w-4 h-4 mr-2" /> Baixar
          </Button>
        )}
      </div>

      <h1 className="text-xl font-bold text-foreground">
        Laudo — {report.client?.name || "—"}
      </h1>

      {signedUrl ? (
        <iframe
          src={signedUrl}
          className="w-full rounded-lg border border-border"
          style={{ minHeight: 700 }}
          title="Visualização do Laudo"
        />
      ) : (
        <div className="border border-border rounded-lg p-8 text-center text-muted-foreground min-h-[400px] flex items-center justify-center">
          <p>PDF ainda não disponível para este laudo.</p>
        </div>
      )}
    </div>
  );
}
