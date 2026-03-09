import { useState } from "react";
import { Package, AlertTriangle, Plus, Search, ArrowUpCircle, Pencil } from "lucide-react";
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useProducts, useCreateProduct, useUpdateProduct, useAddStock, useStockMovements } from "@/hooks/useProducts";
import { EmptyState } from "@/components/EmptyState";
import { formatCurrency, formatDateBR } from "@/lib/business";
import { useIsMobile } from "@/hooks/use-mobile";

const categories = ["Inseticida", "Rodenticida", "Fungicida", "EPI", "Equipamento", "Outros"];
const units = ["L", "mL", "Kg", "g", "un", "cx"];

function getStockStatus(stock: number, minStock: number) {
  if (stock <= minStock * 0.5 || stock <= 0) return "critical";
  if (stock <= minStock) return "low";
  return "ok";
}

const statusConfig = {
  critical: { label: "🔴 Crítico", className: "bg-red-100 text-red-700 border-0" },
  low: { label: "⚠️ Baixo", className: "bg-amber-100 text-amber-700 border-0" },
  ok: { label: "✅ OK", className: "bg-green-100 text-green-700 border-0" },
};

export default function Estoque() {
  const { data: products, isLoading } = useProducts();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [onlyCritical, setOnlyCritical] = useState(false);
  const [newModal, setNewModal] = useState(false);
  const [stockModal, setStockModal] = useState<any>(null);
  const [editModal, setEditModal] = useState<any>(null);
  const [detailSheet, setDetailSheet] = useState<string | null>(null);

  const filtered = (products ?? []).filter((p: any) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    if (onlyCritical) {
      const s = getStockStatus(Number(p.stock), Number(p.min_stock));
      if (s === "ok") return false;
    }
    return true;
  });

  const critical = (products ?? []).filter((p: any) => Number(p.stock) <= Number(p.min_stock));
  const totalValue = (products ?? []).reduce((s: number, p: any) => s + Number(p.stock) * Number(p.cost ?? 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Estoque</h1>
        <Button onClick={() => setNewModal(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Novo produto
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{products?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total produtos</p>
          </CardContent>
        </Card>
        <Card className={critical.length > 0 ? "border-danger/30" : ""}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-danger">{critical.length}</p>
            <p className="text-xs text-muted-foreground">Estoque crítico</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalValue)}</p>
            <p className="text-xs text-muted-foreground">Valor em estoque</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button
          variant={onlyCritical ? "default" : "outline"}
          size="sm"
          onClick={() => setOnlyCritical(!onlyCritical)}
          className="gap-1"
        >
          <AlertTriangle className="w-4 h-4" /> Críticos
        </Button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="📦"
          title="Estoque não cadastrado"
          description="Cadastre seus produtos para controlar o consumo por serviço e calcular a margem de cada atendimento."
          action={{ label: "+ Cadastrar produto", onClick: () => setNewModal(true) }}
        />
      ) : !isMobile ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Estoque</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Custo unit.</TableHead>
                <TableHead className="w-36">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p: any) => {
                const status = getStockStatus(Number(p.stock), Number(p.min_stock));
                const st = statusConfig[status];
                return (
                  <TableRow
                    key={p.id}
                    className={cn("cursor-pointer", status === "critical" && "bg-red-50/50", status === "low" && "bg-amber-50/50")}
                    onClick={() => setDetailSheet(p.id)}
                  >
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.category || "—"}</TableCell>
                    <TableCell className="text-right font-semibold">{Number(p.stock)} {p.unit}</TableCell>
                    <TableCell className="text-right">{Number(p.min_stock)} {p.unit}</TableCell>
                    <TableCell><Badge className={st.className}>{st.label}</Badge></TableCell>
                    <TableCell className="text-right">{p.cost ? formatCurrency(Number(p.cost)) : "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setStockModal(p)}>
                          <ArrowUpCircle className="w-3.5 h-3.5" /> Entrada
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditModal(p)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p: any) => {
            const status = getStockStatus(Number(p.stock), Number(p.min_stock));
            const st = statusConfig[status];
            return (
              <Card
                key={p.id}
                className={cn("cursor-pointer", status === "critical" && "border-danger/30")}
                onClick={() => setDetailSheet(p.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-semibold text-foreground">{p.name}</p>
                    <Badge className={st.className}>{st.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{p.category || "Sem categoria"} · {p.unit}</p>
                  <p className="text-sm text-foreground">
                    Estoque: <span className="font-bold">{Number(p.stock)} {p.unit}</span>
                    <span className="text-muted-foreground"> (mín. {Number(p.min_stock)} {p.unit})</span>
                  </p>
                  {p.cost > 0 && <p className="text-xs text-muted-foreground">Custo unit.: {formatCurrency(Number(p.cost))}</p>}
                  <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setStockModal(p)}>
                      <ArrowUpCircle className="w-3.5 h-3.5" /> Dar entrada
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditModal(p)}>
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New product modal */}
      <NewProductModal open={newModal} onClose={() => setNewModal(false)} />

      {/* Stock entry modal */}
      {stockModal && (
        <StockEntryModal product={stockModal} open={!!stockModal} onClose={() => setStockModal(null)} />
      )}

      {/* Edit product modal */}
      {editModal && (
        <EditProductModal product={editModal} open={!!editModal} onClose={() => setEditModal(null)} />
      )}

      {/* Movement history sheet */}
      <MovementSheet productId={detailSheet} onClose={() => setDetailSheet(null)} products={products ?? []} />
    </div>
  );
}

/* ─── New Product Modal ─── */
function NewProductModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateProduct();
  const [form, setForm] = useState({
    name: "", category: "Inseticida", unit: "L", stock: 0, min_stock: 0, cost: 0, supplier: "",
  });

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    create.mutate(form, { onSuccess: () => { onClose(); setForm({ name: "", category: "Inseticida", unit: "L", stock: 0, min_stock: 0, cost: 0, supplier: "" }); } });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Produto</DialogTitle>
          <DialogDescription>Cadastre um novo produto no estoque</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome do produto *</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Cipermetrina 250ml" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria *</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unidade *</Label>
              <Select value={form.unit} onValueChange={v => setForm(p => ({ ...p, unit: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Estoque inicial</Label>
              <Input type="number" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Estoque mínimo *</Label>
              <Input type="number" value={form.min_stock} onChange={e => setForm(p => ({ ...p, min_stock: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Custo unit. (R$)</Label>
              <Input type="number" step="0.01" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <Label>Fornecedor</Label>
            <Input value={form.supplier} onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))} />
          </div>
          <Button onClick={handleSubmit} disabled={create.isPending || !form.name.trim()} className="w-full">
            {create.isPending ? "Salvando..." : "Cadastrar produto"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Stock Entry Modal ─── */
function StockEntryModal({ product, open, onClose }: { product: any; open: boolean; onClose: () => void }) {
  const addStock = useAddStock();
  const [qty, setQty] = useState(0);
  const [unitCost, setUnitCost] = useState(Number(product.cost ?? 0));
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (qty <= 0) return;
    addStock.mutate({
      productId: product.id,
      qty,
      unitCost: unitCost || undefined,
      notes: notes || undefined,
      currentStock: Number(product.stock),
    }, { onSuccess: () => { onClose(); setQty(0); setNotes(""); } });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Entrada de Estoque</DialogTitle>
          <DialogDescription>{product.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Estoque atual: <strong>{Number(product.stock)} {product.unit}</strong>
          </p>
          <div>
            <Label>Quantidade a adicionar *</Label>
            <Input type="number" step="0.1" value={qty} onChange={e => setQty(Number(e.target.value))} />
          </div>
          <div>
            <Label>Custo unitário (R$)</Label>
            <Input type="number" step="0.01" value={unitCost} onChange={e => setUnitCost(Number(e.target.value))} />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
          <Button onClick={handleSubmit} disabled={addStock.isPending || qty <= 0} className="w-full">
            {addStock.isPending ? "Salvando..." : `Adicionar +${qty} ${product.unit}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Edit Product Modal ─── */
function EditProductModal({ product, open, onClose }: { product: any; open: boolean; onClose: () => void }) {
  const update = useUpdateProduct();
  const [form, setForm] = useState({
    name: product.name,
    category: product.category || "Outros",
    unit: product.unit || "un",
    min_stock: Number(product.min_stock),
    cost: Number(product.cost ?? 0),
    supplier: product.supplier || "",
  });

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    update.mutate({ id: product.id, ...form }, { onSuccess: onClose });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Produto</DialogTitle>
          <DialogDescription>Atualize os dados do produto</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome *</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unidade</Label>
              <Select value={form.unit} onValueChange={v => setForm(p => ({ ...p, unit: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Estoque mín.</Label>
              <Input type="number" value={form.min_stock} onChange={e => setForm(p => ({ ...p, min_stock: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Custo (R$)</Label>
              <Input type="number" step="0.01" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <Label>Fornecedor</Label>
            <Input value={form.supplier} onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))} />
          </div>
          <Button onClick={handleSubmit} disabled={update.isPending || !form.name.trim()} className="w-full">
            {update.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Movement History Sheet ─── */
function MovementSheet({ productId, onClose, products }: { productId: string | null; onClose: () => void; products: any[] }) {
  const { data: movements, isLoading } = useStockMovements(productId);
  const product = products.find((p: any) => p.id === productId);

  return (
    <Sheet open={!!productId} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{product?.name ?? "Produto"}</SheetTitle>
          <SheetDescription>Histórico de movimentações</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {isLoading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)
          ) : !movements || movements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma movimentação registrada</p>
          ) : (
            movements.map((m: any) => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <span className="text-lg">{m.type === "in" ? "📥" : "📤"}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {m.type === "in" ? "+" : "-"}{Number(m.qty)} {product?.unit ?? "un"}
                    {m.type === "in" ? " · Entrada" : " · Saída"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateBR(m.created_at)}
                    {m.unit_cost ? ` · ${formatCurrency(Number(m.unit_cost))}/${product?.unit}` : ""}
                  </p>
                  {m.notes && <p className="text-xs text-muted-foreground mt-0.5">{m.notes}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
