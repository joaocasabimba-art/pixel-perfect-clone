import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { Lead } from "@/lib/types";

interface Props {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (leadId: string, reason: string) => void;
  isPending: boolean;
}

export function LostReasonModal({
  lead,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: Props) {
  const [reason, setReason] = useState("");

  function handleConfirm() {
    if (!lead) return;
    onConfirm(lead.id, reason);
    setReason("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Motivo da perda</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Por que o lead <strong>{lead?.name}</strong> foi perdido?
        </p>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Motivo (opcional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Preço alto, escolheu concorrente..."
              rows={3}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleConfirm}
              disabled={isPending}
              variant="destructive"
              className="w-full"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Marcar como perdido
            </Button>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
