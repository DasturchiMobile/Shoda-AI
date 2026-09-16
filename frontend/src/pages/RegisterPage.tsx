import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button, Input } from "../ui";

export function RegisterPage() {
  const nav = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    org_name: "", admin_name: "", username: "", password: "",
    contact_phone: "", contact_telegram: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const upd = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const me = await register(form);
      nav(me.role === "superadmin" ? "/superadmin" : "/", { replace: true });
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? "Xatolik");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-canvas px-4 py-10">
      <form onSubmit={submit} className="card p-8 w-full max-w-md">
        <div className="text-2xl mb-1">
          <span className="wordmark text-accent-soft">Shoda</span>
          <span className="ml-1.5 font-medium">AI</span>
        </div>
        <div className="text-sm text-muted mb-6">Ro'yxatdan o'tish</div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted mb-1 block">Tashkilot nomi *</label>
            <Input required value={form.org_name} onChange={upd("org_name")} />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Admin ismi *</label>
            <Input required value={form.admin_name} onChange={upd("admin_name")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted mb-1 block">Username *</label>
              <Input required value={form.username} onChange={upd("username")} />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Parol *</label>
              <Input required type="password" value={form.password} onChange={upd("password")} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Telefon</label>
            <Input placeholder="+998..." value={form.contact_phone} onChange={upd("contact_phone")} />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Telegram</label>
            <Input placeholder="@username" value={form.contact_telegram} onChange={upd("contact_telegram")} />
          </div>
        </div>

        {err && <div className="mt-4 text-sm text-red-400">{err}</div>}

        <Button type="submit" className="w-full mt-6" disabled={busy}>
          {busy ? "Yaratilmoqda…" : "Hisob yaratish"}
        </Button>

        <div className="text-xs text-muted text-center mt-4">
          Hisobingiz bormi?{" "}
          <Link to="/login" className="text-accent-soft hover:underline">Kirish</Link>
        </div>
      </form>
    </div>
  );
}
