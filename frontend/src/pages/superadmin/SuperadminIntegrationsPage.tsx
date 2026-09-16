import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Save, CheckCircle2, XCircle } from "lucide-react";
import { api } from "../../api/client";

type Read = {
  gemini_api_key_set?: boolean;
  gemini_api_key?: string | null;
  gemini_model?: string;
};

export function SuperadminIntegrationsPage() {
  const qc = useQueryClient();
  const { data } = useQuery<Read>({
    queryKey: ["sa-platform-settings"],
    queryFn: async () => (await api.get("/superadmin/platform-settings")).data,
  });
  const [key, setKey] = useState("");
  const [model, setModel] = useState("");

  useEffect(() => {
    if (data) setModel(data.gemini_model || "gemini-1.5-flash");
  }, [data]);

  const mut = useMutation({
    mutationFn: (b: any) => api.put("/superadmin/platform-settings", b).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sa-platform-settings"] }); setKey(""); },
  });

  const keySet = !!(data?.gemini_api_key_set || data?.gemini_api_key);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold text-ink">Platforma integratsiyalari</h1>
        <p className="mt-0.5 text-[13px] text-ink-subtle">Barcha tashkilotlar shu kalitdan foydalanadi</p>
      </div>

      <div className="surface p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md" style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand)" }}>
            <Sparkles size={16} />
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-semibold text-ink">Google Gemini AI</div>
            <div className="text-[12px] text-ink-subtle">AI javob generatsiyasi uchun kalit (aistudio.google.com)</div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium"
            style={{ backgroundColor: keySet ? "rgba(74,222,128,0.12)" : "var(--raised)",
              color: keySet ? "var(--success)" : "var(--ink-subtle)" }}>
            {keySet ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
            {keySet ? "Sozlangan" : "Sozlanmagan"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">API kalit</label>
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)}
              placeholder={keySet ? "•••••••••••••" : "AIza..."}
              className="w-full px-3 py-2 text-[13px]" />
            <p className="mt-1 text-[11.5px] text-ink-subtle">
              {keySet ? "Kalit saqlangan. O'zgartirish uchun yangisini yozing." : "aistudio.google.com → Get API key"}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Model</label>
            <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full px-3 py-2 text-[13px]">
              <option value="gemini-1.5-flash">gemini-1.5-flash (arzon)</option>
              <option value="gemini-1.5-flash-8b">gemini-1.5-flash-8b (eng arzon)</option>
              <option value="gemini-2.0-flash">gemini-2.0-flash</option>
              <option value="gemini-2.0-flash-lite">gemini-2.0-flash-lite</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro (kuchli, qimmat)</option>
            </select>
            <p className="mt-1 text-[11.5px] text-ink-subtle">Tashkilotlarga token narxi shu model asosida hisoblanadi</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => mut.mutate({ ...(key ? { gemini_api_key: key } : {}), gemini_model: model })}
          disabled={mut.isPending}
          className="flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium btn-primary disabled:opacity-70">
          <Save size={13} /> {mut.isPending ? "Saqlanmoqda..." : "Saqlash"}
        </button>
      </div>
      {mut.isSuccess && <p className="text-[12px]" style={{ color: "var(--success)" }}>✓ Saqlandi</p>}
      {mut.isError && <p className="text-[12px]" style={{ color: "var(--danger)" }}>Xato: {(mut.error as any)?.response?.data?.detail || "urinib bo'lmadi"}</p>}
    </div>
  );
}
