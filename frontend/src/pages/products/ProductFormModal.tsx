import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Upload } from "lucide-react";
import { Product, productsApi } from "../../api/products";
import { Button, Input, Modal, Select, Textarea, Toggle } from "../../ui";
import { InfoTip } from "../../ui/InfoTip";
import { CategorySelect } from "./CategorySelect";
import { pushToast } from "../../hooks/useToast";

type Draft = {
  name: string;
  description: string;
  category_id: number | null;
  sku: string;
  price: string;
  currency: string;
  in_stock: boolean;
  stock_qty: string;
  is_active: boolean;
};

const empty: Draft = {
  name: "", description: "", category_id: null, sku: "",
  price: "0", currency: "UZS", in_stock: true, stock_qty: "", is_active: true,
};

export function ProductFormModal({
  open, onClose, product,
}: { open: boolean; onClose: () => void; product?: Product | null }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft>(empty);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (product) {
      setDraft({
        name: product.name,
        description: product.description ?? "",
        category_id: product.category_id ?? null,
        sku: product.sku ?? "",
        price: String(product.price ?? "0"),
        currency: product.currency,
        in_stock: product.in_stock,
        stock_qty: product.stock_qty != null ? String(product.stock_qty) : "",
        is_active: product.is_active,
      });
    } else {
      setDraft(empty);
    }
  }, [open, product]);

  const upd = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: draft.name.trim(),
        description: draft.description || null,
        category_id: draft.category_id,
        sku: draft.sku || null,
        price: draft.price || "0",
        currency: draft.currency,
        in_stock: draft.in_stock,
        stock_qty: draft.stock_qty ? Number(draft.stock_qty) : null,
        is_active: draft.is_active,
      };
      if (product) return productsApi.update(product.id, payload);
      return productsApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      pushToast("Saqlandi", "success");
      onClose();
    },
    onError: (e: any) => pushToast(e?.response?.data?.detail ?? "Xatolik", "error"),
  });

  const upload = async (file: File) => {
    if (!product) {
      pushToast("Avval mahsulotni saqlang", "error");
      return;
    }
    setBusy(true);
    try {
      await productsApi.uploadImage(product.id, file);
      qc.invalidateQueries({ queryKey: ["products"] });
      pushToast("Rasm yuklandi", "success");
    } catch (e: any) {
      pushToast(e?.response?.data?.detail ?? "Yuklashda xatolik", "error");
    } finally {
      setBusy(false);
    }
  };

  const removeImg = async (imgId: number) => {
    if (!product) return;
    await productsApi.deleteImage(product.id, imgId);
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Bekor qilish</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !draft.name.trim()}>
            {saveMut.isPending ? "Saqlanmoqda…" : "Saqlash"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted mb-1 block">Nomi *</label>
          <Input value={draft.name} onChange={(e) => upd("name", e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted mb-1 block">SKU<InfoTip>Stock Keeping Unit — mahsulotning ichki kod/artikuli. Masalan: TSH-BLK-M. Ombor va qidiruv uchun. Ixtiyoriy.</InfoTip></label>
          <Input value={draft.sku} onChange={(e) => upd("sku", e.target.value)} />
        </div>

        <div className="md:col-span-2">
          <label className="text-xs text-muted mb-1 block">Tavsif</label>
          <Textarea value={draft.description} onChange={(e) => upd("description", e.target.value)} />
        </div>

        <div className="min-w-0">
          <label className="text-xs text-muted mb-1 block">Kategoriya<InfoTip>Mahsulotni guruhga biriktirish. Kategoriyalar sahifasida yaratasiz.</InfoTip></label>
          <CategorySelect value={draft.category_id} onChange={(v) => upd("category_id", v)} />
        </div>
        <div className="min-w-0">
          <label className="text-xs text-muted mb-1 block">Narx<InfoTip>Mahsulot narxi. Faqat raqam yozing (masalan 250000). Valyutani o'ngdan tanlaysiz.</InfoTip></label>
          <div className="relative min-w-0">
            <Input
              inputMode="decimal"
              value={draft.price}
              onChange={(e) => upd("price", e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0"
              className="w-full pr-20"
            />
            <select
              value={draft.currency}
              onChange={(e) => upd("currency", e.target.value)}
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-surface2 text-ink text-xs rounded px-1.5 py-1 border border-border focus:outline-none"
            >
              <option>UZS</option>
              <option>USD</option>
              <option>EUR</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <Toggle checked={draft.in_stock} onChange={(v) => upd("in_stock", v)} label="Sotuvda mavjud" />
          <Toggle checked={draft.is_active} onChange={(v) => upd("is_active", v)} label="Faol" />
        </div>
        <div>
          <label className="text-xs text-muted mb-1 block">Ombordagi soni<InfoTip>Necha dona mavjud. Bo'sh qoldirsangiz — cheksiz (hisoblanmaydi).</InfoTip></label>
          <Input
            type="number"
            value={draft.stock_qty}
            onChange={(e) => upd("stock_qty", e.target.value)}
            disabled={!draft.in_stock}
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-xs text-muted mb-2 block">Rasmlar</label>
          <div className="flex gap-2 flex-wrap">
            {(product?.images ?? []).map((img) => (
              <div key={img.id} className="relative h-20 w-20 rounded-md overflow-hidden border border-border">
                <img src={img.url} className="h-full w-full object-cover" />
                <button
                  className="absolute top-1 right-1 bg-black/60 hover:bg-black text-white rounded p-1"
                  onClick={() => removeImg(img.id)}
                  type="button"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <label className="h-20 w-20 rounded-md border border-dashed border-border grid place-items-center cursor-pointer hover:border-accent/60 text-muted">
              <Upload size={16} />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
                disabled={busy}
              />
            </label>
          </div>
          {!product && (
            <div className="text-[11px] text-muted mt-2">
              Rasm yuklash uchun avval mahsulotni saqlang.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
