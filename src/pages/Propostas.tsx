import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Send, Check, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useProposals, useCreateProposal } from "@/hooks/useProposals";
import { formatCurrency, formatDateBR } from "@/lib/business";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-muted text-muted-foreground border-0" },
  sent: { label: "Enviada", className: "bg-blue-100 text-blue-800 border-0" },
  accepted: { label: "Aceita", className: "bg-green-100 text-green-800 border-0" },
  rejected: { label: "Recusada", className: "bg-red-100 text-red-800 border-0" },
};

const TABS = [
  { key: "all", label: "Todas" },
  { key: "draft", label: "Rascunhos" },
  { key: "sent", label: "Enviadas" },
  { key: "accepted", label: "Aceitas" },
  { key: "rejected", label: "Recusadas" },
];

export default function Propostas() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const { data: proposals, isLoading } = useProposals({ status: statusFilter, search });
  const createProposal = useCreateProposal();

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const result = await createProposal.mutateAsync({ title: newTitle });
    setNewOpen(false);
    setNewTitle("");
    if (result?.id) navigate(`/propostas/${result.id}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Propostas</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              statusFilter === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar proposta..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List */}
      {(!proposals || proposals.length === 0) ? (
        <EmptyState
          icon="📋"
          title="Nenhuma proposta"
          description="Crie sua primeira proposta comercial"
          action={{ label: "Nova Proposta", onClick: () => setNewOpen(true) }}
        />
      ) : (
        <div className="space-y-3">
          {proposals.map((p) => {
            const st = STATUS_CONFIG[p.status] || STATUS_CONFIG.draft;
            return (
              <Card
                key={p.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/propostas/${p.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          PROP-{String(p.number).padStart(4, "0")}
                        </span>
                        <Badge className={st.className}>{st.label}</Badge>
                      </div>
                      <p className="font-semibold text-foreground truncate">{p.title}</p>
                      <p className="text-sm text-muted-foreground">{p.client?.name || "Sem cliente"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {p.total_value ? formatCurrency(Number(p.total_value)) : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDateBR(p.created_at)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Proposal Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Proposta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Título da proposta"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button className="w-full" onClick={handleCreate} disabled={createProposal.isPending || !newTitle.trim()}>
              {createProposal.isPending ? "Criando..." : "Criar proposta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* FAB */}
      <Button
        onClick={() => setNewOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-6 w-14 h-14 rounded-full shadow-lg bg-primary-mid hover:bg-primary-mid/90 text-primary-mid-foreground z-30"
        size="icon"
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  );
}
