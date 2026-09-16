import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Phone, User, MessageSquare, Trash2, Send } from "lucide-react";
import { Lead, leadsApi } from "../../api/leads";
import { Board } from "../../api/boards";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Textarea } from "../../ui/Textarea";

export function LeadDetailPanel({ lead, board, onClose }: {
  lead: Lead; board: Board | null; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(lead.name);
  const [phone, setPhone] = useState(lead.phone);
  const [notes, setNotes] = useState(lead.notes);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setName(lead.name); setPhone(lead.phone); setNotes(lead.notes);
  }, [lead.id]);

  const { data: messages = [] } = useQuery({
    queryKey: ["lead-messages", lead.id],
    queryFn: () => leadsApi.messages(lead.id),
  });

  const saveMut = useMutation({
    mutationFn: () => leadsApi.update(lead.id, { name, phone, notes } as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  const moveMut = useMutation({
    mutationFn: (sid: number) => leadsApi.move(lead.id, sid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  const removeMut = useMutation({
    mutationFn: () => leadsApi.remove(lead.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); onClose(); },
  });

  const addMsgMut = useMutation({
    mutationFn: (text: string) => leadsApi.addMessage(lead.id, text),
    onSuccess: () => {
      setMsg("");
      qc.invalidateQueries({ queryKey: ["lead-messages", lead.id] });
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  const replyMut = useMutation({
    mutationFn: (text: string) => leadsApi.reply(lead.id, text),
    onSuccess: () => {
      setMsg("");
      qc.invalidateQueries({ queryKey: ["lead-messages", lead.id] });
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: any) => alert(e?.response?.data?.detail || "Yuborib bo'lmadi"),
  });

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-[440px] bg-surface border-l border-border shadow-2xl flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-ink truncate">
            {lead.name || lead.telegram_username || `Lid #${lead.id}`}
          </div>
          <div className="text-[11px] text-muted">
            Manba: {lead.source}
            {typeof lead.total_cost_usd === "number" && (
              <> · AI narxi: ${lead.total_cost_usd.toFixed(6)}</>
            )}
          </div>
        </div>
        <button onClick={onClose} className="btn-ghost !p-1.5"><X size={16} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="text-xs text-muted mb-1 block">Ism</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted mb-1 block flex items-center gap-1"><Phone size={11} /> Telefon</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        {lead.telegram_username && (
          <div className="text-[12px] text-muted flex items-center gap-1"><User size={11} /> @{lead.telegram_username.replace('@','')}</div>
        )}

        {board && (
          <div>
            <label className="text-xs text-muted mb-1 block">Bosqich</label>
            <select value={lead.stage_id || 0}
              onChange={(e) => moveMut.mutate(Number(e.target.value))}
              className="w-full rounded-md border border-border bg-surface2 text-ink px-3 py-2 text-[13px]">
              {board.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs text-muted mb-1 block">Izohlar</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>

        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="w-full">
          {saveMut.isPending ? "Saqlanmoqda…" : "O'zgarishlarni saqlash"}
        </Button>

        <div className="pt-4 border-t border-border">
          <div className="text-xs text-muted mb-2 flex items-center gap-1"><MessageSquare size={11} /> Suhbat tarixi</div>
          <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
            {messages.length === 0 ? (
              <div className="text-[12px] text-muted text-center py-4">Xabarlar yo'q</div>
            ) : messages.map((m: any) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-[12.5px] ${
                  m.role === 'user' ? 'bg-surface2 text-ink' :
                  m.role === 'ai' ? 'bg-brand/10 text-ink' : 'bg-brand text-white'
                }`}>
                  <div className="text-[9.5px] text-muted mb-0.5 uppercase">{m.role}</div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <Textarea value={msg} onChange={(e) => setMsg(e.target.value)}
              placeholder="Xabar yozing..." rows={2} className="w-full" />
            <div className="flex gap-1.5">
              <Button onClick={() => msg.trim() && replyMut.mutate(msg)}
                disabled={!msg.trim() || replyMut.isPending || !lead.telegram_id}
                title={lead.telegram_id ? "Telegram orqali yuborish" : "Lidda Telegram ID yo'q"}
                className="flex-1 flex items-center justify-center gap-1.5">
                <Send size={13} /> {replyMut.isPending ? "..." : "Telegramga yuborish"}
              </Button>
              <Button variant="secondary" onClick={() => msg.trim() && addMsgMut.mutate(msg)}
                disabled={!msg.trim() || addMsgMut.isPending}
                title="Faqat izoh (mijozga yuborilmaydi)">
                Izoh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-border">
        <button onClick={() => { if (confirm("Lidni o'chirasizmi?")) removeMut.mutate(); }}
          className="btn-ghost text-red-400 w-full flex items-center justify-center gap-1.5">
          <Trash2 size={13} /> Lidni o'chirish
        </button>
      </div>
    </div>
  );
}
