import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bug, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const steps = ["Sua conta", "Sua empresa", "Confirmação"];

export default function Registro() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // 1. Sign up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error("Falha ao criar usuário");

      // 2. Create company
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert({ name: companyName, cnpj: cnpj || null, phone: phone || null })
        .select("id")
        .single();
      if (companyError) throw companyError;

      // 3. Update profile with company_id
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ company_id: company.id, full_name: fullName, phone: phone || null })
        .eq("id", userId);
      if (profileError) throw profileError;

      toast({ title: "Conta criada!", description: "Bem-vindo ao PragaZero." });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Erro ao criar conta", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Bug className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">PragaZero</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                i <= step ? "bg-primary-mid text-primary-mid-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && <div className={`w-8 h-0.5 ${i < step ? "bg-primary-mid" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-bold text-foreground mb-1">{steps[step]}</h2>

          {step === 0 && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" required />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome da empresa</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Ex: Dedetiza Fácil" required />
              </div>
              <div className="space-y-2">
                <Label>CNPJ (opcional)</Label>
                <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-2">
                <Label>Celular</Label>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3 mt-4 text-sm">
              <p className="text-muted-foreground">Confira seus dados:</p>
              <div className="space-y-2 bg-muted/50 rounded-lg p-4">
                <p><span className="text-muted-foreground">Nome:</span> <span className="font-medium text-foreground">{fullName}</span></p>
                <p><span className="text-muted-foreground">E-mail:</span> <span className="font-medium text-foreground">{email}</span></p>
                <p><span className="text-muted-foreground">Empresa:</span> <span className="font-medium text-foreground">{companyName}</span></p>
                {cnpj && <p><span className="text-muted-foreground">CNPJ:</span> <span className="font-medium text-foreground">{cnpj}</span></p>}
                {phone && <p><span className="text-muted-foreground">Celular:</span> <span className="font-medium text-foreground">{phone}</span></p>}
              </div>
            </div>
          )}

          <div className="flex justify-between mt-6">
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
            ) : (
              <Link to="/login" className="text-sm text-primary-mid hover:underline self-center">Já tenho conta</Link>
            )}

            {step < 2 ? (
              <Button
                className="bg-primary-mid hover:bg-primary-mid/90 text-primary-mid-foreground"
                onClick={() => setStep(step + 1)}
                disabled={step === 0 && (!fullName || !email || !password)}
              >
                Próximo <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                className="bg-primary-mid hover:bg-primary-mid/90 text-primary-mid-foreground"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Criando..." : "Criar conta"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
