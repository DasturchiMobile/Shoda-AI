import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, Link as LinkIcon, Upload, Send, Trash2, Sparkles, Check, Loader2, Radio } from "lucide-react";
import { knowledgeApi, KSource } from "../api/knowledge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { Modal } from "../ui/Modal";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";

type Msg = { role: "user" | "ai"; text: string; citations?: { name: string; snippet: string }[] };

const kindMeta: Record<KSource["kind"], { icon: any; label: string }> = {
  text: { icon: FileText, label: "Matn" },
  url: { icon: LinkIcon, label: "URL" },
  file: { icon: Upload, label: "Fayl" },
  telegram: { icon: Radio, label: "Telegram" },
};

export function KnowledgePage() {
  const qc = useQueryClient();
  const { data: sources = [] } = useQuery({ queryKey: ["knowledge"], queryFn: knowledgeApi.list });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");

  const removeMut = useMutation({
    mutationFn: (id: number) => knowledgeApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["knowledge"] }),
  });

  const askMut = useMutation({
    mutationFn: (question: string) =>
      knowledgeApi.ask(question, sources.filter(s => selected.has(s.id) || selected.size === 0).map(s => s.id)),
    onSuccess: (r) => {
      setMsgs(m => [...m, { role: "ai", text: r.answer, citations: r.citations }]);
    },
  });

  const toggle = (id: number) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };

  const send = () => {
    const t = q.trim();
    if (!t) return;
    setMsgs(m => [...m, { role: "user", text: t }]);
    setQ("");
    askMut.mutate(t);
  };

  return (
    <div className="flex h-[calc(100vh-96px)] gap-4 w-full">
      {/* LEFT: sources */}
      <aside className="w-[300px] shrink-0 card p-3 flex flex-col">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="text-xs uppercase tracking-wider text-muted">Manbalar ({sources.length})</div>
          <Button variant="ghost" className="!p-1.5" onClick={() => setAddOpen(true)}>
            <Plus size={14} />
          </Button>
        </div>

        {sources.length === 0 ? (
          <div className="flex-1 flex items-center justify-center px-3">
            <div className="text-center">
              <FileText size={28} className="mx-auto text-muted mb-2" />
              <p className="text-[12px] text-muted">Hali manba yo'q</p>
              <button onClick={() => setAddOpen(true)} className="mt-2 text-[12px] text-brand hover:underline">
                + Manba qo'shish
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-1">
            {sources.map((s) => {
              const M = kindMeta[s.kind];
              const on = selected.has(s.id);
              return (
                <div
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  className={`group flex items-start gap-2 px-2 py-2 rounded-md cursor-pointer hover:bg-surface2 ${on ? 'bg-brand/10' : ''}`}
                >
                  <div className={`mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${on ? 'bg-brand border-brand' : 'border-border'}`}>
                    {on && <Check size={11} className="text-white" />}
                  </div>
                  <M.icon size={14} className="mt-0.5 text-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-ink truncate">{s.name}</div>
                    <div className="text-[10.5px] text-muted flex items-center gap-1.5">
                      <span>{M.label}</span>
                      <span>·</span>
                      <span>{s.chunks_count} chunk</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (confirm(`"${s.name}" o'chirilsinmi?`)) removeMut.mutate(s.id); }}
                    className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-2 text-[11px] text-muted px-2">
          {selected.size > 0 ? `${selected.size} tanlangan` : "Hech biri tanlanmagan → hammasi ishlatiladi"}
        </div>
      </aside>

      {/* RIGHT: chat */}
      <div className="flex-1 card flex flex-col min-w-0">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Sparkles size={16} className="text-brand" />
          <div>
            <div className="text-[14px] font-semibold text-ink">Bilim bazasi bilan sinash</div>
            <div className="text-[11px] text-muted">Savol yozing — AI faol manbalar asosida javob beradi</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {msgs.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <EmptyState icon={<Sparkles size={24} />}
                title="Test suhbat"
                description="Chap tomondan manba tanlang va pastdan savol yozing" />
            </div>
          ) : msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-[13px] ${
                m.role === "user" ? "bg-brand text-white" : "bg-surface2 text-ink"
              }`}>
                <div className="whitespace-pre-wrap">{m.text}</div>
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.citations.map((c, j) => (
                      <Badge key={j} tone="accent">📎 {c.name}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {askMut.isPending && (
            <div className="flex justify-start">
              <div className="bg-surface2 rounded-lg px-3 py-2 text-[13px] text-muted flex items-center gap-2">
                <Loader2 size={12} className="animate-spin" /> O'ylayapman…
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border p-3 flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Manbalarga oid savol yozing..."
            className="flex-1"
          />
          <Button onClick={send} disabled={!q.trim() || askMut.isPending}>
            <Send size={14} />
          </Button>
        </div>
      </div>

      {addOpen && <AddSourceModal onClose={() => setAddOpen(false)} />}
    </div>
  );
}

function AddSourceModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"text" | "url" | "file" | "telegram">("text");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const createMut = useMutation({
    mutationFn: async () => {
      if (tab === "file") {
        const f = fileRef.current?.files?.[0];
        if (!f) throw new Error("Fayl tanlanmagan");
        return knowledgeApi.upload(f);
      }
      return knowledgeApi.create({
        name: name.trim(),
        kind: tab,
        content: tab === "text" ? content : "",
        url: tab === "url" || tab === "telegram" ? url.trim() : "",
        is_active: true,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["knowledge"] }); onClose(); },
    onError: (err: any) => alert("Xato: " + (err?.response?.data?.detail || err?.message)),
  });

  const tabs = [
    { id: "text", label: "Matn", icon: FileText },
    { id: "url", label: "URL", icon: LinkIcon },
    { id: "file", label: "Fayl", icon: Upload },
    { id: "telegram", label: "Telegram", icon: Radio },
  ] as const;

  return (
    <Modal open={true} title="Yangi manba" onClose={onClose} size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Bekor qilish</Button>
        <Button onClick={() => createMut.mutate()} disabled={createMut.isPending || (tab !== "file" && !name.trim())}>
          {createMut.isPending ? "Saqlanmoqda…" : "Qo'shish"}
        </Button>
      </>}>
      <div className="space-y-4">
        <div className="flex gap-1 border-b border-border">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[13px] border-b-2 ${
                tab === t.id ? "border-brand text-ink" : "border-transparent text-muted hover:text-ink"
              }`}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {tab !== "file" && (
          <div>
            <label className="text-xs text-muted mb-1 block">Nom *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Manba nomi" />
          </div>
        )}

        {tab === "text" && (
          <div>
            <label className="text-xs text-muted mb-1 block">Matn</label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)}
              rows={10} placeholder="Bilim bazasiga qo'shiladigan matnni bu yerga yozing..." />
          </div>
        )}
        {tab === "url" && (
          <div>
            <label className="text-xs text-muted mb-1 block">URL</label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/article" />
            <p className="mt-1 text-[11px] text-muted">n8n workflow orqali sahifa matni chiqarib olinadi (keyingi bosqichda).</p>
          </div>
        )}
        {tab === "file" && (
          <div>
            <label className="text-xs text-muted mb-1 block">Fayl (PDF, DOCX, TXT)</label>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md"
              className="w-full text-[13px] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-brand file:text-white hover:file:bg-brand-hover" />
            <p className="mt-1 text-[11px] text-muted">Backend matnni ajratib oladi va bilim bazasiga qo'shadi.</p>
          </div>
        )}
        {tab === "telegram" && (
          <div>
            <label className="text-xs text-muted mb-1 block">Telegram kanal</label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="@channel_name yoki t.me/channel_name" />
            <p className="mt-1 text-[11px] text-muted">Kanaldagi xabarlar bilim bazasiga import qilinadi (n8n orqali).</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
