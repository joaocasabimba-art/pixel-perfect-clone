import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SignatureCanvas from "react-signature-canvas";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/errorHandler";
import { whatsappLink, formatDateBR } from "@/lib/business";
import { ArrowLeft, Download, Pen, Send, Loader2 } from "lucide-react";

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-gray-100 text-gray-600 border-0" },
  signed: { label: "Assinado", className: "bg-blue-100 text-blue-800 border-0" },
  sent: { label: "Enviado", className: "bg-green-100 text-green-800 border-0" },
};

export default function LaudoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const sigRef = useRef<SignatureCanvas>(null);
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [rtName, setRtName] = useState("");
  const [rtRegistry, setRtRegistry] = useState("");

  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ["report", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select(`
          *,
          client:clients(name, phone, address, city, state),
          tech:profiles!reports_tech_id_fkey(full_name),
          service:services(service_type, completed_at, address)
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  // Fetch company info for RT defaults
  const { data: company } = useQuery({
    queryKey: ["my-company"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_user_company_id");
      if (!data) return null;
      const { data: co } = await supabase.from("companies").select("*").eq("id", data).single();
      return co;
    },
  });

  // Prefill RT fields
  useEffect(() => {
    if (company) {
      setRtName(company.responsible_tech || "");
      setRtRegistry(company.crq_crea || "");
    }
  }, [company]);

  // Signed URL for PDF
  const pdfPath = report?.content?.pdf_path;
  const { data: signedUrl } = useQuery({
    queryKey: ["report-url", id, pdfPath],
    queryFn: async () => {
      if (!pdfPath) return null;
      const { data, error } = await supabase.storage.from("reports").createSignedUrl(pdfPath, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!pdfPath,
  });

  // Polling while PDF is generating
  useEffect(() => {
    if (report && !report.content?.pdf_path) {
      const timer = setInterval(() => refetch(), 3000);
      return () => clearInterval(timer);
    }
  }, [report, refetch]);

  // Sign mutation
  const signMutation = useMutation({
    mutationFn: async () => {
      const sig = sigRef.current?.toDataURL();
      if (!sig) throw new Error("Assine antes de confirmar");

      const { error } = await supabase
        .from("reports")
        .update({
          status: "signed",
          signed_at: new Date().toISOString(),
          responsible_tech: rtName,
          rt_registry: rtRegistry,
        } as any)
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["report", id] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      setSignModalOpen(false);
      toast({ title: "Laudo assinado com sucesso!" });
    },
    onError: (err: any) =>
      toast({ title: "Erro ao assinar", description: friendlyError(err), variant: "destructive" }),
  });

  // WhatsApp send
  const handleWhatsApp = async () => {
    const phone = report?.client?.phone;
    if (!phone) {
      toast({ title: "Cliente sem telefone cadastrado", variant: "destructive" });
      return;
    }

    let pdfUrl = signedUrl;
    if (!pdfUrl && pdfPath) {
      const { data } = await supabase.storage.from("reports").createSignedUrl(pdfPath, 3600);
      pdfUrl = data?.signedUrl;
    }

    const msg = `Olá, ${report.client?.name}! 👋\nSegue o laudo técnico do serviço de ${report.service?.service_type || "controle de pragas"} realizado em ${report.service?.completed_at ? formatDateBR(report.service.completed_at) : "—"}.\n\n📄 Laudo: ${pdfUrl || "(em geração)"}\n${report.validity_date ? `Válido até: ${formatDateBR(report.validity_date)}` : ""}\n\nQualquer dúvida estamos à disposição! 😊\n— ${company?.name || "PragaZero"}`;

    window.open(whatsappLink(phone, msg), "_blank");

    // Mark as sent
    await supabase
      .from("reports")
      .update({ status: "sent", sent_at: new Date().toISOString() } as any)
      .eq("id", id!);

    qc.invalidateQueries({ queryKey: ["report", id] });
    qc.invalidateQueries({ queryKey: ["reports"] });
    toast({ title: "Laudo marcado como enviado!" });
  };

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

  const st = statusConfig[report.status] || statusConfig.draft;

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>

        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm font-medium text-foreground truncate">
            {report.client?.name || "—"} · {report.service?.service_type || "—"}
          </span>
          <Badge className={st.className}>{st.label}</Badge>
        </div>

        <div className="flex gap-2">
          {report.status === "draft" && (
            <Button size="sm" variant="outline" onClick={() => setSignModalOpen(true)}>
              <Pen className="w-4 h-4 mr-2" /> Assinar
            </Button>
          )}

          {(report.status === "signed" || report.status === "sent") && (
            <Button size="sm" variant="outline" onClick={handleWhatsApp}>
              <Send className="w-4 h-4 mr-2" /> WhatsApp
            </Button>
          )}

          {signedUrl && (
            <Button size="sm" variant="outline" onClick={() => window.open(signedUrl, "_blank")}>
              <Download className="w-4 h-4 mr-2" /> Baixar
            </Button>
          )}
        </div>
      </div>

      {/* PDF preview */}
      {signedUrl ? (
        <iframe
          src={signedUrl}
          className="w-full border-0 rounded-xl shadow"
          style={{ height: "calc(100vh - 140px)", minHeight: 600 }}
          title="Laudo técnico"
        />
      ) : (
        <div className="border border-border rounded-lg p-8 text-center text-muted-foreground min-h-[400px] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p>Gerando laudo, aguarde...</p>
        </div>
      )}

      {/* Sign Modal */}
      <Dialog open={signModalOpen} onOpenChange={setSignModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assinar Laudo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Responsável Técnico</label>
              <Input value={rtName} onChange={(e) => setRtName(e.target.value)} placeholder="Nome do RT" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">CRQ/CREA</label>
              <Input value={rtRegistry} onChange={(e) => setRtRegistry(e.target.value)} placeholder="Número do registro" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Assinatura</label>
              <SignatureCanvas
                ref={sigRef}
                canvasProps={{ className: "w-full h-32 border rounded-lg bg-white" }}
              />
              <Button variant="outline" size="sm" onClick={() => sigRef.current?.clear()}>
                Limpar
              </Button>
            </div>
            <Button
              className="w-full"
              onClick={() => signMutation.mutate()}
              disabled={signMutation.isPending}
            >
              {signMutation.isPending ? "Assinando..." : "Confirmar assinatura"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
