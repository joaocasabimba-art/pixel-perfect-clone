import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import { ArrowLeft, Play, Check, FileText, MessageCircle, Trash2, Plus, X, Upload, Save, Paperclip, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useWorkOrder, useUpdateWorkOrder, useStartWorkOrder, useCompleteWorkOrder,
  useUpdateServicePayment, ProductUsed, AreaTreated,
} from "@/hooks/useWorkOrders";
import { useProducts } from "@/hooks/useProducts";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateBR, formatCurrency, whatsappLink } from "@/lib/business";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { generateReportPDF } from "@/lib/generateReport";

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: "Aberta", className: "bg-blue-100 text-blue-800 border-0" },
  in_progress: { label: "Em andamento", className: "bg-amber-100 text-amber-800 border-0" },
  done: { label: "Concluída", className: "bg-green-100 text-green-800 border-0" },
  cancelled: { label: "Cancelada", className: "bg-gray-100 text-gray-600 border-0" },
};

const PEST_OPTIONS = [
  "Baratas", "Ratos", "Formigas", "Cupins", "Escorpiões",
  "Pulgas", "Mosquitos", "Traças", "Percevejos", "Outro",
];

const METHODS = ["Aspersão", "Gel", "Fumigação", "Pó seco", "Isca", "Outro"];

