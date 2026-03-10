import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Send, Check, X, Plus, Trash2, Copy, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useProposal, useUpdateProposal, type ProposalItem } from "@/hooks/useProposals";
import { useClients } from "@/hooks/useClients";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDateBR, whatsappLink } from "@/lib/business";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-muted text-muted-foreground border-0" },
  sent: { label: "Enviada", className: "bg-blue-100 text-blue-800 border-0" },
  accepted: { label: "Aceita", className: "bg-green-100 text-green-800 border-0" },
  rejected: { label: "Recusada", className: "bg-red-100 text-red-800 border-0" },
};

export default function PropostaEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { data: proposal, isLoading } = useProposal(id);
  const { data: clients } = useClients();
  const updateProposal = useUpdateProposal();

  const { data: company } = useQuery({
    queryKey: ["my-company-proposal"],
    queryFn: async () => {
      const { data: companyId } = await supabase.rpc("get_user_company_id");
      if (!companyId) return null;
      const { data } = await supabase.from("companies").select("*").eq("id", companyId).single();
      return data;
    },
  });

  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [validUntil, setValidUntil] = useState("");
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);

  useEffect(() => {
    if (proposal) {
      setTitle(proposal.title || "");
      setClientId(proposal.client_id || "");
      setValidUntil(proposal.valid_until || "");
      setItems((proposal.items as any) || []);
      setDiscount(Number(proposal.discount) || 0);
      setNotes(proposal.notes || "");
    }
  }, [proposal]);

  const subtotal = useMemo(() => items.reduce((s, i) => s + (i.total || 0), 0), [items]);
  const total = subtotal - discount;
  const selectedClient = clients?.find((c) => c.id === clientId);

  const addItem = () => {
    setItems([...items, {
      id: crypto.randomUUID(),
      description: "",
      quantity: 1,
      unit: "serviço",
      unit_price: 0,
      total: 0,
    }]);
  };

  const updateItem = (index: number, field: keyof ProposalItem, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    if (field === "quantity" || field === "unit_price") {
      updated[index].total = updated[index].quantity * updated[index].unit_price;
    }
    setItems(updated);
  };

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const save = useCallback(async (extraUpdates?: any) => {
    if (!id) return;
    await updateProposal.mutateAsync({
      id,
      title,
      client_id: clientId || null,
      valid_until: validUntil || null,
      items: items as any,
      discount,
      notes: notes || null,
      total_value: total,
      ...extraUpdates,
    });
    toast({ title: "Proposta salva!" });
  }, [id, title, clientId, validUntil, items, discount, notes, total, updateProposal, toast]);

  const generateProposalPDF = async (): Promise<string | null> => {
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;background:white;font-family:Arial,sans-serif;font-size:11pt;padding:40px;color:#1a1a1a;";
    container.innerHTML = buildPreviewHTML();
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const imgW = 210;
      const imgH = (canvas.height * imgW) / canvas.width;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, imgW, Math.min(imgH, 297));

      const blob = pdf.output("blob");
      const path = `${proposal?.company_id}/proposals/${id}.pdf`;
      const { error } = await supabase.storage.from("reports").upload(path, blob, { contentType: "application/pdf", upsert: true });
      if (error) throw error;

      const { data } = await supabase.storage.from("reports").createSignedUrl(path, 604800);
      return data?.signedUrl || null;
    } finally {
      document.body.removeChild(container);
    }
  };

  const sendWhatsApp = async () => {
    if (!selectedClient?.phone) {
      toast({ title: "Cliente sem telefone", variant: "destructive" });
      return;
    }
    await save({ status: "sent", sent_at: new Date().toISOString() });
    toast({ title: "Gerando PDF..." });
    const pdfUrl = await generateProposalPDF();

    const msg = `Olá, ${selectedClient.name}! 👋\n\nSegue nossa proposta para ${title}.\n\n💰 Valor: ${formatCurrency(total)}\n${validUntil ? `📅 Válida até: ${validUntil.split("-").reverse().join("/")}` : ""}\n\n${pdfUrl ? `📄 Proposta: ${pdfUrl}\n\n` : ""}Para aceitar, é só responder esta mensagem! 😊\n— ${company?.name || ""}`;

    window.open(whatsappLink(selectedClient.phone, msg), "_blank");
  };

  const sendEmail = async () => {
    if (!selectedClient?.email) {
      toast({ title: "Cliente sem e-mail", variant: "destructive" });
      return;
    }
    const pdfUrl = await generateProposalPDF();
    const subject = encodeURIComponent(`Proposta ${title} — ${company?.name || ""}`);
    const body = encodeURIComponent(
      `Olá, ${selectedClient?.name}!\n\nSegue nossa proposta comercial.\n\nValor: ${formatCurrency(total)}\n${validUntil ? `Válida até: ${validUntil.split("-").reverse().join("/")}` : ""}\n\n${pdfUrl ? `Acesse: ${pdfUrl}` : ""}\n\nAtt,\n${company?.name || ""}`
    );
    window.open(`mailto:${selectedClient.email}?subject=${subject}&body=${body}`);
  };

  const markAccepted = async () => {
    await save({ status: "accepted", accepted_at: new Date().toISOString() });
    toast({ title: "Proposta aceita!" });
    if (confirm("Deseja criar um serviço a partir desta proposta?")) {
      navigate(`/agenda?new=true&client_id=${clientId}`);
    }
  };

  const markRejected = async () => {
    await save({ status: "rejected" });
    setRejectOpen(false);
    toast({ title: "Proposta recusada" });
  };

  const buildPreviewHTML = () => {
    const logoUrl = company?.settings?.logo_url;
    return `
      <div style="margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1565C0;padding-bottom:16px">
        <div>
          ${logoUrl ? `<img src="${logoUrl}" style="height:45px;margin-bottom:8px" crossorigin="anonymous"/>` : ""}
          <div style="font-size:14pt;font-weight:bold;color:#1565C0">${company?.name || ""}</div>
          <div style="font-size:9pt;color:#666">${company?.cnpj ? `CNPJ: ${company.cnpj}` : ""} ${company?.phone ? `· ${company.phone}` : ""}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:12pt;font-weight:bold;color:#1565C0">PROPOSTA COMERCIAL</div>
          <div style="font-size:10pt;color:#666">PROP-${String(proposal?.number || 0).padStart(4, "0")}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:16px;font-size:10pt">
        <div><strong>PARA:</strong> ${selectedClient?.name || "—"}</div>
        <div><strong>DATA:</strong> ${formatDateBR(new Date())} ${validUntil ? `<strong>VALIDADE:</strong> ${validUntil.split("-").reverse().join("/")}` : ""}</div>
      </div>
      ${items.length > 0 ? `
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:10pt">
        <thead><tr style="background:#f5f5f5;border:1px solid #ddd">
          <th style="padding:8px;text-align:left">Descrição</th>
          <th style="padding:8px;text-align:center;width:60px">Qtd</th>
          <th style="padding:8px;text-align:center;width:70px">Unidade</th>
          <th style="padding:8px;text-align:right;width:100px">Valor unit.</th>
          <th style="padding:8px;text-align:right;width:100px">Total</th>
        </tr></thead>
        <tbody>${items.map((i) => `<tr style="border:1px solid #ddd">
          <td style="padding:8px">${i.description || "—"}</td>
          <td style="padding:8px;text-align:center">${i.quantity}</td>
          <td style="padding:8px;text-align:center">${i.unit}</td>
          <td style="padding:8px;text-align:right">${formatCurrency(i.unit_price)}</td>
          <td style="padding:8px;text-align:right">${formatCurrency(i.total)}</td>
        </tr>`).join("")}</tbody>
      </table>` : ""}
      <div style="text-align:right;margin-bottom:16px">
        ${discount > 0 ? `<p style="font-size:10pt">Subtotal: ${formatCurrency(subtotal)}</p><p style="font-size:10pt;color:#c00">Desconto: -${formatCurrency(discount)}</p>` : ""}
        <p style="font-size:14pt;font-weight:bold;color:#1565C0">TOTAL: ${formatCurrency(total)}</p>
      </div>
      ${notes ? `<div style="border-top:1px solid #ddd;padding-top:12px;font-size:10pt"><strong>Observações:</strong><p style="white-space:pre-wrap;color:#444">${notes}</p></div>` : ""}
      <div style="text-align:center;margin-top:30px;font-size:8pt;color:#999;border-top:1px solid #eee;padding-top:8px">Proposta emitida via PragaZero</div>
    `;
  };

  if (isLoading || !proposal) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const st = STATUS_CONFIG[proposal.status] || STATUS_CONFIG.draft;

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/propostas")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 flex items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">PROP-{String(proposal.number).padStart(4, "0")}</span>
          <Badge className={st.className}>{st.label}</Badge>
        </div>
      </div>

      <div className={`grid gap-6 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
        {/* Form */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Dados da proposta</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Validade até</Label>
                <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Itens</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.id} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input placeholder="Descrição" value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} className="flex-1" />
                    <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Qtd</Label>
                      <Input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} />
                    </div>
                    <div>
                      <Label className="text-xs">Unidade</Label>
                      <Input value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Valor unit.</Label>
                      <Input type="number" step="0.01" value={item.unit_price} onChange={(e) => updateItem(idx, "unit_price", Number(e.target.value))} />
                    </div>
                  </div>
                  <p className="text-right text-sm font-semibold">{formatCurrency(item.total)}</p>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
                <Plus className="w-4 h-4" /> Adicionar item
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Label className="flex-shrink-0">Desconto (R$)</Label>
                <Input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-32 ml-auto" />
              </div>
              <div className="flex justify-between items-center font-bold text-lg border-t pt-3">
                <span>Total</span>
                <span className="text-primary-mid">{formatCurrency(total)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Observações</CardTitle></CardHeader>
            <CardContent>
              <Textarea
                placeholder="Condições de pagamento, garantias, observações..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        {!isMobile && (
          <div className="sticky top-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Preview</CardTitle></CardHeader>
              <CardContent>
                <div
                  className="bg-white border rounded-lg p-6 text-sm overflow-auto max-h-[70vh]"
                  style={{ fontSize: "9pt" }}
                  dangerouslySetInnerHTML={{ __html: buildPreviewHTML() }}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className={`fixed ${isMobile ? "bottom-16" : "bottom-0"} left-0 right-0 bg-background border-t p-4 flex gap-2 justify-center z-40 flex-wrap`}>
        <Button variant="outline" onClick={() => save()} disabled={updateProposal.isPending} className="gap-1">
          <Save className="w-4 h-4" /> Salvar
        </Button>
        {(proposal.status === "draft" || proposal.status === "sent") && (
          <>
            <Button onClick={sendWhatsApp} className="gap-1">
              <Send className="w-4 h-4" /> WhatsApp
            </Button>
            <Button variant="outline" onClick={sendEmail} className="gap-1">
              <Mail className="w-4 h-4" /> E-mail
            </Button>
          </>
        )}
        {proposal.status !== "accepted" && proposal.status !== "rejected" && (
          <>
            <Button variant="outline" onClick={markAccepted} className="gap-1 text-green-700 border-green-300">
              <Check className="w-4 h-4" /> Aceitar
            </Button>
            <Button variant="outline" onClick={() => setRejectOpen(true)} className="gap-1 text-red-700 border-red-300">
              <X className="w-4 h-4" /> Recusar
            </Button>
          </>
        )}
        {proposal.status === "accepted" && (
          <Button onClick={() => navigate(`/agenda?new=true&client_id=${clientId}`)} className="gap-1">
            Criar serviço →
          </Button>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Recusar proposta?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação marcará a proposta como recusada.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={markRejected}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
