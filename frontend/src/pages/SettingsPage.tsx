import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "../api/settings";
import { Save, Sparkles, Bot, Users, Shield, Clock, MessageSquareOff, Plus, Trash2 } from "lucide-react";

function Toggle({ checked, onChange, label, hint }: any) {
  return (
    <label className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <div className="text-[13px] text-ink">{label}</div>
        {hint && <div className="text-[11.5px] text-ink-subtle">{hint}</div>}
      </div>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 mt-1 shrink-0" />
    </label>
  );
}

function Section({ icon, title, children }: any) {
  return (
    <div className="surface p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md" style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand)" }}>{icon}</div>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings"], queryFn: settingsApi.get });
  const [f, setF] = useState<any>({});
  const { data: groqModelsData } = useQuery({
    queryKey: ["groq-models"],
    queryFn: settingsApi.groqModels,
    enabled: !!f.groq_api_key_set,
    staleTime: 5 * 60 * 1000,
  });
  const groqModelOptions: string[] = (groqModelsData?.ok && groqModelsData.models.length > 0)
    ? groqModelsData.models
    : ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "openai/gpt-oss-20b", "openai/gpt-oss-120b"];

  const [editGemini, setEditGemini] = useState(false);
  const [editVoice, setEditVoice] = useState(false);
  const [editGroq, setEditGroq] = useState(false);
  const [editOpenai, setEditOpenai] = useState(false);
  const [editClaude, setEditClaude] = useState(false);

  const [testGeminiStatus, setTestGeminiStatus] = useState<{ loading: boolean, ok?: boolean, error?: string }>({ loading: false });
  const [testGroqStatus, setTestGroqStatus] = useState<{ loading: boolean, ok?: boolean, error?: string }>({ loading: false });
  const [testVoiceStatus, setTestVoiceStatus] = useState<{ loading: boolean, ok?: boolean, error?: string }>({ loading: false });
  const [testOpenaiStatus, setTestOpenaiStatus] = useState<{ loading: boolean, ok?: boolean, error?: string }>({ loading: false });
  const [testClaudeStatus, setTestClaudeStatus] = useState<{ loading: boolean, ok?: boolean, error?: string }>({ loading: false });

  useEffect(() => {
    if (data) {
      const d: any = data;
      setF(d);
      setEditGemini(!d.gemini_api_key_set);
      setEditVoice(!d.uzbekvoice_api_key_set);
      setEditGroq(!d.groq_api_key_set);
      setEditOpenai(!d.openai_api_key_set);
      setEditClaude(!d.claude_api_key_set);
    }
  }, [data]);

  const handleTestGemini = async () => {
    setTestGeminiStatus({ loading: true });
    try {
      const res = await settingsApi.testGemini({ api_key: f.gemini_api_key, model: f.gemini_model });
      setTestGeminiStatus({ loading: false, ok: res.ok, error: res.error });
    } catch (e: any) {
      setTestGeminiStatus({ loading: false, ok: false, error: e.message || "Xatolik" });
    }
  };

  const handleTestGroq = async () => {
    setTestGroqStatus({ loading: true });
    try {
      const res = await settingsApi.testGroq({ api_key: f.groq_api_key, model: f.groq_model });
      setTestGroqStatus({ loading: false, ok: res.ok, error: res.error });
    } catch (e: any) {
      setTestGroqStatus({ loading: false, ok: false, error: e.message || "Xatolik" });
    }
  };

  const handleTestOpenai = async () => {
    setTestOpenaiStatus({ loading: true });
    try {
      const res = await settingsApi.testOpenai({ api_key: f.openai_api_key, model: f.openai_model });
      setTestOpenaiStatus({ loading: false, ok: res.ok, error: res.error });
    } catch (e: any) {
      setTestOpenaiStatus({ loading: false, ok: false, error: e.message || "Xatolik" });
    }
  };

  const handleTestClaude = async () => {
    setTestClaudeStatus({ loading: true });
    try {
      const res = await settingsApi.testClaude({ api_key: f.claude_api_key, model: f.claude_model });
      setTestClaudeStatus({ loading: false, ok: res.ok, error: res.error });
    } catch (e: any) {
      setTestClaudeStatus({ loading: false, ok: false, error: e.message || "Xatolik" });
    }
  };

  const handleTestVoice = async () => {
    setTestVoiceStatus({ loading: true });
    try {
      const res = await settingsApi.testVoice({ api_key: f.uzbekvoice_api_key });
      setTestVoiceStatus({ loading: false, ok: res.ok, error: res.error });
    } catch (e: any) {
      setTestVoiceStatus({ loading: false, ok: false, error: e.message || "Xatolik" });
    }
  };

  const mut = useMutation({
    mutationFn: (p: any) => settingsApi.update(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });

  const update = (k: string, v: any) => setF((old: any) => ({ ...old, [k]: v }));
  const save = () => mut.mutate(f);

  if (!data) return <div className="p-6 text-ink-subtle">Yuklanmoqda...</div>;

  const banned: string[] = f.banned_words || [];
  const objs: any[] = f.objections || [];
  const sits: any[] = f.special_situations || [];

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-[22px] font-semibold text-ink">Sozlamalar</h1>
        <p className="mt-0.5 text-[13px] text-ink-subtle">AI xatti-harakati, persona, sotuv taktikasi</p>
      </div>

      {/* Basic */}
      <Section icon={<Bot size={14} />} title="AI asosiy">
        <Toggle checked={f.ai_enabled} onChange={(v: boolean) => update("ai_enabled", v)}
          label="AI javob berish" hint="Triggerlar mos kelmasa AI javob bersinmi" />

        <div className="border-t pt-2 my-2" style={{ borderColor: "var(--divider)" }}>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Ovozli xabarlarga javob turi</label>
          <select value={f.voice_reply_mode || "text"} onChange={(e) => update("voice_reply_mode", e.target.value)}
            className="w-full px-3 py-2 text-[13px]">
            <option value="text">Faqat matnli javob</option>
            <option value="mixed">Aralash (matn va ovoz)</option>
            <option value="voice">Faqat ovozli javob</option>
          </select>
          <p className="mt-1 text-[11.5px] text-ink-subtle">Foydalanuvchi ovozli xabar yuborganda qanday javob berishini belgilaydi.</p>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">System prompt</label>
          <textarea value={f.system_prompt || ""} onChange={(e) => update("system_prompt", e.target.value)}
            rows={6} className="w-full px-3 py-2 text-[13px] font-mono" />
        </div>
      </Section>

      {/* Own Gemini / Groq key (used when tariff=free) */}
      <Section icon={<Sparkles size={14} />} title="API kalitlar">
        <p className="text-[12px] text-ink-subtle">
          <b>AI Provayder</b>: o'z API kalitingiz bilan Gemini, Groq, OpenAI yoki Claude'dan foydalaning — har bir AI javob tokeni shu kalit hisobidan yonadi. <b>UzbekVoice API</b>: ovozli xabarlar uchun.
        </p>

        <div className="mb-4">
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">AI Provayderni Tanlang</label>
          <div className="flex bg-surface rounded-md border p-1" style={{ borderColor: "var(--border)", maxWidth: "480px" }}>
            <button
              onClick={() => update("ai_provider", "gemini")}
              className={`flex-1 py-1.5 text-[12px] font-medium rounded ${f.ai_provider === "gemini" || !f.ai_provider ? "bg-brand text-white" : "text-ink-subtle hover:bg-black/5 dark:hover:bg-white/5"}`}
            >
              Gemini
            </button>
            <button
              onClick={() => update("ai_provider", "groq")}
              className={`flex-1 py-1.5 text-[12px] font-medium rounded ${f.ai_provider === "groq" ? "bg-brand text-white" : "text-ink-subtle hover:bg-black/5 dark:hover:bg-white/5"}`}
            >
              Groq
            </button>
            <button
              onClick={() => update("ai_provider", "openai")}
              className={`flex-1 py-1.5 text-[12px] font-medium rounded ${f.ai_provider === "openai" ? "bg-brand text-white" : "text-ink-subtle hover:bg-black/5 dark:hover:bg-white/5"}`}
            >
              OpenAI
            </button>
            <button
              onClick={() => update("ai_provider", "claude")}
              className={`flex-1 py-1.5 text-[12px] font-medium rounded ${f.ai_provider === "claude" ? "bg-brand text-white" : "text-ink-subtle hover:bg-black/5 dark:hover:bg-white/5"}`}
            >
              Claude
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {(!f.ai_provider || f.ai_provider === "gemini") && (
            <>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Gemini API kalit</label>
                {!editGemini ? (
                  <div className="flex items-center justify-between w-full px-3 py-2 border rounded-md bg-transparent" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center gap-1.5 text-[13px] text-green-500 font-medium">
                      <Shield size={14} /> Kiritilgan
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={handleTestGemini} disabled={testGeminiStatus.loading} className="text-[12px] text-blue-500 hover:underline">
                        {testGeminiStatus.loading ? "..." : "Tekshirish"}
                      </button>
                      <button onClick={() => setEditGemini(true)} className="text-[12px] text-brand hover:underline">
                        Tahrirlash
                      </button>
                      <button onClick={() => {
                        if (window.confirm("Rostdan ham Gemini API kalitini o'chirmoqchimisiz?")) {
                          update("gemini_api_key", "");
                          mut.mutate({ ...f, gemini_api_key: "" });
                        }
                      }} className="text-[12px] text-red-500 hover:underline">
                        O'chirish
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full">
                    <input type="password" value={f.gemini_api_key || ""}
                      onChange={(e) => update("gemini_api_key", e.target.value)}
                      placeholder="AIza..."
                      className="w-full px-3 py-2 text-[13px] pr-[80px]" />
                    <button onClick={handleTestGemini} disabled={testGeminiStatus.loading} className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-blue-500 font-medium hover:underline">
                      {testGeminiStatus.loading ? "..." : "Tekshirish"}
                    </button>
                  </div>
                )}
                {testGeminiStatus.ok === true && <p className="mt-1 text-[11.5px] text-green-500">✅ Ishlamoqda!</p>}
                {testGeminiStatus.ok === false && <p className="mt-1 text-[11.5px] text-red-500">❌ Xatolik: {testGeminiStatus.error}</p>}
                <p className="mt-1 text-[11.5px] text-ink-subtle">
                  <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="text-brand hover:underline">aistudio.google.com</a> → Get API key
                </p>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Gemini Model (Tanlang yoki nomini yozing)</label>
                <input
                  type="text"
                  list="gemini-models-list"
                  value={f.gemini_model || "gemini-2.5-flash"}
                  onChange={(e) => update("gemini_model", e.target.value)}
                  placeholder="gemini-2.5-flash"
                  className="w-full px-3 py-2 text-[13px]"
                />
                <datalist id="gemini-models-list">
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Standart, tez)</option>
                  <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                  <option value="gemini-2.0-flash-lite">gemini-2.0-flash-lite (Eng arzon)</option>
                  <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                  <option value="gemini-1.5-pro">gemini-1.5-pro (Aqlli, katta)</option>
                </datalist>
              </div>
            </>
          )}

          {f.ai_provider === "groq" && (
            <>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Groq API kalit</label>
                {!editGroq ? (
                  <div className="flex items-center justify-between w-full px-3 py-2 border rounded-md bg-transparent" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center gap-1.5 text-[13px] text-green-500 font-medium">
                      <Shield size={14} /> Kiritilgan
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={handleTestGroq} disabled={testGroqStatus.loading} className="text-[12px] text-blue-500 hover:underline">
                        {testGroqStatus.loading ? "..." : "Tekshirish"}
                      </button>
                      <button onClick={() => setEditGroq(true)} className="text-[12px] text-brand hover:underline">
                        Tahrirlash
                      </button>
                      <button onClick={() => {
                        if (window.confirm("Rostdan ham Groq API kalitini o'chirmoqchimisiz?")) {
                          update("groq_api_key", "");
                          mut.mutate({ ...f, groq_api_key: "" });
                        }
                      }} className="text-[12px] text-red-500 hover:underline">
                        O'chirish
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full">
                    <input type="password" value={f.groq_api_key || ""}
                      onChange={(e) => update("groq_api_key", e.target.value)}
                      placeholder="gsk_..."
                      className="w-full px-3 py-2 text-[13px] pr-[80px]" />
                    <button onClick={handleTestGroq} disabled={testGroqStatus.loading} className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-blue-500 font-medium hover:underline">
                      {testGroqStatus.loading ? "..." : "Tekshirish"}
                    </button>
                  </div>
                )}
                {testGroqStatus.ok === true && <p className="mt-1 text-[11.5px] text-green-500">✅ Ishlamoqda!</p>}
                {testGroqStatus.ok === false && <p className="mt-1 text-[11.5px] text-red-500">❌ Xatolik: {testGroqStatus.error}</p>}
                <p className="mt-1 text-[11.5px] text-ink-subtle">
                  <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-brand hover:underline">console.groq.com</a> → API Keys
                </p>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Groq Model</label>
                <select
                  value={f.groq_model || groqModelOptions[0] || ""}
                  onChange={(e) => update("groq_model", e.target.value)}
                  className="w-full px-3 py-2 text-[13px]"
                >
                  {!groqModelOptions.includes(f.groq_model) && f.groq_model && (
                    <option value={f.groq_model}>{f.groq_model} (saqlangan, ro'yxatda yo'q)</option>
                  )}
                  {groqModelOptions.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <p className="mt-1 text-[11.5px] text-ink-subtle">
                  {groqModelsData?.ok
                    ? "Ro'yxat Groq hisobingizdan (API kalitingiz orqali) real vaqtda olindi — bularning barchasi hozir mavjud va ishlaydi."
                    : "Groq API kalitini kiritib saqlang — shundan so'ng bu yerda faqat hisobingizda haqiqatan mavjud bo'lgan modellar ro'yxati ko'rinadi."}
                </p>
              </div>
            </>
          )}

          {f.ai_provider === "openai" && (
            <>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">OpenAI API kalit</label>
                {!editOpenai ? (
                  <div className="flex items-center justify-between w-full px-3 py-2 border rounded-md bg-transparent" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center gap-1.5 text-[13px] text-green-500 font-medium">
                      <Shield size={14} /> Kiritilgan
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={handleTestOpenai} disabled={testOpenaiStatus.loading} className="text-[12px] text-blue-500 hover:underline">
                        {testOpenaiStatus.loading ? "..." : "Tekshirish"}
                      </button>
                      <button onClick={() => setEditOpenai(true)} className="text-[12px] text-brand hover:underline">
                        Tahrirlash
                      </button>
                      <button onClick={() => {
                        if (window.confirm("Rostdan ham OpenAI API kalitini o'chirmoqchimisiz?")) {
                          update("openai_api_key", "");
                          mut.mutate({ ...f, openai_api_key: "" });
                        }
                      }} className="text-[12px] text-red-500 hover:underline">
                        O'chirish
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full">
                    <input type="password" value={f.openai_api_key || ""}
                      onChange={(e) => update("openai_api_key", e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 text-[13px] pr-[80px]" />
                    <button onClick={handleTestOpenai} disabled={testOpenaiStatus.loading} className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-blue-500 font-medium hover:underline">
                      {testOpenaiStatus.loading ? "..." : "Tekshirish"}
                    </button>
                  </div>
                )}
                {testOpenaiStatus.ok === true && <p className="mt-1 text-[11.5px] text-green-500">✅ Ishlamoqda!</p>}
                {testOpenaiStatus.ok === false && <p className="mt-1 text-[11.5px] text-red-500">❌ Xatolik: {testOpenaiStatus.error}</p>}
                <p className="mt-1 text-[11.5px] text-ink-subtle">
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-brand hover:underline">platform.openai.com</a> → API Keys
                </p>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">OpenAI Model</label>
                <input
                  type="text"
                  list="openai-models-list"
                  value={f.openai_model || "gpt-4o-mini"}
                  onChange={(e) => update("openai_model", e.target.value)}
                  placeholder="gpt-4o-mini"
                  className="w-full px-3 py-2 text-[13px]"
                />
                <datalist id="openai-models-list">
                  <option value="gpt-4o-mini">gpt-4o-mini (Arzon, tez)</option>
                  <option value="gpt-4o">gpt-4o (Aqlli)</option>
                  <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                  <option value="o4-mini">o4-mini</option>
                </datalist>
              </div>
            </>
          )}

          {f.ai_provider === "claude" && (
            <>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Claude API kalit</label>
                {!editClaude ? (
                  <div className="flex items-center justify-between w-full px-3 py-2 border rounded-md bg-transparent" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center gap-1.5 text-[13px] text-green-500 font-medium">
                      <Shield size={14} /> Kiritilgan
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={handleTestClaude} disabled={testClaudeStatus.loading} className="text-[12px] text-blue-500 hover:underline">
                        {testClaudeStatus.loading ? "..." : "Tekshirish"}
                      </button>
                      <button onClick={() => setEditClaude(true)} className="text-[12px] text-brand hover:underline">
                        Tahrirlash
                      </button>
                      <button onClick={() => {
                        if (window.confirm("Rostdan ham Claude API kalitini o'chirmoqchimisiz?")) {
                          update("claude_api_key", "");
                          mut.mutate({ ...f, claude_api_key: "" });
                        }
                      }} className="text-[12px] text-red-500 hover:underline">
                        O'chirish
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full">
                    <input type="password" value={f.claude_api_key || ""}
                      onChange={(e) => update("claude_api_key", e.target.value)}
                      placeholder="sk-ant-..."
                      className="w-full px-3 py-2 text-[13px] pr-[80px]" />
                    <button onClick={handleTestClaude} disabled={testClaudeStatus.loading} className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-blue-500 font-medium hover:underline">
                      {testClaudeStatus.loading ? "..." : "Tekshirish"}
                    </button>
                  </div>
                )}
                {testClaudeStatus.ok === true && <p className="mt-1 text-[11.5px] text-green-500">✅ Ishlamoqda!</p>}
                {testClaudeStatus.ok === false && <p className="mt-1 text-[11.5px] text-red-500">❌ Xatolik: {testClaudeStatus.error}</p>}
                <p className="mt-1 text-[11.5px] text-ink-subtle">
                  <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-brand hover:underline">console.anthropic.com</a> → API Keys
                </p>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Claude Model</label>
                <input
                  type="text"
                  list="claude-models-list"
                  value={f.claude_model || "claude-3-5-haiku-latest"}
                  onChange={(e) => update("claude_model", e.target.value)}
                  placeholder="claude-3-5-haiku-latest"
                  className="w-full px-3 py-2 text-[13px]"
                />
                <datalist id="claude-models-list">
                  <option value="claude-3-5-haiku-latest">claude-3-5-haiku (Tez, arzon)</option>
                  <option value="claude-3-5-sonnet-latest">claude-3-5-sonnet (Aqlli)</option>
                  <option value="claude-3-haiku-20240307">claude-3-haiku</option>
                </datalist>
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">UzbekVoice API kalit</label>
            {!editVoice ? (
              <div className="flex items-center justify-between w-full px-3 py-2 border rounded-md bg-transparent" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-1.5 text-[13px] text-green-500 font-medium">
                  <Shield size={14} /> Kiritilgan
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={handleTestVoice} disabled={testVoiceStatus.loading} className="text-[12px] text-blue-500 hover:underline">
                    {testVoiceStatus.loading ? "..." : "Tekshirish"}
                  </button>
                  <button onClick={() => setEditVoice(true)} className="text-[12px] text-brand hover:underline">
                    Tahrirlash
                  </button>
                  <button onClick={() => {
                    if (window.confirm("Rostdan ham UzbekVoice API kalitini o'chirmoqchimisiz?")) {
                      update("uzbekvoice_api_key", "");
                      mut.mutate({ ...f, uzbekvoice_api_key: "" });
                    }
                  }} className="text-[12px] text-red-500 hover:underline">
                    O'chirish
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative w-full">
                <input type="password" value={f.uzbekvoice_api_key || ""}
                  onChange={(e) => update("uzbekvoice_api_key", e.target.value)}
                  placeholder="Kalitni kiriting..."
                  className="w-full px-3 py-2 text-[13px] pr-[80px]" />
                <button onClick={handleTestVoice} disabled={testVoiceStatus.loading} className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-blue-500 font-medium hover:underline">
                  {testVoiceStatus.loading ? "..." : "Tekshirish"}
                </button>
              </div>
            )}
            {testVoiceStatus.ok === true && <p className="mt-1 text-[11.5px] text-green-500">✅ Ishlamoqda!</p>}
            {testVoiceStatus.ok === false && <p className="mt-1 text-[11.5px] text-red-500">❌ Xatolik: {testVoiceStatus.error}</p>}
            <p className="mt-1 text-[11.5px] text-ink-subtle">
              <a href="https://uzbekvoice.ai" target="_blank" rel="noreferrer" className="text-brand hover:underline">uzbekvoice.ai</a> → Get API key
            </p>
          </div>
        </div>
      </Section>

      {/* Persona */}
      <Section icon={<Sparkles size={14} />} title="Persona (AI shaxsiyati)">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Assistant ismi</label>
            <input value={f.persona_name || ""} onChange={(e) => update("persona_name", e.target.value)}
              placeholder="Aziza" className="w-full px-3 py-2 text-[13px]" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Uslub (ton)</label>
            <select value={f.persona_tone || "friendly"} onChange={(e) => update("persona_tone", e.target.value)}
              className="w-full px-3 py-2 text-[13px]">
              <option value="friendly">Do'stona (friendly)</option>
              <option value="formal">Rasmiy (formal)</option>
              <option value="energetic">Energetik (energetic)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Til</label>
            <select value={f.language || "uz"} onChange={(e) => update("language", e.target.value)}
              className="w-full px-3 py-2 text-[13px]">
              <option value="uz">O'zbek</option>
              <option value="ru">Rus</option>
              <option value="en">Ingliz</option>
            </select>
          </div>
        </div>
        <div className="border-t pt-2" style={{ borderColor: "var(--divider)" }}>
          <Toggle checked={f.persona_short} onChange={(v: boolean) => update("persona_short", v)}
            label="Qisqa javoblar" hint="2-3 gapdan oshmasin" />
          <Toggle checked={f.persona_we_form} onChange={(v: boolean) => update("persona_we_form", v)}
            label="'Biz' tilida gapirish" hint="'Men' o'rniga 'biz'" />
          <Toggle checked={f.persona_emoji} onChange={(v: boolean) => update("persona_emoji", v)}
            label="Emoji ishlatish" hint="Kam va o'rinli" />
        </div>
      </Section>

      {/* Sales behavior */}
      <Section icon={<Users size={14} />} title="Sotuv taktikasi">
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">
            Sotuv agressivligi: {f.sales_aggressiveness || 5}/10
          </label>
          <input type="range" min={1} max={10} value={f.sales_aggressiveness || 5}
            onChange={(e) => update("sales_aggressiveness", parseInt(e.target.value))} className="w-full" />
          <div className="flex justify-between text-[11px] text-ink-subtle mt-1"><span>Yumshoq</span><span>Balansli</span><span>Faol</span></div>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">To'lov usullarini eslatish</label>
          <select value={f.payment_mention || "if_asked"} onChange={(e) => update("payment_mention", e.target.value)}
            className="w-full px-3 py-2 text-[13px]">
            <option value="never">Hech qachon aytmaslik</option>
            <option value="if_asked">Faqat so'ralsa</option>
            <option value="always">Har javobda eslatib turish</option>
          </select>
        </div>
        <div className="border-t pt-2" style={{ borderColor: "var(--divider)" }}>
          <Toggle checked={f.mention_discount} onChange={(v: boolean) => update("mention_discount", v)}
            label="Chegirmalarni aytishga ruxsat" />
          <Toggle checked={f.block_installment} onChange={(v: boolean) => update("block_installment", v)}
            label="'Nasiya/muddatli/kredit' so'zlarni bloklash"
            hint="AI bu so'zlarni ishlatmaydi, so'ralsa menejerga o'tkazadi" />
          <Toggle checked={f.push_leave_number} onChange={(v: boolean) => update("push_leave_number", v)}
            label="Suhbatda telefon raqami so'rash" />
        </div>
      </Section>

      {/* Data collection */}
      <Section icon={<Users size={14} />} title="Ma'lumot yig'ish">
        <Toggle checked={f.collect_name} onChange={(v: boolean) => update("collect_name", v)} label="Ism" />
        <Toggle checked={f.collect_phone} onChange={(v: boolean) => update("collect_phone", v)} label="Telefon raqami" />
        <Toggle checked={f.collect_business} onChange={(v: boolean) => update("collect_business", v)} label="Biznes turi / kompaniya" />
        <Toggle checked={f.collect_budget} onChange={(v: boolean) => update("collect_budget", v)} label="Byudjet" />
      </Section>

      {/* Business hours */}
      <Section icon={<Clock size={14} />} title="Ish soatlari">
        <Toggle checked={f.work_hours_enabled} onChange={(v: boolean) => update("work_hours_enabled", v)}
          label="Ish soatlari faol" hint="Tashqarida after_hours xabari yuboriladi" />
        {f.work_hours_enabled && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] uppercase tracking-wider text-ink-subtle">Boshlanish</label>
                <input type="time" value={f.work_hours_start || "09:00"} onChange={(e) => update("work_hours_start", e.target.value)}
                  className="w-full px-3 py-2 text-[13px]" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] uppercase tracking-wider text-ink-subtle">Tugash</label>
                <input type="time" value={f.work_hours_end || "21:00"} onChange={(e) => update("work_hours_end", e.target.value)}
                  className="w-full px-3 py-2 text-[13px]" />
              </div>
            </div>
            <textarea value={f.after_hours_message || ""} onChange={(e) => update("after_hours_message", e.target.value)}
              rows={2} placeholder="Ish vaqti tugadi. Ertaga soat 9 dan javob beramiz." className="w-full px-3 py-2 text-[13px]" />
          </>
        )}
      </Section>

      {/* Welcome / Fallback */}
      <Section icon={<MessageSquareOff size={14} />} title="Xabar shablonlari">
        <div>
          <label className="mb-1 block text-[11px] uppercase tracking-wider text-ink-subtle">Salomlashuv (birinchi xabar)</label>
          <textarea value={f.welcome_message || ""} onChange={(e) => update("welcome_message", e.target.value)}
            rows={2} className="w-full px-3 py-2 text-[13px]" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] uppercase tracking-wider text-ink-subtle">Fallback (hech nima mos kelmasa)</label>
          <textarea value={f.fallback_message || ""} onChange={(e) => update("fallback_message", e.target.value)}
            rows={2} className="w-full px-3 py-2 text-[13px]" />
        </div>
      </Section>

      {/* Banned words */}
      <Section icon={<Shield size={14} />} title="Taqiqlangan so'zlar">
        <p className="text-[12px] text-ink-subtle">AI bu so'zlarni ishlatmaydi. Enter bilan qo'shing.</p>
        <div className="flex flex-wrap gap-1.5">
          {banned.map((w, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px]"
              style={{ backgroundColor: "var(--raised)", color: "var(--ink)" }}>
              {w}
              <button onClick={() => update("banned_words", banned.filter((_, j) => j !== i))}
                className="text-ink-subtle hover:text-red-400"><Trash2 size={11} /></button>
            </span>
          ))}
        </div>
        <input placeholder="Yangi so'z (Enter)" onKeyDown={(e) => {
          if (e.key === "Enter") {
            const v = (e.target as HTMLInputElement).value.trim();
            if (v) { update("banned_words", [...banned, v]); (e.target as HTMLInputElement).value = ""; }
          }
        }} className="w-full px-3 py-2 text-[13px]" />
      </Section>

      {/* Objections */}
      <Section icon={<MessageSquareOff size={14} />} title="E'tirozlarga javoblar">
        <p className="text-[12px] text-ink-subtle">Mijoz aytadigan e'tiroz + AI qanday javob beradi.</p>
        {objs.map((o: any, i: number) => (
          <div key={i} className="rounded-md p-3 space-y-2" style={{ backgroundColor: "var(--raised)" }}>
            <div className="flex gap-2">
              <input value={o.label || ""} placeholder="Mijoz e'tirozi (masalan: 'qimmat')"
                onChange={(e) => {
                  const c = [...objs]; c[i] = { ...c[i], label: e.target.value };
                  update("objections", c);
                }} className="flex-1 px-2 py-1 text-[12px]" />
              <input type="checkbox" checked={!!o.enabled}
                onChange={(e) => { const c = [...objs]; c[i] = { ...c[i], enabled: e.target.checked }; update("objections", c); }}
                className="mt-1" />
              <button onClick={() => update("objections", objs.filter((_: any, j: number) => j !== i))}
                className="text-ink-subtle hover:text-red-400"><Trash2 size={12} /></button>
            </div>
            <textarea value={o.response || ""} placeholder="AI javobi..."
              onChange={(e) => { const c = [...objs]; c[i] = { ...c[i], response: e.target.value }; update("objections", c); }}
              rows={2} className="w-full px-2 py-1 text-[12px]" />
          </div>
        ))}
        <button onClick={() => update("objections", [...objs, { key: "", label: "", enabled: true, response: "" }])}
          className="flex items-center gap-1 text-[12px] text-brand hover:underline">
          <Plus size={12} /> E'tiroz qo'shish
        </button>
      </Section>

      {/* Special situations */}
      <Section icon={<Sparkles size={14} />} title="Maxsus vaziyatlar">
        <p className="text-[12px] text-ink-subtle">Ma'lum trigger uchun aynan shu javob.</p>
        {sits.map((s: any, i: number) => (
          <div key={i} className="rounded-md p-3 space-y-2" style={{ backgroundColor: "var(--raised)" }}>
            <div className="flex gap-2">
              <input value={s.trigger || ""} placeholder="Trigger (masalan: 'kafolat haqida so'ralsa')"
                onChange={(e) => { const c = [...sits]; c[i] = { ...c[i], trigger: e.target.value }; update("special_situations", c); }}
                className="flex-1 px-2 py-1 text-[12px]" />
              <button onClick={() => update("special_situations", sits.filter((_: any, j: number) => j !== i))}
                className="text-ink-subtle hover:text-red-400"><Trash2 size={12} /></button>
            </div>
            <textarea value={s.response || ""} placeholder="Javob..."
              onChange={(e) => { const c = [...sits]; c[i] = { ...c[i], response: e.target.value }; update("special_situations", c); }}
              rows={2} className="w-full px-2 py-1 text-[12px]" />
          </div>
        ))}
        <button onClick={() => update("special_situations", [...sits, { trigger: "", response: "" }])}
          className="flex items-center gap-1 text-[12px] text-brand hover:underline">
          <Plus size={12} /> Vaziyat qo'shish
        </button>
      </Section>

      {/* Save bar */}
      <div className="sticky bottom-0 flex items-center justify-between rounded-lg px-4 py-3"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
        <span className="text-[12px] text-ink-subtle">
          {mut.isPending ? "Saqlanmoqda..." : mut.isSuccess ? "✓ Saqlandi" : "O'zgartirishlarni saqlang"}
        </span>
        <button onClick={save} disabled={mut.isPending}
          className="flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium btn-primary disabled:opacity-70">
          <Save size={13} /> Saqlash
        </button>
      </div>
    </div>
  );
}
