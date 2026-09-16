import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Plus, X } from "lucide-react";
import { categoriesApi } from "../../api/categories";
import { cn } from "../../lib/utils";

export function CategorySelect({
  value, onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const qc = useQueryClient();
  const { data: cats = [] } = useQuery({ queryKey: ["categories"], queryFn: categoriesApi.list });
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return cats;
    return cats.filter((c) => c.name.toLowerCase().includes(s));
  }, [cats, q]);

  const createMut = useMutation({
    mutationFn: (name: string) => categoriesApi.create(name),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      onChange(c.id);
      setOpen(false);
      setQ("");
    },
  });

  const selected = cats.find((c) => c.id === value) || null;
  const showCreate = q.trim() && !filtered.some((c) => c.name.toLowerCase() === q.trim().toLowerCase());

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input flex items-center justify-between text-left"
      >
        <span className={selected ? "" : "text-muted"}>
          {selected ? selected.name : "Kategoriya tanlang"}
        </span>
        <div className="flex items-center gap-2">
          {selected && (
            <X
              size={14}
              className="text-muted hover:text-ink"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
            />
          )}
          <ChevronDown size={14} className="text-muted" />
        </div>
      </button>

      {open && (
        <div className="absolute z-40 mt-1 w-full card p-1 shadow-lg">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Qidirish yoki yaratish…"
            className="input mb-1"
          />
          <div className="max-h-56 overflow-y-auto">
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onChange(c.id); setOpen(false); }}
                className={cn(
                  "w-full text-left px-2.5 py-1.5 rounded-md text-sm hover:bg-surface2",
                  value === c.id && "bg-accent/10 text-ink"
                )}
              >
                {c.name}
              </button>
            ))}
            {!filtered.length && !showCreate && (
              <div className="px-2.5 py-2 text-xs text-muted">Topilmadi</div>
            )}
            {showCreate && (
              <button
                type="button"
                onClick={() => createMut.mutate(q.trim())}
                className="w-full text-left px-2.5 py-1.5 rounded-md text-sm text-accent-soft hover:bg-accent/10 flex items-center gap-1.5"
              >
                <Plus size={14} /> Yaratish: "{q.trim()}"
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
