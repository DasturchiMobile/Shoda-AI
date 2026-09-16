import { Package } from "lucide-react";
import { Product } from "../../api/products";
import { Badge } from "../../ui";
import { fmtPrice } from "../../lib/utils";

export function ProductsGrid({
  items, onEdit,
}: {
  items: Product[];
  onEdit: (p: Product) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {items.map((p) => {
        const img = p.images[0]?.url;
        return (
          <button
            key={p.id}
            onClick={() => onEdit(p)}
            className="card p-3 text-left hover:border-accent/50 transition"
          >
            <div className="aspect-square rounded-lg bg-surface2 overflow-hidden grid place-items-center text-muted mb-2.5">
              {img ? <img src={img} className="h-full w-full object-cover" /> : <Package size={26} />}
            </div>
            <div className="font-medium truncate">{p.name}</div>
            <div className="text-[11px] text-muted truncate mb-2">{p.category_name ?? "—"}</div>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{fmtPrice(p.price, p.currency)}</div>
              {p.in_stock
                ? <Badge tone="success">Mavjud</Badge>
                : <Badge tone="danger">Tugagan</Badge>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
