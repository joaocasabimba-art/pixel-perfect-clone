import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Settings, Building2, User, Users, Bell, CreditCard, Upload,
  AlertTriangle, Check, Eye, EyeOff, Trash2, Star, MapPin,
  Plus, Pencil, ToggleLeft, ToggleRight, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatPhone, formatCurrency } from "@/lib/business";

/* ─────────────────── constants ─────────────────── */
const TABS = [
  { id: "empresa", label: "Empresa", icon: Building2 },
  { id: "conta", label: "Minha conta", icon: User },
  { id: "tecnicos", label: "Técnicos", icon: Users },
  { id: "notificacoes", label: "Notificações", icon: Bell },
  { id: "plano", label: "Plano", icon: CreditCard },
];

const NOTIFICATION_GROUPS = [
  {
    title: "Leads",
    items: [
      { key: "new_lead", label: "Novo lead recebido" },
      { key: "stale_lead", label: "Lead parado há mais de 48h" },
    ],
  },
  {
    title: "Operação",
    items: [
      { key: "os_completed", label: "OS concluída pelo técnico" },
      { key: "report_ready", label: "Laudo gerado e pronto" },
      { key: "payment_overdue", label: "Pagamento pendente há +7 dias" },
    ],
  },
  {
    title: "Recorrências",
    items: [
      { key: "recurrence_15d", label: "Recorrência vencendo em 15 dias" },
      { key: "recurrence_7d", label: "Recorrência vencendo em 7 dias" },
      { key: "recurrence_overdue", label: "Recorrência vencida" },
    ],
  },
  {
    title: "Estoque",
    items: [{ key: "low_stock", label: "Produto abaixo do mínimo" }],
  },
];

const TYPE_OPTIONS = [
  { value: "dedetizacao", label: "Dedetização" },
  { value: "desratizacao", label: "Desratização" },
  { value: "descupinizacao", label: "Descupinização" },
  { value: "caixa_dagua", label: "Limpeza de caixa d'água" },
  { value: "sanitizacao", label: "Sanitização" },
  { value: "desentupimento", label: "Desentupimento" },
  { value: "outros", label: "Outros" },
];

const DEFAULT_SERVICES = [
  { name: "Dedetização Residencial", type_key: "dedetizacao", recurrence_days: 90, base_price: null },
  { name: "Desratização", type_key: "desratizacao", recurrence_days: 90, base_price: null },
  { name: "Descupinização", type_key: "descupinizacao", recurrence_days: 365, base_price: null },
  { name: "Limpeza de Caixa d'Água", type_key: "caixa_dagua", recurrence_days: 180, base_price: null },
  { name: "Sanitização", type_key: "sanitizacao", recurrence_days: 30, base_price: null },
  { name: "Desentupimento", type_key: "desentupimento", recurrence_days: null, base_price: null },
].map((s) => ({
  ...s,
  id: crypto.randomUUID(),
  description: null,
  is_active: true,
}));

