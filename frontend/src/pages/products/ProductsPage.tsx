import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, LayoutGrid, List, Package, Plus, Search } from "lucide-react";
import { Topbar } from "../../layouts/Topbar";
import { Product, productsApi } from "../../api/products";
import { categoriesApi } from "../../api/categories";
import { Button, EmptyState, Input, Select, Skeleton } from "../../ui";
import { ProductFormModal } from "./ProductFormModal";
import { ProductsTable } from "./ProductsTable";
import { ProductsGrid } from "./ProductsGrid";
import { pushToast } from "../../hooks/useToast";

type StockFilter = "" | "true" | "false";

export function ProductsPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<"table" | "grid">("table");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [stock, setStock] = useState<StockFilter>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const filters = useMemo(
    () => ({
      search: search || undefined,
      category_id: categoryId === "" ? null : Number(categoryId),
      in_stock: stock === "" ? null : stock === "true",
      per_page: 100,
    }),
    [search, categoryId, stock]
  );

  const { data: cats = [] } = useQuery({ queryKey: ["categories"], queryFn: categoriesApi.list });
  const { data, isLoading } = useQuery({
    queryKey: ["products", filters],
    queryFn: () => productsApi.list(filters),
  });

  const deleteMut = useMutation({
    mutationFn: (p: Product) => productsApi.remove(p.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      pushToast("O'chirildi", "success");
    },
  });

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setModalOpen(true); };
  const del = (p: Product) => {
    if (confirm(`"${p.name}" o'chirilsinmi?`)) deleteMut.mutate(p);
  };

  const items = data?.items ?? [];
  const isEmpty = !isLoading && items.length === 0 && !search && categoryId === "" && stock === "";

  return (
    <>
      <Topbar
        title="Mahsulotlar"
        right={
          <>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                className={`px-2.5 py-1.5 text-xs flex items-center gap-1 ${view === "table" ? "bg-accent/15 text-ink" : "text-muted hover:text-ink"}`}
                onClick={() => setView("table")}
              ><List size={13} /> Table</button>
              <button
                className={`px-2.5 py-1.5 text-xs flex items-center gap-1 border-l border-border ${view === "grid" ? "bg-accent/15 text-ink" : "text-muted hover:text-ink"}`}
                onClick={() => setView("grid")}
              ><LayoutGrid size={13} /> Grid</button>
            </div>
          </>
        }
      />
      <div className="p-6">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-medium">Mahsulotlar</h1>
            <p className="text-muted text-sm mt-1">
              Katalog mahsulotlari — Shoda AI bu ma'lumotlarni o'qib javob beradi.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="secondary"
              onClick={() => pushToast("Bosqich C — keyingi versiyada", "info")}
            >
              <Download size={14} /> Telegram'dan import
            </Button>
            <Button onClick={openNew}>
              <Plus size={14} /> Mahsulot qo'shish
            </Button>
          </div>
        </div>

        {!isEmpty && (
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Qidirish (nom, SKU)…"
                className="pl-8"
              />
            </div>
            <Select value={categoryId as any} onChange={(e) => setCategoryId(e.target.value === "" ? "" : Number(e.target.value))} className="w-56">
              <option value="">Barcha kategoriyalar</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select value={stock} onChange={(e) => setStock(e.target.value as StockFilter)} className="w-44">
              <option value="">Barcha stock</option>
              <option value="true">Faqat mavjud</option>
              <option value="false">Faqat tugagan</option>
            </Select>
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        )}

        {!isLoading && isEmpty && (
          <EmptyState
            icon={<Package size={40} />}
            title="Hali mahsulot yo'q"
            description="Katalogingizni to'ldiring — Shoda AI mijozlarga shu ma'lumotlar asosida javob beradi."
            action={<Button onClick={openNew}><Plus size={14} /> Birinchi mahsulot qo'shish</Button>}
          />
        )}

        {!isLoading && !isEmpty && items.length === 0 && (
          <div className="text-center py-16 text-muted text-sm">Filtrga mos mahsulot topilmadi.</div>
        )}

        {!isLoading && items.length > 0 && (
          view === "table"
            ? <ProductsTable items={items} onEdit={openEdit} onDelete={del} />
            : <ProductsGrid items={items} onEdit={openEdit} />
        )}
      </div>

      <ProductFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        product={editing}
      />
    </>
  );
}
