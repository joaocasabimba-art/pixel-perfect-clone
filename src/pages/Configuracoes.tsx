import { Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function Configuracoes() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Settings className="w-6 h-6" />
        Configurações
      </h1>

      <Tabs defaultValue="empresa">
        <TabsList className="bg-muted">
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="conta">Minha conta</TabsTrigger>
          <TabsTrigger value="tecnicos">Técnicos</TabsTrigger>
          <TabsTrigger value="plano">Plano</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados da empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da empresa</Label>
                  <Input placeholder="Dedetiza Fácil" />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input placeholder="00.000.000/0000-00" />
                </div>
                <div className="space-y-2">
                  <Label>Responsável Técnico</Label>
                  <Input placeholder="Nome do RT" />
                </div>
                <div className="space-y-2">
                  <Label>CRQ / CREA</Label>
                  <Input placeholder="Registro" />
                </div>
              </div>
              <Button className="bg-primary-mid hover:bg-primary-mid/90 text-primary-mid-foreground">Salvar</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conta">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Minha conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input placeholder="Seu nome" />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input type="email" placeholder="seu@email.com" />
                </div>
                <div className="space-y-2">
                  <Label>Celular</Label>
                  <Input type="tel" placeholder="(11) 99999-9999" />
                </div>
              </div>
              <Button className="bg-primary-mid hover:bg-primary-mid/90 text-primary-mid-foreground">Salvar</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tecnicos">
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Gerencie seus técnicos aqui. Funcionalidade em breve.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plano">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Seu plano</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Badge className="bg-primary-light text-primary-mid border-0">Trial</Badge>
                <span className="text-sm text-muted-foreground">14 dias restantes</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Badge({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`} {...props}>{children}</div>;
}
