import { Package, Pencil, Trash2 } from "lucide-react";
import { Product } from "../../api/products";
import { Badge, Table, TD, TH, THead, TR } from "../../ui";
import { fmtPrice } from "../../lib/utils";

export function ProductsTable({
  items, onEdit, onDelete,
}: {
  items: Product[];
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}) {
  return (
    <Table>
      <THead>
        <tr>
          <TH className="w-14"></TH>
          <TH>Nomi</TH>
          <TH>Kategoriya</TH>
          <TH>Narx</TH>
          <TH>Stock</TH>
          <TH className="w-20 text-right">Amallar</TH>
        </tr>
      </THead>
      <tbody>
        {items.map((p) => {
          const img = p.images[0]?.url;
          return (
            <TR key={p.id} className="cursor-pointer" onClick={() => onEdit(p)}>
              <TD>
                <div className="h-10 w-10 rounded-md bg-surface2 overflow-hidden grid place-items-center text-muted">
                  {img ? <img src={img} className="h-full w-full object-cover" /> : <Package size={16} />}
                </div>
              </TD>
              <TD>
                <div className="font-medium text-ink">{p.name}</div>
                {p.sku && <div className="text-[11px] text-muted">SKU: {p.sku}</div>}
              </TD>
              <TD className="text-muted">{p.category_name ?? "—"}</TD>
              <TD className="font-medium">{fmtPrice(p.price, p.currency)}</TD>
              <TD>
                {p.in_stock
                  ? <Badge tone="success">Mavjud{p.stock_qty != null ? ` · ${p.stock_qty}` : ""}</Badge>
                  : <Badge tone="danger">Tugagan</Badge>}
              </TD>
              <TD onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end gap-1">
                  <button className="btn-ghost !p-1.5" onClick={() => onEdit(p)}><Pencil size={14} /></button>
                  <button className="btn-ghost !p-1.5 hover:text-red-400" onClick={() => onDelete(p)}><Trash2 size={14} /></button>
                </div>
              </TD>
            </TR>
          );
        })}
      </tbody>
    </Table>
  );
}
