import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { friendlyError } from "@/lib/errorHandler";
import { formatPhone } from "@/lib/business";
import type { Lead } from "@/lib/types";

interface Props {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConvertLeadModal({ lead, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const companyId = useCompanyId();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState("pf");

  // Sync form when lead changes
  const effectiveName = name || lead?.name || "";
  const effectivePhone = phone || lead?.phone || "";

  async function handleConvert() {
    if (!lead || !companyId) return;
    setLoading(true);
    try {
      const { data: client, error: clientErr } = await supabase
        .from("clients")
        .insert({
          name: effectiveName,
          phone: effectivePhone || null,
          company_id: companyId,
          lead_id: lead.id,
        } as any)
        .select()
        .single();
      if (clientErr) throw clientErr;

      await supabase
        .from("leads")
        .update({ status: "won", client_id: client.id, last_action: new Date().toISOString() } as any)
        .eq("id", lead.id);

      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: `${client.name} adicionado como cliente! 🎉` });
      onOpenChange(false);
      navigate(`/agenda?new=true&client_id=${client.id}&lead_id=${lead.id}`);
    } catch (err: any) {
      toast({
        title: "Erro ao converter lead",
        description: friendlyError(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lead fechado! 🎉</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Criar cliente e agendar serviço?
        </p>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Nome completo</Label>
            <Input
              value={effectiveName}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do cliente"
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              value={effectivePhone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="(11) 99999-9999"
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pf">Pessoa Física</SelectItem>
                <SelectItem value="pj">Pessoa Jurídica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleConvert}
              disabled={loading || !effectiveName}
              className="w-full bg-primary-mid hover:bg-primary-mid/90 text-primary-mid-foreground"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar cliente e agendar"
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="w-full text-muted-foreground"
            >
              Só marcar como fechado por agora
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