/* ─────────────────── main page ─────────────────── */
export default function Configuracoes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "empresa";
  const setTab = (t: string) => setSearchParams({ tab: t }, { replace: true });
  const { user, profile } = useAuth();
  const companyId = useCompanyId();
  const qc = useQueryClient();

  const { data: company, isLoading: loadingCompany, refetch } = useQuery({
    queryKey: ["company-settings", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("*").eq("id", companyId!).single();
      return data;
    },
    enabled: !!companyId,
  });

  const { data: myProfile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  if (loadingCompany) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const isOwnerOrAdmin = profile?.role === "owner" || profile?.role === "admin";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Settings className="w-6 h-6" />
        Configurações
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        {/* Sidebar tabs – desktop */}
        <nav className="hidden md:flex flex-col gap-1">
          {TABS.map((t) => {
            if (t.id === "tecnicos" && !isOwnerOrAdmin) return null;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* Mobile tab selector */}
        <div className="md:hidden">
          <Select value={activeTab} onValueChange={setTab}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TABS.map((t) => {
                if (t.id === "tecnicos" && !isOwnerOrAdmin) return null;
                return <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        <div className="space-y-6 min-w-0">
          {activeTab === "empresa" && <TabEmpresa company={company} companyId={companyId!} refetch={refetch} />}
          {activeTab === "conta" && <TabConta profile={myProfile} userId={user?.id!} email={user?.email || ""} />}
          {activeTab === "tecnicos" && isOwnerOrAdmin && <TabTecnicos companyId={companyId!} currentUserId={user?.id!} />}
          {activeTab === "notificacoes" && <TabNotificacoes company={company} companyId={companyId!} />}
          {activeTab === "plano" && <TabPlano company={company} companyId={companyId!} userEmail={user?.email || ""} />}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   TAB EMPRESA — Address + RT CRUD + Services CRUD
══════════════════════════════════════════════════ */
function TabEmpresa({ company, companyId, refetch }: { company: any; companyId: string; refetch: () => void }) {
  const qc = useQueryClient();
  const settings = company?.settings || {};

  /* ── basic company form ── */
  const addressRaw = (typeof company?.address === "object" && company?.address !== null)
    ? company.address as Record<string, string>
    : {};

  const [form, setForm] = useState({
    name: company?.name || "",
    cnpj: company?.cnpj || "",
    phone: company?.phone || "",
    address: {
      zip: addressRaw.zip || "",
      street: addressRaw.street || "",
      number: addressRaw.number || "",
      complement: addressRaw.complement || "",
      neighborhood: addressRaw.neighborhood || "",
      city: addressRaw.city || "",
      state: addressRaw.state || "",
    },
  });
  const [uploading, setUploading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const logoUrl = settings.logo_url;
  const fileRef = useRef<HTMLInputElement>(null);

  const saveBasic = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("companies").update({
        name: form.name,
        cnpj: form.cnpj,
        phone: form.phone,
        address: {
          zip: form.address.zip,
          street: form.address.street,
          number: form.address.number,
          complement: form.address.complement || null,
          neighborhood: form.address.neighborhood || null,
          city: form.address.city,
          state: form.address.state,
        },
      } as any).eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dados da empresa salvos!");
      qc.invalidateQueries({ queryKey: ["company-settings"] });
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  async function fetchCEP(cep: string) {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((f) => ({
          ...f,
          address: {
            ...f.address,
            street: data.logradouro || "",
            neighborhood: data.bairro || "",
            city: data.localidade || "",
            state: data.uf || "",
          },
        }));
      }
    } catch { /* silent */ } finally {
      setCepLoading(false);
    }
  }

  const uploadLogo = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) { toast.error("Máximo 2MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${companyId}/logo.${ext}`;
    const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (error) { toast.error("Erro ao enviar logo"); setUploading(false); return; }
    const { data } = supabase.storage.from("logos").getPublicUrl(path);
    await supabase.from("companies").update({
      settings: { ...settings, logo_url: data.publicUrl },
    }).eq("id", companyId);
    toast.success("Logo atualizada!");
    qc.invalidateQueries({ queryKey: ["company-settings"] });
    setUploading(false);
  };

  function setAddr(key: string, val: string) {
    setForm((f) => ({ ...f, address: { ...f.address, [key]: val } }));
  }

  return (
    <div className="space-y-6">
      {/* Logo */}
      <Card>
        <CardHeader><CardTitle className="text-base">Logo da empresa</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
              {logoUrl
                ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                : <span className="text-2xl font-bold text-muted-foreground">{(company?.name || "E")[0].toUpperCase()}</span>
              }
            </div>
            <div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
              <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />{uploading ? "Enviando..." : "Enviar logo"}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG ou WEBP · Máx 2MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic data */}
      <Card>
        <CardHeader><CardTitle className="text-base">Dados da empresa</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome da empresa *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="CNPJ" value={form.cnpj} onChange={(v) => setForm({ ...form, cnpj: v })} placeholder="00.000.000/0000-00" />
            <Field label="Telefone comercial" value={form.phone} onChange={(v) => setForm({ ...form, phone: formatPhone(v) })} />
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Endereço da Empresa
          </CardTitle>
          <CardDescription className="text-xs">
            Endereço usado nos laudos e propostas emitidos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CEP</Label>
              <Input
                value={form.address.zip}
                placeholder="00000-000"
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 8);
                  const masked = v.length > 5 ? `${v.slice(0, 5)}-${v.slice(5)}` : v;
                  setAddr("zip", masked);
                  if (v.length === 8) fetchCEP(v);
                }}
              />
              {cepLoading && <p className="text-xs text-muted-foreground">Buscando CEP...</p>}
            </div>
            <Field label="Estado (UF)" value={form.address.state} onChange={(v) => setAddr("state", v.toUpperCase().slice(0, 2))} placeholder="SP" />
          </div>
          <Field label="Rua / Logradouro" value={form.address.street} onChange={(v) => setAddr("street", v)} placeholder="Avenida Paulista" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Número" value={form.address.number} onChange={(v) => setAddr("number", v)} placeholder="1000" />
            <Field label="Complemento" value={form.address.complement} onChange={(v) => setAddr("complement", v)} placeholder="Sala 42" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Bairro" value={form.address.neighborhood} onChange={(v) => setAddr("neighborhood", v)} placeholder="Bela Vista" />
            <Field label="Cidade *" value={form.address.city} onChange={(v) => setAddr("city", v)} placeholder="São Paulo" />
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4">
        <Button onClick={() => saveBasic.mutate()} disabled={saveBasic.isPending} className="w-full md:w-auto">
          {saveBasic.isPending ? "Salvando..." : "Salvar dados da empresa"}
        </Button>
      </div>

      <Separator />

      {/* Responsible Technicians CRUD */}
      <TabRTs company={company} companyId={companyId} refetch={refetch} />

      <Separator />

      {/* Services Catalog CRUD */}
      <TabServiceCatalog company={company} companyId={companyId} refetch={refetch} />
    </div>
  );
}

