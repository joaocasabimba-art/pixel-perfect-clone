import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bug, ShieldCheck, RotateCcw, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const benefits = [
  { icon: ShieldCheck, text: "Nunca perca um orçamento" },
  { icon: RotateCcw, text: "Clientes voltam sozinhos" },
  { icon: FileCheck, text: "Laudo em 1 clique" },
];

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-center px-12 xl:px-20">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary-mid flex items-center justify-center">
            <Bug className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-extrabold text-primary-foreground">PragaZero</h1>
        </div>
        <p className="text-xl text-primary-light font-medium mb-10 leading-relaxed">
          Do lead ao laudo, sem papel<br />e sem esquecimento.
        </p>
        <div className="space-y-6">
          {benefits.map((b, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary-mid/30 flex items-center justify-center">
                <b.icon className="w-5 h-5 text-primary-light" />
              </div>
              <span className="text-primary-foreground/90 text-base">{b.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-card">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Bug className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-extrabold text-foreground">PragaZero</h1>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">Entrar</h2>
          <p className="text-muted-foreground mb-6">Acesse sua conta para continuar</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full bg-primary-mid hover:bg-primary-mid/90 text-primary-mid-foreground" disabled={submitting}>
              {submitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/registro" className="text-sm text-primary-mid hover:underline font-medium">
              Criar conta grátis por 14 dias
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
