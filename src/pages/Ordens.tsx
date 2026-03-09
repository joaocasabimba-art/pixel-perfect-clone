import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWorkOrders, WorkOrder } from "@/hooks/useWorkOrders";
import { EmptyState } from "@/components/EmptyState";
import { formatDateBR, formatCurrency } from "@/lib/business";
import { Plus, Search, Calendar, User, Eye, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { NewServiceModal } from "@/components/agenda/NewServiceModal";

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: "Aberta", className: "bg-blue-100 text-blue-800 border-0" },
  in_progress: { label: "Em andamento", className: "bg-amber-100 text-amber-800 border-0" },
  done: { label: "Concluída", className: "bg-green-100 text-green-800 border-0" },
  cancelled: { label: "Cancelada", className: "bg-gray-100 text-gray-600 border-0" },
};

export default function Ordens() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [newServiceOpen, setNewServiceOpen] = useState(false);

  const { data: workOrders, isLoading } = useWorkOrders({
    status: statusFilter,
    search,
  });

  const formatWONumber = (n: number) => `#${String(n).padStart(4, "0")}`;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 flex-1" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Ordens de Serviço</h1>
        <Button onClick={() => setNewServiceOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nova OS
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="open">Abertas</SelectItem>
            <SelectItem value="in_progress">Em andamento</SelectItem>
            <SelectItem value="done">Concluídas</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou nº da OS"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Empty State */}
      {(!workOrders || workOrders.length === 0) && (
        <EmptyState
          icon="📋"
          title="Nenhuma ordem de serviço"
          description="Crie uma OS a partir de um serviço agendado"
          action={{ label: "Nova OS", onClick: () => setNewServiceOpen(true) }}
        />
      )}

      {/* Desktop Table */}
      {workOrders && workOrders.length > 0 && !isMobile && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Nº OS</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workOrders.map((wo) => {
                const st = statusConfig[wo.status] || statusConfig.open;
                return (
                  <TableRow
                    key={wo.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/ordens/${wo.id}`)}
                  >
                    <TableCell className="font-mono font-bold text-primary">
                      {formatWONumber(wo.number)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {wo.service?.client?.name || "—"}
                    </TableCell>
                    <TableCell>{wo.service?.service_type || "—"}</TableCell>
                    <TableCell>{wo.service?.tech?.full_name || "—"}</TableCell>
                    <TableCell>
                      {wo.service?.scheduled_date
                        ? formatDateBR(wo.service.scheduled_date)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={st.className}>{st.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {wo.service?.value
                        ? formatCurrency(Number(wo.service.value))
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/ordens/${wo.id}`);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Mobile Cards */}
      {workOrders && workOrders.length > 0 && isMobile && (
        <div className="space-y-3">
          {workOrders.map((wo) => {
            const st = statusConfig[wo.status] || statusConfig.open;
            return (
              <Card
                key={wo.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/ordens/${wo.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-mono text-sm font-bold text-primary">
                      OS {formatWONumber(wo.number)}
                    </span>
                    <Badge className={st.className}>{st.label}</Badge>
                  </div>

                  <p className="font-semibold text-foreground">
                    {wo.service?.client?.name || "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {wo.service?.service_type}
                  </p>

                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    {wo.service?.scheduled_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDateBR(wo.service.scheduled_date)}
                        {wo.service?.start_time && ` ${wo.service.start_time.slice(0, 5)}`}
                      </div>
                    )}
                    {wo.service?.tech?.full_name && (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {wo.service.tech.full_name}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className="font-semibold">
                      {wo.service?.value
                        ? formatCurrency(Number(wo.service.value))
                        : "—"}
                    </span>
                    <span className="text-primary text-sm flex items-center gap-1">
                      Ver OS <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <NewServiceModal open={newServiceOpen} onOpenChange={setNewServiceOpen} />
    </div>
  );
}
