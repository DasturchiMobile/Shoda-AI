import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, Send } from "lucide-react";
import { channelsApi, ReqChannel } from "../api/channels";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { ChannelFormModal } from "./channels/ChannelFormModal";

export function ChannelsPage() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({ queryKey: ["channels"], queryFn: channelsApi.list });
  const [editing, setEditing] = useState<ReqChannel | null>(null);
  const [creating, setCreating] = useState(false);

  const removeMut = useMutation({
    mutationFn: (id: number) => channelsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-ink">Majburiy obuna</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            Mijoz shu kanallarga obuna bo'lmasa — AI bilan gaplasha olmaydi
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus size={14} /> Kanal qo'shish
        </Button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center text-muted">Yuklanmoqda…</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Send size={24} />}
            title="Hali majburiy kanal yo'q"
            description="Mijozdan obunani talab qilish uchun kanal qo'shing (masalan @shoda_official)" />
        ) : (
          <table className="w-full text-[13px]">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5">Kanal</th>
                <th className="text-left px-4 py-2.5">Nomi</th>
                <th className="text-left px-4 py-2.5">Havola</th>
                <th className="text-center px-4 py-2.5 w-24">Status</th>
                <th className="text-right px-4 py-2.5 w-24">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-surface2/50">
                  <td className="px-4 py-3 font-medium text-ink">{c.username}</td>
                  <td className="px-4 py-3 text-muted">{c.title}</td>
                  <td className="px-4 py-3">
                    <a href={c.invite_url} target="_blank" rel="noreferrer" className="text-brand hover:underline text-xs truncate max-w-xs inline-block">
                      {c.invite_url}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.is_active ? <Badge tone="success">Faol</Badge> : <Badge tone="neutral">O'chiq</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button className="btn-ghost !p-1.5" onClick={() => setEditing(c)}><Pencil size={14} /></button>
                      <button className="btn-ghost !p-1.5 hover:text-red-400"
                        onClick={() => { if (confirm(`"${c.username}" ni o'chirasizmi?`)) removeMut.mutate(c.id); }}>
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
        <ChannelFormModal initial={editing} onClose={() => { setCreating(false); setEditing(null); }} />
      )}
    </div>
  );
}
