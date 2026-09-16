import { useEffect, useState, KeyboardEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Send, Check } from "lucide-react";
import { triggersApi, Trigger } from "../../api/triggers";
import { channelsApi } from "../../api/channels";
import { Modal } from "../../ui/Modal";
import { Input } from "../../ui/Input";
import { Textarea } from "../../ui/Textarea";
import { Toggle } from "../../ui/Toggle";
import { Button } from "../../ui/Button";

export function TriggerFormModal({ initial, onClose }: { initial: Trigger | null; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name || "");
  const [keywords, setKeywords] = useState<string[]>(initial?.keywords || []);
  const [kwInput, setKwInput] = useState("");
  const [response, setResponse] = useState(initial?.response_text || "");
  const [active, setActive] = useState(initial?.is_active ?? true);
  const [chIds, setChIds] = useState<number[]>(initial?.required_channel_ids || []);

  const { data: channels = [] } = useQuery({ queryKey: ["channels"], queryFn: channelsApi.list });

  useEffect(() => {
    if (initial) {
      setName(initial.name); setKeywords(initial.keywords);
      setResponse(initial.response_text); setActive(initial.is_active);
      setChIds(initial.required_channel_ids || []);
    }
  }, [initial]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const body = {
        name, keywords, response_text: response,
        is_active: active, priority: initial?.priority ?? 100,
        required_channel_ids: chIds,
      };
      return isEdit ? triggersApi.update(initial!.id, body) : triggersApi.create(body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["triggers"] }); onClose(); },
    onError: (err: any) => alert("Xato: " + (err?.response?.data?.detail || err?.message)),
  });

  const addKw = () => {
    const v = kwInput.trim();
    if (v && !keywords.includes(v)) setKeywords([...keywords, v]);
    setKwInput("");
  };
  const onKwKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addKw(); }
    else if (e.key === "Backspace" && !kwInput && keywords.length) setKeywords(keywords.slice(0, -1));
  };

  const toggleCh = (id: number) => {
    setChIds(chIds.includes(id) ? chIds.filter(i => i !== id) : [...chIds, id]);
  };

  return (
    <Modal open={true} title={isEdit ? "Triggerni tahrirlash" : "Yangi trigger"} onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Bekor qilish</Button>
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !name.trim() || !response.trim()}>
          {saveMut.isPending ? "Saqlanmoqda…" : "Saqlash"}
        </Button>
      </>}>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted mb-1 block">Trigger nomi *</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: Sayt so'ragan mijoz" />
        </div>

        <div>
          <label className="text-xs text-muted mb-1 block">Kalit so'zlar (Enter yoki , bilan qo'shing)</label>
          <div className="rounded-md border border-border bg-surface2 p-2 flex flex-wrap gap-1.5 min-h-[42px] items-center">
            {keywords.map((k, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-md bg-brand/15 text-brand px-2 py-0.5 text-xs">
                {k}
                <button type="button" onClick={() => setKeywords(keywords.filter((_, j) => j !== i))} className="hover:text-red-400">
                  <X size={11} />
                </button>
              </span>
            ))}
            <input value={kwInput} onChange={(e) => setKwInput(e.target.value)}
              onKeyDown={onKwKey} onBlur={addKw}
              placeholder={keywords.length === 0 ? "sayt, katalog…" : ""}
              className="flex-1 min-w-[120px] bg-transparent outline-none text-[13px] text-ink" />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted mb-1 block">AI javobi *</label>
          <Textarea value={response} onChange={(e) => setResponse(e.target.value)}
            placeholder="Masalan: Ismingiz va telefon raqamingizni qoldiring, tez orada bog'lanamiz."
            rows={4} />
        </div>

        <div>
          <label className="text-xs text-muted mb-1 block flex items-center gap-1.5">
            <Send size={12} /> Majburiy obuna kanallari
          </label>
          {channels.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-3 text-[12px] text-muted">
              Hozircha kanal yo'q. <a href="/channels" className="text-brand hover:underline">Kanallar sahifasi</a>da qo'shing.
            </div>
          ) : (
            <div className="rounded-md border border-border divide-y divide-border">
              {channels.map((c) => {
                const on = chIds.includes(c.id);
                return (
                  <button key={c.id} type="button" onClick={() => toggleCh(c.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface2 text-left">
                    <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${on ? 'bg-brand border-brand' : 'border-border'}`}>
                      {on && <Check size={11} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-ink truncate">{c.username}</div>
                      <div className="text-[11px] text-muted truncate">{c.title || c.invite_url}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <p className="mt-1 text-[11px] text-muted">
            Tanlangan kanallarga obuna bo'lmagan mijozlarga avval obuna so'rovi ketadi, keyin javob beriladi.
          </p>
        </div>

        <Toggle checked={active} onChange={setActive} label="Faol" />
      </div>
    </Modal>
  );
}