export default function OrdemDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const sigRef = useRef<SignatureCanvas>(null);

  const { data: wo, isLoading, refetch: refetchWO } = useWorkOrder(id);
  const { data: products } = useProducts();
  const updateWO = useUpdateWorkOrder();
  const startWO = useStartWorkOrder();
  const completeWO = useCompleteWorkOrder();
  const updatePayment = useUpdateServicePayment();

  // Report state (no more polling/edge function)
  const [reportId, setReportId] = useState<string | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  useEffect(() => {
    if (wo?.status !== "done" || !wo?.service_id) return;
    supabase.from("reports").select("id").eq("service_id", wo.service_id).maybeSingle()
      .then(({ data }) => { if (data?.id) setReportId(data.id); });
  }, [wo?.status, wo?.service_id]);

  // Form state
  const [productsUsed, setProductsUsed] = useState<ProductUsed[]>([]);
  const [areasTreated, setAreasTreated] = useState<AreaTreated[]>([]);
  const [targetPests, setTargetPests] = useState<string[]>([]);
  const [techNotes, setTechNotes] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [uploading, setUploading] = useState(false);

  // Payment state
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paidAt, setPaidAt] = useState("");

  // Attachment state
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Installment state
  const [installmentMode, setInstallmentMode] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(2);
  const [installments, setInstallments] = useState<any[]>([]);

  // Initialize form from WO data
  useEffect(() => {
    if (wo) {
      setProductsUsed((wo.products_used as unknown as ProductUsed[]) || []);
      setAreasTreated((wo.areas_treated as unknown as AreaTreated[]) || []);
      setTargetPests(wo.target_pests || []);
      setTechNotes(wo.tech_notes || "");
      setSignature(wo.client_signature);
      setPhotos(wo.photos || []);
      setPaymentStatus(wo.service?.payment_status || "pending");
      setPaymentMethod(wo.service?.payment_method || "");
      setPaidAt(wo.service?.paid_at?.split("T")[0] || "");
      setAttachments((wo as any).attachments || []);
      const inst = (wo.service as any)?.installments;
      if (inst?.length > 0) {
        setInstallments(inst);
        setInstallmentMode(true);
        setInstallmentCount(inst.length);
      }
    }
  }, [wo]);

  // Auto-save every 30 seconds when in_progress
  const saveData = useCallback(async () => {
    if (!wo || wo.status !== "in_progress") return;
    await updateWO.mutateAsync({
      id: wo.id,
      products_used: productsUsed as any,
      areas_treated: areasTreated as any,
      target_pests: targetPests,
      tech_notes: techNotes,
      client_signature: signature,
      photos,
    });
    setLastSaved(new Date());
  }, [wo, productsUsed, areasTreated, targetPests, techNotes, signature, photos, updateWO]);

  useEffect(() => {
    if (wo?.status !== "in_progress") return;
    const interval = setInterval(saveData, 30000);
    return () => clearInterval(interval);
  }, [wo?.status, saveData]);

  // Product handlers
  const addProduct = () => {
    setProductsUsed([...productsUsed, { product_id: "", name: "", qty: 1, unit: "un", dose: "" }]);
  };

  const updateProduct = (index: number, field: keyof ProductUsed, value: any) => {
    const updated = [...productsUsed];
    if (field === "product_id") {
      const prod = products?.find((p) => p.id === value);
      if (prod) {
        updated[index] = {
          ...updated[index], product_id: prod.id, name: prod.name,
          unit: prod.unit || "un", unit_cost: prod.cost || 0,
        };
      }
    } else {
      (updated[index] as any)[field] = value;
    }
    setProductsUsed(updated);
  };

  const removeProduct = (index: number) => setProductsUsed(productsUsed.filter((_, i) => i !== index));

  // Area handlers
  const addArea = () => setAreasTreated([...areasTreated, { area: "", sqm: 0, method: "Aspersão" }]);

  const updateArea = (index: number, field: keyof AreaTreated, value: any) => {
    const updated = [...areasTreated];
    (updated[index] as any)[field] = value;
    setAreasTreated(updated);
  };

  const removeArea = (index: number) => setAreasTreated(areasTreated.filter((_, i) => i !== index));

  const togglePest = (pest: string) => {
    setTargetPests((prev) => prev.includes(pest) ? prev.filter((p) => p !== pest) : [...prev, pest]);
  };

  // Photo upload
  const uploadPhoto = async (file: File) => {
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${wo?.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("photos").upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("photos").getPublicUrl(fileName);
      setPhotos([...photos, urlData.publicUrl]);
      toast({ title: "Foto enviada!" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar foto", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (url: string) => setPhotos(photos.filter((p) => p !== url));

  // Signature handlers
  const clearSignature = () => { sigRef.current?.clear(); setSignature(null); };
  const saveSignature = () => {
    const data = sigRef.current?.toDataURL();
    if (data) { setSignature(data); toast({ title: "Assinatura salva!" }); }
  };

  // Attachment handlers
  const uploadAttachment = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande (máx 10MB)", variant: "destructive" });
      return;
    }
    setUploadingAttachment(true);
    try {
      const path = `${wo?.company_id}/attachments/${wo?.id}/${file.name}`;
      const { error } = await supabase.storage.from("photos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("photos").getPublicUrl(path);
      const newAtt = { name: file.name, path, url: urlData.publicUrl, size: file.size };
      const updated = [...attachments, newAtt];
      setAttachments(updated);
      await supabase.from("work_orders").update({ attachments: updated as any }).eq("id", wo!.id);
      toast({ title: `${file.name} anexado!` });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploadingAttachment(false);
    }
  };

  const removeAttachment = async (att: any) => {
    await supabase.storage.from("photos").remove([att.path]);
    const updated = attachments.filter((a) => a.path !== att.path);
    setAttachments(updated);
    await supabase.from("work_orders").update({ attachments: updated as any }).eq("id", wo!.id);
    toast({ title: "Anexo removido" });
  };

  // Installment handlers
  const generateInstallments = (total: number, count: number) => {
    const startDate = new Date();
    const inst = Array.from({ length: count }, (_, i) => ({
      number: i + 1,
      value: parseFloat((total / count).toFixed(2)),
      due_date: new Date(new Date(startDate).setMonth(startDate.getMonth() + i + 1)).toISOString().split("T")[0],
      paid_at: null,
      method: "pix",
    }));
    setInstallments(inst);
    return inst;
  };

  const saveInstallments = async (inst: any[]) => {
    if (!wo?.service?.id) return;
    const allPaid = inst.every((i) => i.paid_at);
    const anyPaid = inst.some((i) => i.paid_at);
    await supabase.from("services").update({
      installments: inst as any,
      payment_status: allPaid ? "paid" : anyPaid ? "partial" : "pending",
    } as any).eq("id", wo.service.id);
    refetchWO();
  };

  const payInstallment = async (index: number) => {
    const updated = [...installments];
    updated[index].paid_at = new Date().toISOString();
    setInstallments(updated);
    await saveInstallments(updated);
    toast({ title: `Parcela ${index + 1} paga!` });
  };

  // Start service
  const handleStart = async () => { if (wo) await startWO.mutateAsync(wo); };

  // Complete OS + generate PDF
  const handleComplete = async () => {
    if (!wo) return;
    if (productsUsed.length === 0) {
      toast({ title: "Adicione ao menos 1 produto utilizado", variant: "destructive" });
      return;
    }
    if (areasTreated.length === 0) {
      toast({ title: "Adicione ao menos 1 área tratada", variant: "destructive" });
      return;
    }

    // Save final data
    await updateWO.mutateAsync({
      id: wo.id,
      products_used: productsUsed as any,
      areas_treated: areasTreated as any,
      target_pests: targetPests,
      tech_notes: techNotes || null,
      client_signature: signature || null,
      photos,
    });

    try {
      // Complete OS + service
      await completeWO.mutateAsync(wo);

      // Generate PDF on frontend
      setPdfGenerating(true);
      const { data: service } = await supabase
        .from("services")
        .select("*, client:clients(*), tech:profiles!services_assigned_to_fkey(full_name)")
        .eq("id", wo.service_id)
        .single();

      const { data: company } = await supabase
        .from("companies").select("*").eq("id", wo.company_id).single();

      if (service && company) {
        const rid = await generateReportPDF({
          wo: { ...wo, products_used: productsUsed, areas_treated: areasTreated, target_pests: targetPests, tech_notes: techNotes },
          service,
          client: service.client,
          company,
        });
        setReportId(rid);
        toast({ title: "OS concluída! Laudo gerado." });
        navigate(`/laudos/${rid}`);
      }
    } catch (err: any) {
      console.error("Error completing:", err);
      toast({ title: "OS concluída! O laudo será gerado em breve." });
    } finally {
      setPdfGenerating(false);
    }
  };

  // Payment update
  const handlePaymentUpdate = async () => {
    if (!wo?.service?.id) return;
    await updatePayment.mutateAsync({
      serviceId: wo.service.id,
      payment_status: paymentStatus,
      payment_method: paymentMethod || undefined,
      paid_at: paymentStatus === "paid" && paidAt ? new Date(paidAt).toISOString() : undefined,
    });
  };

  // WhatsApp message
  const sendWhatsApp = () => {
    if (!wo?.service?.client?.phone) return;
    const client = wo.service.client;
    const service = wo.service;
    const msg = `✅ *Ordem de Serviço Concluída*\n\nOlá, ${client.name}!\n\nSegue o resumo do serviço realizado:\n\n📋 *OS:* #${String(wo.number).padStart(4, "0")}\n🔧 *Serviço:* ${service.service_type}\n📅 *Data:* ${wo.completed_at ? formatDateBR(wo.completed_at) : "—"}\n\n${targetPests.length ? `🐛 *Pragas controladas:* ${targetPests.join(", ")}` : ""}\n\nO laudo técnico será enviado em seguida.\n\nQualquer dúvida, estamos à disposição! 😊`;
    window.open(whatsappLink(client.phone, msg), "_blank");
  };

  // Calculate costs
  const totalCost = productsUsed.reduce((sum, p) => sum + (p.unit_cost || 0) * p.qty, 0);
  const serviceValue = wo?.service?.value || 0;
  const margin = serviceValue - totalCost;
  const formatWONumber = (n: number) => `#${String(n).padStart(4, "0")}`;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "📄";
    if (["jpg", "jpeg", "png", "webp"].includes(ext || "")) return "🖼️";
    if (["doc", "docx"].includes(ext || "")) return "📝";
    return "📎";
  };

  if (isLoading || !wo) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const st = statusConfig[wo.status] || statusConfig.open;
  const isTechnician = profile?.role === "technician";
  const canEdit = wo.status !== "done" && wo.status !== "cancelled";

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-bold text-primary">OS {formatWONumber(wo.number)}</span>
            <Badge className={st.className}>{st.label}</Badge>
          </div>
        </div>
      </div>

      {/* Client/Service Info */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <p className="font-semibold text-lg">{wo.service?.client?.name || "—"}</p>
          {wo.service?.client?.phone && <p className="text-sm text-muted-foreground">{wo.service.client.phone}</p>}
          {wo.service?.address && (
            <p className="text-sm text-muted-foreground">
              {wo.service.address}
              {wo.service.client?.city && ` – ${wo.service.client.city}`}
              {wo.service.client?.state && ` – ${wo.service.client.state}`}
            </p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground pt-2">
            {wo.service?.tech?.full_name && <span>Técnico: {wo.service.tech.full_name}</span>}
            {wo.service?.scheduled_date && (
              <span>{formatDateBR(wo.service.scheduled_date)}{wo.service.start_time && ` às ${wo.service.start_time.slice(0, 5)}`}</span>
            )}
            <span>{wo.service?.service_type}</span>
            {wo.service?.value && <span className="font-semibold text-foreground">{formatCurrency(Number(wo.service.value))}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="execution" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="execution">Execução</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          {!isTechnician && <TabsTrigger value="financial">Financeiro</TabsTrigger>}
        </TabsList>

        {/* Execution Tab */}
        <TabsContent value="execution" className="space-y-6 mt-4">
          {/* Products Used */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Produtos utilizados</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {productsUsed.map((prod, idx) => (
                <div key={idx} className="flex flex-wrap gap-2 items-center">
                  <Select value={prod.product_id} onValueChange={(v) => updateProduct(idx, "product_id", v)} disabled={!canEdit}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Produto" /></SelectTrigger>
                    <SelectContent>
                      {products?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Qtd" value={prod.qty} onChange={(e) => updateProduct(idx, "qty", Number(e.target.value))} className="w-20" disabled={!canEdit} />
                  <span className="text-sm text-muted-foreground">{prod.unit}</span>
                  <Input placeholder="Dose" value={prod.dose || ""} onChange={(e) => updateProduct(idx, "dose", e.target.value)} className="w-24" disabled={!canEdit} />
                  {canEdit && <Button variant="ghost" size="icon" onClick={() => removeProduct(idx)}><X className="w-4 h-4" /></Button>}
                </div>
              ))}
              {canEdit && <Button variant="outline" size="sm" onClick={addProduct} className="gap-1"><Plus className="w-4 h-4" /> Adicionar produto</Button>}
            </CardContent>
          </Card>

          {/* Areas Treated */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Áreas tratadas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {areasTreated.map((area, idx) => (
                <div key={idx} className="flex flex-wrap gap-2 items-center">
                  <Input placeholder="Área/Ambiente" value={area.area} onChange={(e) => updateArea(idx, "area", e.target.value)} className="w-40" disabled={!canEdit} />
                  <Input type="number" placeholder="m²" value={area.sqm} onChange={(e) => updateArea(idx, "sqm", Number(e.target.value))} className="w-20" disabled={!canEdit} />
                  <Select value={area.method} onValueChange={(v) => updateArea(idx, "method", v)} disabled={!canEdit}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {canEdit && <Button variant="ghost" size="icon" onClick={() => removeArea(idx)}><X className="w-4 h-4" /></Button>}
                </div>
              ))}
              {canEdit && <Button variant="outline" size="sm" onClick={addArea} className="gap-1"><Plus className="w-4 h-4" /> Adicionar área</Button>}
            </CardContent>
          </Card>

          {/* Target Pests */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Pragas controladas</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {PEST_OPTIONS.map((pest) => (
                  <Badge
                    key={pest}
                    variant={targetPests.includes(pest) ? "default" : "outline"}
                    className={`cursor-pointer ${targetPests.includes(pest) ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    onClick={() => canEdit && togglePest(pest)}
                  >
                    {pest}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tech Notes */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Observações do técnico</CardTitle></CardHeader>
            <CardContent>
              <Textarea placeholder="Observações sobre o serviço realizado..." value={techNotes} onChange={(e) => setTechNotes(e.target.value)} rows={4} disabled={!canEdit} />
            </CardContent>
          </Card>

          {/* Photos */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Fotos</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-3">
                {photos.map((url, idx) => (
                  <div key={idx} className="relative">
                    <img src={url} alt={`Foto ${idx + 1}`} className="w-20 h-20 object-cover rounded-lg" />
                    {canEdit && (
                      <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 w-6 h-6" onClick={() => removePhoto(url)}>
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {canEdit && (
                <div>
                  <input type="file" accept="image/*" id="photo-upload" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadPhoto(file); }} />
                  <Button variant="outline" size="sm" onClick={() => document.getElementById("photo-upload")?.click()} disabled={uploading} className="gap-1">
                    <Upload className="w-4 h-4" /> {uploading ? "Enviando..." : "Adicionar foto"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Paperclip className="w-4 h-4" /> Anexos</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 border border-border rounded-lg">
                      <span className="text-lg">{getFileIcon(att.name)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{att.name}</p>
                        <p className="text-xs text-muted-foreground">{att.size ? formatFileSize(att.size) : ""}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => window.open(att.url, "_blank")} className="shrink-0">
                        <Download className="w-4 h-4" />
                      </Button>
                      {canEdit && (
                        <Button variant="ghost" size="icon" onClick={() => removeAttachment(att)} className="shrink-0">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {canEdit && (
                <div>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" id="attachment-upload" className="hidden"
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadAttachment(file); }} />
                  <Button variant="outline" size="sm" onClick={() => document.getElementById("attachment-upload")?.click()} disabled={uploadingAttachment} className="gap-1">
                    <Paperclip className="w-4 h-4" /> {uploadingAttachment ? "Enviando..." : "Adicionar anexo"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">PDF, imagens, documentos · Máx 10MB</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Signature */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Assinatura do cliente</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {signature ? (
                <div className="space-y-2">
                  <img src={signature} alt="Assinatura" className="w-full h-32 border rounded-lg bg-white object-contain" />
                  {canEdit && <Button variant="outline" size="sm" onClick={clearSignature}>Limpar assinatura</Button>}
                </div>
              ) : canEdit ? (
                <div className="space-y-2">
                  <SignatureCanvas ref={sigRef} canvasProps={{ className: "w-full h-32 border rounded-lg bg-white" }} />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => sigRef.current?.clear()}>Limpar</Button>
                    <Button size="sm" onClick={saveSignature}>Salvar assinatura</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem assinatura</p>
              )}
            </CardContent>
          </Card>

          {/* Auto-save indicator */}
          {wo.status === "in_progress" && lastSaved && (
            <p className="text-xs text-muted-foreground text-center">
              Salvo às {lastSaved.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mt-1.5" />
                  <div>
                    <p className="font-medium">OS criada</p>
                    <p className="text-sm text-muted-foreground">{formatDateBR(wo.created_at)} às {new Date(wo.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
                {wo.started_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full bg-amber-500 mt-1.5" />
                    <div>
                      <p className="font-medium">Serviço iniciado</p>
                      <p className="text-sm text-muted-foreground">{formatDateBR(wo.started_at)} às {new Date(wo.started_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                )}
                {wo.completed_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500 mt-1.5" />
                    <div>
                      <p className="font-medium">OS concluída</p>
                      <p className="text-sm text-muted-foreground">{formatDateBR(wo.completed_at)} às {new Date(wo.completed_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Tab */}
        {!isTechnician && (
          <TabsContent value="financial" className="mt-4 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex justify-between">
                  <span>Valor do serviço</span>
                  <span className="font-semibold">{formatCurrency(serviceValue)}</span>
                </div>

                {/* Payment mode toggle */}
                <div className="flex gap-2">
                  <Button variant={!installmentMode ? "default" : "outline"} size="sm" onClick={() => setInstallmentMode(false)}>
                    Pagamento único
                  </Button>
                  <Button variant={installmentMode ? "default" : "outline"} size="sm" onClick={() => {
                    setInstallmentMode(true);
                    if (installments.length === 0) {
                      const inst = generateInstallments(serviceValue, installmentCount);
                      saveInstallments(inst);
                    }
                  }}>
                    Parcelado
                  </Button>
                </div>

                {!installmentMode ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="paid">Pago</SelectItem>
                          <SelectItem value="partial">Parcial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Forma de pagamento</label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="cash">Dinheiro</SelectItem>
                          <SelectItem value="card">Cartão</SelectItem>
                          <SelectItem value="transfer">Transferência</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {paymentStatus === "paid" && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Data do pagamento</label>
                        <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
                      </div>
                    )}

                    <Button onClick={handlePaymentUpdate} className="w-full">Salvar pagamento</Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium">Nº de parcelas:</label>
                      <Select value={String(installmentCount)} onValueChange={(v) => {
                        const count = Number(v);
                        setInstallmentCount(count);
                        const inst = generateInstallments(serviceValue, count);
                        saveInstallments(inst);
                      }}>
                        <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                            <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      {installments.map((inst, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 border border-border rounded-lg">
                          <span className="text-sm font-medium w-12">{inst.number}/{installments.length}</span>
                          <span className="text-sm text-muted-foreground flex-1">{inst.due_date?.split("-").reverse().join("/")}</span>
                          <span className="text-sm font-semibold">{formatCurrency(inst.value)}</span>
                          {inst.paid_at ? (
                            <Badge className="bg-green-100 text-green-800 border-0">Pago</Badge>
                          ) : (
                            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => payInstallment(idx)}>
                              <Check className="w-3 h-3" /> Pagar
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <hr />

                <div className="flex justify-between text-sm">
                  <span>Custo de materiais</span>
                  <span>{formatCurrency(totalCost)}</span>
                </div>

                <div className="flex justify-between font-semibold">
                  <span>Margem bruta</span>
                  <span className={margin >= 0 ? "text-green-600" : "text-red-600"}>{formatCurrency(margin)}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Fixed Bottom Actions */}
      <div className={`fixed ${isMobile ? "bottom-16" : "bottom-0"} left-0 right-0 bg-background border-t p-4 flex gap-3 justify-center z-40`}>
        {wo.status === "open" && (
          <Button size="lg" onClick={handleStart} disabled={startWO.isPending} className="gap-2">
            <Play className="w-5 h-5" /> Iniciar serviço
          </Button>
        )}

        {wo.status === "in_progress" && (
          <>
            <Button variant="outline" size="lg" onClick={saveData} disabled={updateWO.isPending} className="gap-2">
              <Save className="w-5 h-5" /> Salvar
            </Button>
            <Button size="lg" onClick={handleComplete} disabled={completeWO.isPending || pdfGenerating} className="gap-2 bg-green-600 hover:bg-green-700">
              {pdfGenerating ? (
                <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Gerando laudo...</>
              ) : (
                <><Check className="w-5 h-5" /> Concluir OS</>
              )}
            </Button>
          </>
        )}

        {wo.status === "done" && (
          <>
            {reportId ? (
              <Button variant="outline" size="lg" onClick={() => navigate(`/laudos/${reportId}`)} className="gap-2">
                <FileText className="w-5 h-5" /> Ver Laudo
              </Button>
            ) : (
              <Button variant="outline" size="lg" disabled className="gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Buscando laudo...
              </Button>
            )}
            {wo.service?.client?.phone && (
              <Button size="lg" onClick={sendWhatsApp} className="gap-2">
                <MessageCircle className="w-5 h-5" /> Enviar WhatsApp
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
