import { useState } from "react";
import { FileText, Search, MessageCircle, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { EmptyState } from "@/components/EmptyState";
import { formatDateBR } from "@/lib/business";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-gray-100 text-gray-600 border-0" },
  signed: { label: "Assinado", className: "bg-blue-100 text-blue-800 border-0" },
  sent: { label: "Enviado", className: "bg-green-100 text-green-800 border-0" },
};

function validityBadge(validUntil: string) {
  const days = Math.ceil(
    (new Date(validUntil).getTime() - Date.now()) / 86400000
  );
  if (days < 0) return { label: "Vencido", className: "bg-red-100 text-red-700 border-0" };
  if (days <= 30) return { label: `${days} dias`, className: "bg-amber-100 text-amber-700 border-0" };
  return { label: "OK", className: "bg-green-100 text-green-700 border-0" };
}

export default function Laudos() {
  const companyId = useCompanyId();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("reports")
        .select(`
          *,
          client:clients(name, phone),
          tech:profiles!reports_tech_id_fkey(full_name),
          service:services(service_type, completed_at)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const filtered = (reports ?? []).filter((r: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.client?.name?.toLowerCase().includes(s);
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 flex-1" />
        </div>
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Laudos</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="signed">Assinado</SelectItem>
            <SelectItem value="sent">Enviado</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="📄"
          title="Nenhum laudo encontrado"
          description="Laudos são gerados a partir de ordens de serviço concluídas"
        />
      ) : !isMobile ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r: any) => {
                const st = statusConfig[r.status] || statusConfig.draft;
                const vb = r.validity_date ? validityBadge(r.validity_date) : null;
                return (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/laudos/${r.id}`)}
                  >
                    <TableCell className="font-medium">{r.client?.name || "—"}</TableCell>
                    <TableCell>{r.service?.service_type || "—"}</TableCell>
                    <TableCell>{formatDateBR(r.created_at)}</TableCell>
                    <TableCell>{r.tech?.full_name || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {r.validity_date ? formatDateBR(r.validity_date) : "—"}
                        {vb && <Badge className={vb.className}>{vb.label}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={st.className}>{st.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/laudos/${r.id}`); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r: any) => {
            const st = statusConfig[r.status] || statusConfig.draft;
            const vb = r.validity_date ? validityBadge(r.validity_date) : null;
            return (
              <Card
                key={r.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/laudos/${r.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-foreground">{r.client?.name || "—"}</p>
                    <Badge className={st.className}>{st.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {r.service?.service_type || "—"} · {formatDateBR(r.created_at)}
                  </p>
                  {r.validity_date && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">
                        Válido até: {formatDateBR(r.validity_date)}
                      </span>
                      {vb && <Badge className={`text-xs ${vb.className}`}>{vb.label}</Badge>}
                    </div>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={(e) => { e.stopPropagation(); navigate(`/laudos/${r.id}`); }}>
                      <Eye className="w-3.5 h-3.5" /> Ver
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
