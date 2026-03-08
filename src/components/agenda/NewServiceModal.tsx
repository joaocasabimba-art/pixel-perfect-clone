import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCreateService } from "@/hooks/useServices";
import { useIsMobile } from "@/hooks/use-mobile";

const serviceSchema = z.object({
  clientId: z.string().min(1, "Selecione um cliente"),
  serviceType: z.string().min(1, "Selecione o tipo"),
  scheduledDate: z.string().min(1, "Selecione a data"),
  startTime: z.string().optional(),
  assignedTo: z.string().optional(),
  value: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

const serviceTypes = [
  "Dedetização",
  "Desratização",
  "Descupinização",
  "Limpeza de caixa d'água",
  "Sanitização",
  "Desentupimento",
  "Outro",
];

const recurrenceDefaults: Record<string, number> = {
  "Limpeza de caixa d'água": 180,
  Dedetização: 90,
  Desratização: 90,
  Descupinização: 365,
  Sanitização: 30,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClientId?: string;
  defaultLeadId?: string;
}

export function NewServiceModal({
  open,
  onOpenChange,
  defaultClientId,
  defaultLeadId,
}: Props) {
  const isMobile = useIsMobile();
  const createService = useCreateService();
  const [clientSearch, setClientSearch] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [techs, setTechs] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [recurrenceOn, setRecurrenceOn] = useState(true);
  const [recurrenceDays, setRecurrenceDays] = useState(90);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      clientId: defaultClientId || "",
      serviceType: "",
      scheduledDate: "",
      startTime: "",
      value: "",
      address: "",
      notes: "",
    },
  });

  const selectedType = watch("serviceType");

  useEffect(() => {
    if (defaultClientId) {
      setValue("clientId", defaultClientId);
    }
  }, [defaultClientId, setValue]);

  useEffect(() => {
    if (selectedType && recurrenceDefaults[selectedType]) {
      setRecurrenceDays(recurrenceDefaults[selectedType]);
    }
  }, [selectedType]);

  // Load technicians
  useEffect(() => {
    if (!open) return;
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .then(({ data }) => {
        if (data) setTechs(data.filter((p: any) => ["owner", "technician"].includes(p.role)));
      });
  }, [open]);

  async function searchClients(term: string) {
    setClientSearch(term);
    if (term.length < 2) {
      setClients([]);
      return;
    }
    setSearchLoading(true);
    const { data } = await supabase
      .from("clients")
      .select("id, name, phone, address")
      .or(`name.ilike.%${term}%,phone.ilike.%${term}%`)
      .limit(10);
    setClients(data || []);
    setSearchLoading(false);
  }

  function selectClient(client: any) {
    setValue("clientId", client.id);
    setClientSearch(client.name);
    if (client.address) setValue("address", client.address);
    setClients([]);
  }

  function onSubmit(data: ServiceFormData) {
    createService.mutate(
      {
        client_id: data.clientId,
        service_type: data.serviceType,
        scheduled_date: data.scheduledDate || undefined,
        address: data.address || undefined,
        value: data.value ? parseFloat(data.value) : undefined,
        lead_id: defaultLeadId || undefined,
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      }
    );
  }

  const formContent = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Client search */}
      <div className="space-y-1">
        <Label>Cliente *</Label>
        {defaultClientId ? (
          <Input value={clientSearch || "Cliente selecionado"} disabled className="text-base" />
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={clientSearch}
              onChange={(e) => searchClients(e.target.value)}
              placeholder="Buscar por nome ou telefone..."
              className="pl-9 text-base"
            />
            {clients.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 bg-popover border border-border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                {clients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                    onClick={() => selectClient(c)}
                  >
                    <p className="font-medium text-foreground">{c.name}</p>
                    {c.phone && (
                      <p className="text-xs text-muted-foreground">{c.phone}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
            {searchLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        )}
        {errors.clientId && (
          <p className="text-xs text-destructive">{errors.clientId.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Tipo de serviço *</Label>
          <Select
            value={watch("serviceType")}
            onValueChange={(v) => setValue("serviceType", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {serviceTypes.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.serviceType && (
            <p className="text-xs text-destructive">{errors.serviceType.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label>Data *</Label>
          <Input
            {...register("scheduledDate")}
            type="date"
            className="text-base"
          />
          {errors.scheduledDate && (
            <p className="text-xs text-destructive">{errors.scheduledDate.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label>Horário</Label>
          <Input
            {...register("startTime")}
            type="time"
            className="text-base"
          />
        </div>

        <div className="space-y-1">
          <Label>Técnico responsável</Label>
          <Select
            value={watch("assignedTo") || ""}
            onValueChange={(v) => setValue("assignedTo", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {techs.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Valor (R$)</Label>
          <Input
            {...register("value")}
            type="number"
            min="0"
            step="0.01"
            placeholder="0,00"
            className="text-base"
          />
        </div>

        <div className="space-y-1">
          <Label>Endereço</Label>
          <Input
            {...register("address")}
            placeholder="Endereço do serviço"
            className="text-base"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Observações</Label>
        <Textarea {...register("notes")} placeholder="Detalhes adicionais" rows={2} />
      </div>

      {/* Recurrence toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
        <div>
          <p className="text-sm font-medium text-foreground">
            Programar retorno automático?
          </p>
          <p className="text-xs text-muted-foreground">
            Intervalo: {recurrenceDays} dias
          </p>
        </div>
        <Switch checked={recurrenceOn} onCheckedChange={setRecurrenceOn} />
      </div>
      {recurrenceOn && (
        <div className="space-y-1">
          <Label>Intervalo de retorno (dias)</Label>
          <Input
            type="number"
            min="1"
            value={recurrenceDays}
            onChange={(e) => setRecurrenceDays(parseInt(e.target.value) || 90)}
            className="text-base"
          />
        </div>
      )}

      <Button
        type="submit"
        className="w-full bg-primary-mid hover:bg-primary-mid/90 text-primary-mid-foreground"
        disabled={createService.isPending}
      >
        {createService.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Agendando...
          </>
        ) : (
          "Agendar Serviço"
        )}
      </Button>
    </form>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Novo Serviço</SheetTitle>
          </SheetHeader>
          <div className="mt-4">{formContent}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Serviço</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