/* ══════════════════════════════════════════════════
   RESPONSÁVEIS TÉCNICOS CRUD
══════════════════════════════════════════════════ */
interface RT {
  id: string;
  name: string;
  registry: string;
  specialty: string | null;
  is_default: boolean;
  is_active: boolean;
}

function TabRTs({ company, companyId, refetch }: { company: any; companyId: string; refetch: () => void }) {
  const settings = company?.settings || {};
  const [rts, setRTs] = useState<RT[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RT | null>(null);

  /* Load / migrate legacy RT data */
  useEffect(() => {
    const existing = settings.responsible_technicians;
    if (Array.isArray(existing) && existing.length > 0) {
      setRTs(existing);
    } else if (settings.responsible_tech && !(Array.isArray(existing) && existing.length > 0)) {
      // Migrate legacy single-RT format
      const migrated: RT[] = [{
        id: crypto.randomUUID(),
        name: settings.responsible_tech,
        registry: settings.rt_registry || "",
        specialty: null,
        is_default: true,
        is_active: true,
      }];
      setRTs(migrated);
      saveRTs(migrated);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  async function saveRTs(updated: RT[]) {
    const defaultRT = updated.find((r) => r.is_default);
    await supabase.from("companies").update({
      responsible_tech: defaultRT?.name ?? null,
      crq_crea: defaultRT?.registry ?? null,
      settings: {
        ...settings,
        responsible_technicians: updated,
        responsible_tech: defaultRT?.name ?? null,
        rt_registry: defaultRT?.registry ?? null,
      },
    }).eq("id", companyId);
    setRTs(updated);
    refetch();
  }

  function handleSaveRT(data: Omit<RT, "id" | "is_default" | "is_active">) {
    if (editTarget) {
      const updated = rts.map((r) => r.id === editTarget.id ? { ...r, ...data } : r);
      saveRTs(updated);
    } else {
      const newRT: RT = {
        id: crypto.randomUUID(),
        ...data,
        is_default: rts.length === 0,
        is_active: true,
      };
      saveRTs([...rts, newRT]);
    }
    toast.success("Responsável técnico salvo!");
    setModalOpen(false);
    setEditTarget(null);
  }

  function setDefaultRT(id: string) {
    saveRTs(rts.map((r) => ({ ...r, is_default: r.id === id })));
    toast.success("RT padrão atualizado!");
  }

  function removeRT(id: string) {
    const rt = rts.find((r) => r.id === id);
    if (rt?.is_default) {
      toast.error("Defina outro RT como padrão antes de remover este.");
      return;
    }
    saveRTs(rts.filter((r) => r.id !== id));
    toast.success("RT removido.");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Responsáveis Técnicos</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            O RT padrão aparece em todos os laudos. Você pode trocar por serviço na OS.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => { setEditTarget(null); setModalOpen(true); }}
        >
          <Plus className="w-4 h-4 mr-1" /> Adicionar RT
        </Button>
      </div>

      {rts.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nenhum RT cadastrado. Adicione o responsável técnico da empresa.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {rts.map((rt) => (
          <Card key={rt.id} className={rt.is_default ? "border-primary/40 bg-primary/5" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {rt.name[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground">{rt.name}</p>
                      {rt.is_default && (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-300 border text-[10px] px-1.5 py-0.5">
                          <Star className="w-2.5 h-2.5 mr-0.5" />Padrão
                        </Badge>
                      )}
                      {!rt.is_active && (
                        <Badge variant="outline" className="text-muted-foreground text-[10px] px-1.5 py-0.5">Inativo</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{rt.registry}</p>
                    {rt.specialty && <p className="text-xs text-muted-foreground">{rt.specialty}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!rt.is_default && (
                    <Button
                      size="sm" variant="ghost" className="h-8 px-2 text-xs"
                      onClick={() => setDefaultRT(rt.id)}
                      title="Definir como padrão"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    size="sm" variant="ghost" className="h-8 px-2"
                    onClick={() => { setEditTarget(rt); setModalOpen(true); }}
                    title="Editar"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  {!rt.is_default && (
                    <Button
                      size="sm" variant="ghost" className="h-8 px-2 text-destructive hover:text-destructive"
                      onClick={() => removeRT(rt.id)}
                      title="Remover"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <RTModal
        open={modalOpen}
        onOpenChange={(open) => { setModalOpen(open); if (!open) setEditTarget(null); }}
        initial={editTarget}
        onSave={handleSaveRT}
      />
    </div>
  );
}

function RTModal({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: RT | null;
  onSave: (data: Omit<RT, "id" | "is_default" | "is_active">) => void;
}) {
  const [form, setForm] = useState({ name: "", registry: "", specialty: "" });

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({ name: initial.name, registry: initial.registry, specialty: initial.specialty || "" });
      } else {
        setForm({ name: "", registry: "", specialty: "" });
      }
    }
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar RT" : "Novo Responsável Técnico"}</DialogTitle>
          <DialogDescription>Preencha os dados do responsável técnico.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Nome completo *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Registro (CRQ/CREA) *" value={form.registry} onChange={(v) => setForm({ ...form, registry: v })} placeholder="ex: CRQ-04 12345" />
          <Field label="Especialidade" value={form.specialty} onChange={(v) => setForm({ ...form, specialty: v })} placeholder="ex: Engenheiro Agrônomo" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => {
              if (!form.name.trim() || !form.registry.trim()) { toast.error("Nome e registro são obrigatórios"); return; }
              onSave({ name: form.name, registry: form.registry, specialty: form.specialty || null });
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════
   CATÁLOGO DE SERVIÇOS CRUD
══════════════════════════════════════════════════ */
interface CatalogService {
  id: string;
  name: string;
  type_key: string;
  description: string | null;
  recurrence_days: number | null;
  base_price: number | null;
  is_active: boolean;
}

function TabServiceCatalog({ company, companyId, refetch }: { company: any; companyId: string; refetch: () => void }) {
  const settings = company?.settings || {};
  const [catalog, setCatalog] = useState<CatalogService[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CatalogService | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const existing = settings.service_catalog;
    if (Array.isArray(existing) && existing.length > 0) {
      setCatalog(existing);
    } else if (Array.isArray(existing) && existing.length === 0) {
      // Seed defaults if explicitly empty array
      saveCatalog(DEFAULT_SERVICES);
    } else if (!existing) {
      // First time: seed defaults
      saveCatalog(DEFAULT_SERVICES);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  async function saveCatalog(updated: CatalogService[]) {
    const recurrenceDefaults = Object.fromEntries(
      updated.filter((s) => s.recurrence_days).map((s) => [s.type_key, s.recurrence_days])
    );
    const { error } = await supabase.from("companies").update({
      settings: {
        ...settings,
        service_catalog: updated,
        recurrence_defaults: recurrenceDefaults,
      },
    }).eq("id", companyId);
    if (error) { toast.error("Erro ao salvar catálogo"); return; }
    setCatalog(updated);
    refetch();
  }

  function handleSaveService(data: Omit<CatalogService, "id" | "is_active">) {
    if (editTarget) {
      const updated = catalog.map((s) => s.id === editTarget.id ? { ...s, ...data } : s);
      saveCatalog(updated);
    } else {
      const newService: CatalogService = { id: crypto.randomUUID(), ...data, is_active: true };
      saveCatalog([...catalog, newService]);
    }
    toast.success("Serviço salvo!");
    setModalOpen(false);
    setEditTarget(null);
  }

  function toggleActive(id: string) {
    const updated = catalog.map((s) => s.id === id ? { ...s, is_active: !s.is_active } : s);
    saveCatalog(updated);
  }

  function removeService(id: string) {
    saveCatalog(catalog.filter((s) => s.id !== id));
    toast.success("Serviço removido do catálogo.");
    setDeleteConfirmId(null);
  }

  const typeLabel = (key: string) => TYPE_OPTIONS.find((t) => t.value === key)?.label ?? key;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Serviços Oferecidos</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Seus serviços cadastrados aparecem no seletor ao criar leads, OS e propostas.
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditTarget(null); setModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Adicionar Serviço
        </Button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Recorrência</TableHead>
              <TableHead>Preço base</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {catalog.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                  Nenhum serviço cadastrado
                </TableCell>
              </TableRow>
            ) : catalog.map((s) => (
              <TableRow key={s.id} className={!s.is_active ? "opacity-60" : ""}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{typeLabel(s.type_key)}</TableCell>
                <TableCell>{s.recurrence_days ? `${s.recurrence_days} dias` : "—"}</TableCell>
                <TableCell>{s.base_price ? formatCurrency(s.base_price) : "—"}</TableCell>
                <TableCell>
                  {s.is_active
                    ? <Badge className="bg-green-100 text-green-700 border-green-300 border text-xs">Ativo</Badge>
                    : <Badge variant="outline" className="text-muted-foreground text-xs">Inativo</Badge>
                  }
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => toggleActive(s.id)} title={s.is_active ? "Desativar" : "Ativar"}>
                      {s.is_active ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setEditTarget(s); setModalOpen(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-destructive hover:text-destructive" onClick={() => setDeleteConfirmId(s.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {catalog.map((s) => (
          <Card key={s.id} className={!s.is_active ? "opacity-60" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{typeLabel(s.type_key)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {s.recurrence_days ? `${s.recurrence_days} dias` : "Sem recorrência"}
                    {s.base_price ? ` · ${formatCurrency(s.base_price)}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => toggleActive(s.id)}>
                    {s.is_active ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setEditTarget(s); setModalOpen(true); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-destructive" onClick={() => setDeleteConfirmId(s.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Service modal */}
      <ServiceModal
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditTarget(null); }}
        initial={editTarget}
        onSave={handleSaveService}
      />

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(v) => !v && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover serviço</DialogTitle>
            <DialogDescription>
              O serviço será removido do catálogo. OS e laudos existentes não serão afetados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && removeService(deleteConfirmId)}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ServiceModal({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: CatalogService | null;
  onSave: (data: Omit<CatalogService, "id" | "is_active">) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    type_key: "dedetizacao",
    description: "",
    recurrence_days: "",
    base_price: "",
  });

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          name: initial.name,
          type_key: initial.type_key,
          description: initial.description || "",
          recurrence_days: initial.recurrence_days != null ? String(initial.recurrence_days) : "",
          base_price: initial.base_price != null ? String(initial.base_price) : "",
        });
      } else {
        setForm({ name: "", type_key: "dedetizacao", description: "", recurrence_days: "", base_price: "" });
      }
    }
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome do serviço *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="ex: Dedetização Residencial" />
            <div className="space-y-2">
              <Label>Tipo / Categoria *</Label>
              <Select value={form.type_key} onValueChange={(v) => setForm({ ...form, type_key: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Preço base (R$)</Label>
              <Input
                type="number" min="0" step="0.01" placeholder="0,00"
                value={form.base_price}
                onChange={(e) => setForm({ ...form, base_price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Recorrência (dias)</Label>
              <Input
                type="number" min="0" placeholder="ex: 90"
                value={form.recurrence_days}
                onChange={(e) => setForm({ ...form, recurrence_days: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição / O que está incluso</Label>
            <Textarea
              rows={3} placeholder="Descreva o que está incluso no serviço..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => {
              if (!form.name.trim()) { toast.error("Nome do serviço é obrigatório"); return; }
              onSave({
                name: form.name,
                type_key: form.type_key,
                description: form.description || null,
                recurrence_days: form.recurrence_days ? Number(form.recurrence_days) : null,
                base_price: form.base_price ? Number(form.base_price) : null,
              });
            }}
          >
            Salvar serviço
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════
   TAB MINHA CONTA
══════════════════════════════════════════════════ */
function TabConta({ profile, userId, email }: { profile: any; userId: string; email: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ full_name: profile?.full_name || "", phone: profile?.phone || "" });
  const [pw, setPw] = useState({ newPassword: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const saveProfile = useMutation({
    mutationFn: async () => {
      await supabase.from("profiles").update({ full_name: form.full_name, phone: form.phone }).eq("id", userId);
    },
    onSuccess: () => { toast.success("Perfil salvo!"); qc.invalidateQueries({ queryKey: ["my-profile"] }); },
    onError: () => toast.error("Erro ao salvar"),
  });

  const changePassword = async () => {
    if (pw.newPassword.length < 8) { toast.error("Mínimo 8 caracteres"); return; }
    if (pw.newPassword !== pw.confirm) { toast.error("Senhas não conferem"); return; }
    const { error } = await supabase.auth.updateUser({ password: pw.newPassword });
    if (error) { toast.error(error.message); return; }
    toast.success("Senha alterada!");
    setPw({ newPassword: "", confirm: "" });
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== "EXCLUIR") return;
    await supabase.auth.signOut();
    toast.success("Conta desativada.");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Dados pessoais</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome completo *" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
            <Field label="Telefone celular" value={form.phone} onChange={(v) => setForm({ ...form, phone: formatPhone(v) })} />
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={email} readOnly className="bg-muted" />
            </div>
          </div>
          <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
            {saveProfile.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Alterar senha</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"} value={pw.newPassword}
                  onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
                  placeholder="Mínimo 8 caracteres"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirmar senha</Label>
              <Input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            </div>
          </div>
          <Button variant="outline" onClick={changePassword} disabled={!pw.newPassword}>Alterar senha</Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Zona de perigo</CardTitle>
          <CardDescription>Esta ação é irreversível. Seu acesso será removido.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="text-destructive border-destructive/30" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="w-4 h-4 mr-2" /> Excluir minha conta
          </Button>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir conta</DialogTitle>
            <DialogDescription>Digite EXCLUIR para confirmar.</DialogDescription>
          </DialogHeader>
          <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="EXCLUIR" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" disabled={deleteConfirm !== "EXCLUIR"} onClick={deleteAccount}>Confirmar exclusão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   TAB TÉCNICOS
══════════════════════════════════════════════════ */
function TabTecnicos({ companyId, currentUserId }: { companyId: string; currentUserId: string }) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", full_name: "", phone: "", role: "technician" });

  const { data: technicians, isLoading } = useQuery({
    queryKey: ["technicians", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("company_id", companyId).order("full_name");
      return data || [];
    },
    enabled: !!companyId,
  });

  const roleBadge: Record<string, { label: string; className: string }> = {
    owner: { label: "Proprietário 🔒", className: "bg-primary text-primary-foreground" },
    admin: { label: "Admin", className: "bg-primary-mid text-primary-mid-foreground" },
    technician: { label: "Técnico", className: "bg-muted text-muted-foreground" },
  };

  const sendInvite = async () => {
    if (!inviteForm.email || !inviteForm.full_name) { toast.error("Preencha nome e e-mail"); return; }
    const { error } = await supabase.auth.signInWithOtp({
      email: inviteForm.email,
      options: { emailRedirectTo: window.location.origin + "/login" },
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Convite enviado para ${inviteForm.email}!`);
    setInviteOpen(false);
    setInviteForm({ email: "", full_name: "", phone: "", role: "technician" });
  };

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Equipe</h2>
        <Button size="sm" onClick={() => setInviteOpen(true)}>
          <Users className="w-4 h-4 mr-2" /> Convidar técnico
        </Button>
      </div>

      <div className="space-y-3">
        {technicians?.map((t: any) => {
          const rb = roleBadge[t.role] || roleBadge.technician;
          return (
            <Card key={t.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {(t.full_name || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{t.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{t.phone || "Sem telefone"}</p>
                </div>
                <Badge className={`${rb.className} border-0 text-xs`}>{rb.label}</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar técnico</DialogTitle>
            <DialogDescription>Enviaremos um link de acesso por e-mail.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Nome *" value={inviteForm.full_name} onChange={(v) => setInviteForm({ ...inviteForm, full_name: v })} />
            <Field label="E-mail *" value={inviteForm.email} onChange={(v) => setInviteForm({ ...inviteForm, email: v })} />
            <Field label="Celular" value={inviteForm.phone} onChange={(v) => setInviteForm({ ...inviteForm, phone: formatPhone(v) })} />
            <div className="space-y-2">
              <Label>Função</Label>
              <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="technician">Técnico</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={sendInvite}>Enviar convite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   TAB NOTIFICAÇÕES
══════════════════════════════════════════════════ */
function TabNotificacoes({ company, companyId }: { company: any; companyId: string }) {
  const qc = useQueryClient();
  const settings = company?.settings || {};
  const notifications = settings.notifications || {};

  const toggle = async (key: string, value: boolean) => {
    const updated = { ...settings, notifications: { ...notifications, [key]: value } };
    await supabase.from("companies").update({ settings: updated }).eq("id", companyId);
    qc.invalidateQueries({ queryKey: ["company-settings"] });
  };

  return (
    <div className="space-y-6">
      {NOTIFICATION_GROUPS.map((group) => (
        <Card key={group.title}>
          <CardHeader><CardTitle className="text-base">{group.title}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {group.items.map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{item.label}</span>
                <Switch checked={notifications[item.key] ?? false} onCheckedChange={(v) => toggle(item.key, v)} />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   TAB PLANO
══════════════════════════════════════════════════ */
function TabPlano({ company, companyId, userEmail }: { company: any; companyId: string; userEmail: string }) {
  const plan = company?.settings?.plan || "trial";
  const trialEnds = company?.settings?.trial_ends || company?.created_at;
  const daysLeft = trialEnds
    ? Math.max(0, Math.ceil((new Date(trialEnds).getTime() + 14 * 86400000 - Date.now()) / 86400000))
    : 14;

  const subscribe = (planName: string) => {
    const msg = `Olá! Quero assinar o PragaZero plano ${planName}.\nEmpresa: ${company?.name}\nE-mail: ${userEmail}`;
    window.open(`https://wa.me/5511999999999?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {plan === "trial" && (
        <Card className="border-warning/30 bg-warning-light">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="font-semibold text-foreground">Seu período de teste termina em {daysLeft} dias</p>
              <p className="text-sm text-muted-foreground">Assine agora e não perca o acesso!</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Essencial</CardTitle>
            <CardDescription>R$ 69/mês ou R$ 59 anual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {["CRM de leads", "Agenda", "OS digital", "Histórico", "Até 3 usuários"].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-success" /> {f}</div>
            ))}
            <Button variant="outline" className="w-full mt-4" onClick={() => subscribe("Essencial")}>Assinar Essencial</Button>
          </CardContent>
        </Card>

        <Card className="border-primary ring-2 ring-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Completo</CardTitle>
              <Star className="w-4 h-4 text-warning fill-warning" />
            </div>
            <CardDescription>R$ 99/mês ou R$ 84 anual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {["Tudo do Essencial", "Laudos automáticos", "Alertas de recorrência", "Usuários ilimitados", "Suporte prioritário"].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-success" /> {f}</div>
            ))}
            <Button className="w-full mt-4" onClick={() => subscribe("Completo")}>Assinar Completo</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════ */
function Field({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
