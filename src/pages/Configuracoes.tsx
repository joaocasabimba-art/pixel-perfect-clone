import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Settings, Building2, User, Users, Bell, CreditCard, Upload, X, AlertTriangle,
  Check, Copy, Eye, EyeOff, Trash2, ChevronRight, Star, MessageCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatPhone, whatsappLink } from "@/lib/business";

const TABS = [
  { id: "empresa", label: "Empresa", icon: Building2 },
  { id: "conta", label: "Minha conta", icon: User },
  { id: "tecnicos", label: "Técnicos", icon: Users },
  { id: "notificacoes", label: "Notificações", icon: Bell },
  { id: "plano", label: "Plano", icon: CreditCard },
];

const SERVICE_OPTIONS = [
  "Dedetização", "Desratização", "Descupinização",
  "Limpeza de caixa d'água", "Sanitização", "Desentupimento",
  "Controle de pombos", "Outro",
];

const DEFAULT_RECURRENCES: Record<string, number> = {
  "Limpeza de caixa d'água": 180,
  "Dedetização": 90,
  "Desratização": 90,
  "Descupinização": 365,
  "Sanitização": 30,
  "Desentupimento": 0,
};

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
    items: [
      { key: "low_stock", label: "Produto abaixo do mínimo" },
    ],
  },
];

export default function Configuracoes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "empresa";
  const setTab = (t: string) => setSearchParams({ tab: t }, { replace: true });
  const { user, profile } = useAuth();
  const companyId = useCompanyId();
  const qc = useQueryClient();

  const { data: company, isLoading: loadingCompany } = useQuery({
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
        {/* Sidebar tabs - desktop */}
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
                return (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        <div className="space-y-6 min-w-0">
          {activeTab === "empresa" && <TabEmpresa company={company} companyId={companyId!} />}
          {activeTab === "conta" && <TabConta profile={myProfile} userId={user?.id!} email={user?.email || ""} />}
          {activeTab === "tecnicos" && isOwnerOrAdmin && <TabTecnicos companyId={companyId!} currentUserId={user?.id!} />}
          {activeTab === "notificacoes" && <TabNotificacoes company={company} companyId={companyId!} />}
          {activeTab === "plano" && <TabPlano company={company} companyId={companyId!} userEmail={user?.email || ""} />}
        </div>
      </div>
    </div>
  );
}

/* ========== TAB EMPRESA ========== */
function TabEmpresa({ company, companyId }: { company: any; companyId: string }) {
  const qc = useQueryClient();
  const settings = company?.settings || {};
  const [form, setForm] = useState({
    name: company?.name || "",
    cnpj: company?.cnpj || "",
    phone: company?.phone || "",
    responsible_tech: company?.responsible_tech || settings.responsible_tech || "",
    crq_crea: company?.crq_crea || settings.rt_registry || "",
    specialty: settings.specialty || "",
    services: settings.services || [],
    recurrence_defaults: { ...DEFAULT_RECURRENCES, ...(settings.recurrence_defaults || {}) },
  });
  const [uploading, setUploading] = useState(false);
  const logoUrl = settings.logo_url;
  const fileRef = useRef<HTMLInputElement>(null);

  const save = useMutation({
    mutationFn: async () => {
      await supabase.from("companies").update({
        name: form.name,
        cnpj: form.cnpj,
        phone: form.phone,
        responsible_tech: form.responsible_tech,
        crq_crea: form.crq_crea,
        settings: {
          ...settings,
          responsible_tech: form.responsible_tech,
          rt_registry: form.crq_crea,
          specialty: form.specialty,
          services: form.services,
          recurrence_defaults: form.recurrence_defaults,
        },
      }).eq("id", companyId);
    },
    onSuccess: () => {
      toast.success("Configurações salvas!");
      qc.invalidateQueries({ queryKey: ["company-settings"] });
    },
    onError: () => toast.error("Erro ao salvar"),
  });

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

  const toggleService = (s: string) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(s)
        ? prev.services.filter((x: string) => x !== s)
        : [...prev.services, s],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Logo */}
      <Card>
        <CardHeader><CardTitle className="text-base">Logo da empresa</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">
                  {(company?.name || "E")[0].toUpperCase()}
                </span>
              )}
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

      {/* Company data */}
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

      {/* RT */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Responsável Técnico (RT)</CardTitle>
          <CardDescription className="flex items-center gap-2 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
            Estes dados aparecem em todos os laudos emitidos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome do RT *" value={form.responsible_tech} onChange={(v) => setForm({ ...form, responsible_tech: v })} />
            <Field label="Registro CRQ / CREA *" value={form.crq_crea} onChange={(v) => setForm({ ...form, crq_crea: v })} />
            <Field label="Especialidade" value={form.specialty} onChange={(v) => setForm({ ...form, specialty: v })} placeholder="ex: Engenheiro Agrônomo" />
          </div>
        </CardContent>
      </Card>

      {/* Services offered */}
      <Card>
        <CardHeader><CardTitle className="text-base">Serviços oferecidos</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {SERVICE_OPTIONS.map((s) => (
              <label key={s} className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={form.services.includes(s)} onCheckedChange={() => toggleService(s)} />
                {s}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recurrence defaults */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recorrências padrão (dias)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(form.recurrence_defaults).map(([service, days]) => (
              <div key={service} className="flex items-center justify-between gap-4">
                <span className="text-sm text-foreground">{service}</span>
                <Input
                  type="number"
                  className="w-24 text-center"
                  value={days as number}
                  onChange={(e) => setForm({
                    ...form,
                    recurrence_defaults: { ...form.recurrence_defaults, [service]: Number(e.target.value) },
                  })}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4">
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full md:w-auto">
          {save.isPending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}

/* ========== TAB MINHA CONTA ========== */
function TabConta({ profile, userId, email }: { profile: any; userId: string; email: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
  });
  const [pw, setPw] = useState({ newPassword: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const saveProfile = useMutation({
    mutationFn: async () => {
      await supabase.from("profiles").update({
        full_name: form.full_name,
        phone: form.phone,
      }).eq("id", userId);
    },
    onSuccess: () => {
      toast.success("Perfil salvo!");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
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
                  type={showPw ? "text" : "password"}
                  value={pw.newPassword}
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

/* ========== TAB TÉCNICOS ========== */
function TabTecnicos({ companyId, currentUserId }: { companyId: string; currentUserId: string }) {
  const qc = useQueryClient();
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

/* ========== TAB NOTIFICAÇÕES ========== */
function TabNotificacoes({ company, companyId }: { company: any; companyId: string }) {
  const qc = useQueryClient();
  const settings = company?.settings || {};
  const notifications = settings.notifications || {};

  const toggle = async (key: string, value: boolean) => {
    const updated = {
      ...settings,
      notifications: { ...notifications, [key]: value },
    };
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
                <Switch
                  checked={notifications[item.key] ?? false}
                  onCheckedChange={(v) => toggle(item.key, v)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ========== TAB PLANO ========== */
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
              <p className="font-semibold text-foreground">
                Seu período de teste termina em {daysLeft} dias
              </p>
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
              <div key={f} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-success" /> {f}
              </div>
            ))}
            <Button variant="outline" className="w-full mt-4" onClick={() => subscribe("Essencial")}>
              Assinar Essencial
            </Button>
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
              <div key={f} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-success" /> {f}
              </div>
            ))}
            <Button className="w-full mt-4" onClick={() => subscribe("Completo")}>
              Assinar Completo
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ========== HELPERS ========== */
function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
