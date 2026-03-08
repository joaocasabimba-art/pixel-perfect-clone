import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Loader2 } from "lucide-react";
import { formatPhone } from "@/lib/business";
import { useCreateLead } from "@/hooks/useLeads";
import { useIsMobile } from "@/hooks/use-mobile";

const leadSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().min(10, "Telefone inválido").or(z.literal("")),
  email: z.string().email("E-mail inválido").or(z.literal("")),
  companyName: z.string().optional(),
  origin: z.string().min(1, "Origem é obrigatória"),
  serviceType: z.string().min(1, "Serviço é obrigatório"),
  quoteValue: z.string().optional(),
  notes: z.string().optional(),
  address: z
    .object({
      zip: z.string().optional(),
      street: z.string().optional(),
      number: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
    })
    .optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

const origins = ["WhatsApp", "Instagram", "Google", "Indicação", "Panfleto", "Outro"];
const serviceTypes = [
  "Dedetização",
  "Desratização",
  "Descupinização",
  "Limpeza de caixa d'água",
  "Sanitização",
  "Desentupimento",
  "Outro",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadFormModal({ open, onOpenChange }: Props) {
  const isMobile = useIsMobile();
  const createLead = useCreateLead();
  const [addressOpen, setAddressOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      companyName: "",
      origin: "WhatsApp",
      serviceType: "",
      quoteValue: "",
      notes: "",
      address: {},
    },
  });

  async function fetchCep(cep: string) {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setValue("address.street", data.logradouro || "");
        setValue("address.neighborhood", data.bairro || "");
        setValue("address.city", data.localidade || "");
        setValue("address.state", data.uf || "");
      }
    } catch {
      // silent fail
    }
  }

  function onSubmit(data: LeadFormData) {
    const addressParts = [
      data.address?.street,
      data.address?.number,
      data.address?.neighborhood,
      data.address?.city,
      data.address?.state,
    ].filter(Boolean);
    const locationStr = addressParts.length > 0 ? addressParts.join(", ") : undefined;

    const noteParts: string[] = [];
    if (data.companyName) noteParts.push(`Empresa: ${data.companyName}`);
    if (data.notes) noteParts.push(data.notes);

    createLead.mutate(
      {
        name: data.name,
        phone: data.phone || undefined,
        origin: data.origin,
        service_type: data.serviceType || undefined,
        location: locationStr,
        notes: noteParts.length > 0 ? noteParts.join("\n") : undefined,
        quote_value: data.quoteValue ? parseFloat(data.quoteValue) : undefined,
        address: data.address && Object.values(data.address).some(Boolean)
          ? data.address
          : undefined,
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      }
    );
  }

  const phoneValue = watch("phone");

  const formContent = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Column 1 */}
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Nome *</Label>
            <Input
              {...register("name")}
              placeholder="Nome do lead"
              className="text-base"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Telefone *</Label>
            <Input
              value={phoneValue}
              onChange={(e) => setValue("phone", formatPhone(e.target.value))}
              placeholder="(11) 99999-9999"
              className="text-base"
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>E-mail</Label>
            <Input
              {...register("email")}
              type="email"
              placeholder="email@exemplo.com"
              className="text-base"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Nome da Empresa</Label>
            <Input
              {...register("companyName")}
              placeholder="Opcional — para clientes PJ"
              className="text-base"
            />
          </div>
        </div>

        {/* Column 2 */}
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Origem *</Label>
            <Select
              value={watch("origin")}
              onValueChange={(v) => setValue("origin", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {origins.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Serviço solicitado *</Label>
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
              <p className="text-xs text-destructive">
                {errors.serviceType.message}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Valor estimado (R$)</Label>
            <Input
              {...register("quoteValue")}
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              className="text-base"
            />
          </div>
          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea
              {...register("notes")}
              placeholder="Detalhes do lead"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Address section */}
      <Collapsible open={addressOpen} onOpenChange={setAddressOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-primary-mid hover:underline">
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              addressOpen ? "rotate-180" : ""
            }`}
          />
          Adicionar endereço
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-3">
          <div className="space-y-1">
            <Label>CEP</Label>
            <Input
              {...register("address.zip")}
              placeholder="00000-000"
              className="text-base"
              onBlur={(e) => fetchCep(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1">
              <Label>Rua</Label>
              <Input {...register("address.street")} className="text-base" />
            </div>
            <div className="space-y-1">
              <Label>Nº</Label>
              <Input {...register("address.number")} className="text-base" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label>Bairro</Label>
              <Input
                {...register("address.neighborhood")}
                className="text-base"
              />
            </div>
            <div className="space-y-1">
              <Label>Cidade</Label>
              <Input {...register("address.city")} className="text-base" />
            </div>
            <div className="space-y-1">
              <Label>Estado</Label>
              <Input
                {...register("address.state")}
                maxLength={2}
                className="text-base"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Button
        type="submit"
        className="w-full bg-primary-mid hover:bg-primary-mid/90 text-primary-mid-foreground"
        disabled={createLead.isPending}
      >
        {createLead.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Criando...
          </>
        ) : (
          "Criar Lead"
        )}
      </Button>
    </form>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Novo Lead</SheetTitle>
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
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
