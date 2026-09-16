import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Zap, Power } from "lucide-react";
import { triggersApi, Trigger } from "../api/triggers";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { TriggerFormModal } from "./triggers/TriggerFormModal";

export function TriggersPage() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({ queryKey: ["triggers"], queryFn: triggersApi.list });
  const [editing, setEditing] = useState<Trigger | null>(null);
  const [creating, setCreating] = useState(false);

  const removeMut = useMutation({
    mutationFn: (id: number) => triggersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["triggers"] }),
  });

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-ink">Triggerlar</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            Mijozning kalit so'zlariga tayyor javob shablonlari
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus size={14} />
          Yangi trigger
        </Button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center text-muted">Yuklanmoqda…</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Zap size={24} />}
            title="Hali trigger yo'q"
            description="Masalan: mijoz 'sayt' desa → 'Ismingiz va telefoningizni qoldiring' javobi"
          />
        ) : (
          <table className="w-full text-[13px]">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5">Nomi</th>
                <th className="text-left px-4 py-2.5">Kalit so'zlar</th>
                <th className="text-left px-4 py-2.5">Javob</th>
                <th className="text-center px-4 py-2.5 w-24">Status</th>
                <th className="text-right px-4 py-2.5 w-24">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-b border-border/50 hover:bg-surface2/50">
                  <td className="px-4 py-3 font-medium text-ink">{t.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {t.keywords.slice(0, 4).map((k, i) => (
                        <Badge key={i} tone="accent">{k}</Badge>
                      ))}
                      {t.keywords.length > 4 && (
                        <span className="text-xs text-muted">+{t.keywords.length - 4}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted max-w-xs truncate">{t.response_text}</td>
                  <td className="px-4 py-3 text-center">
                    {t.is_active ? (
                      <Badge tone="success">Faol</Badge>
                    ) : (
                      <Badge tone="neutral">O'chiq</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button className="btn-ghost !p-1.5" onClick={() => setEditing(t)}>
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn-ghost !p-1.5 hover:text-red-400"
                        onClick={() => {
                          if (confirm(`"${t.name}" triggerini o'chirasizmi?`)) removeMut.mutate(t.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(creating || editing) && (
        <TriggerFormModal
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
