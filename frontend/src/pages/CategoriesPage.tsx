import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Folder } from "lucide-react";
import { categoriesApi } from "../api/categories";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { EmptyState } from "../ui/EmptyState";

export function CategoriesPage() {
  const qc = useQueryClient();
  const { data: cats = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
  });
  const [name, setName] = useState("");

  const createMut = useMutation({
    mutationFn: (n: string) => categoriesApi.create(n),
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err: any) => {
      alert("Xato: " + (err?.response?.data?.detail || err?.message || "noma'lum xato"));
    },
  });

  const removeMut = useMutation({
    mutationFn: (id: number) => categoriesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  const add = () => {
    const n = name.trim();
    if (n) createMut.mutate(n);
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-ink">Kategoriyalar</h1>
        <p className="mt-0.5 text-[13px] text-muted">Mahsulotlarni guruhlash uchun kategoriyalar</p>
      </div>

      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Yangi kategoriya nomi"
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Button onClick={add} disabled={!name.trim() || createMut.isPending} className="w-full sm:w-auto shrink-0">
            <Plus size={14} />
            Qo'shish
          </Button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center text-muted">Yuklanmoqda...</div>
        ) : cats.length === 0 ? (
          <EmptyState icon={<Folder size={24} />} title="Hali kategoriya yo'q" description="Yuqoridan birinchi kategoriyani qo'shing" />
        ) : (
          <ul className="divide-y divide-border">
            {cats.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-surface2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand/10 text-brand">
                    <Folder size={13} />
                  </div>
                  <div>
                    <div className="text-[13.5px] font-medium text-ink">{c.name}</div>
                    <div className="text-[11px] text-muted">{c.slug}</div>
                  </div>
                </div>
                <button
                  onClick={() => { if (confirm(`"${c.name}" kategoriyasini o'chirasizmi?`)) removeMut.mutate(c.id); }}
                  className="p-1.5 rounded-md text-muted hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
