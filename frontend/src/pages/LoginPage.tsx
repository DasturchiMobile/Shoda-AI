import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button, Input } from "../ui";

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const me = await login(username, password);
      nav(me.role === "superadmin" ? "/superadmin" : "/app", { replace: true });
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? "Kirishda xatolik");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-canvas px-4">
      <form onSubmit={submit} className="card p-8 w-full max-w-sm">
        <div className="text-2xl mb-1">
          <span className="wordmark text-accent-soft">Shoda</span>
          <span className="ml-1.5 font-medium">AI</span>
        </div>
        <div className="text-sm text-muted mb-6">Kirish</div>

        <label className="text-xs text-muted mb-1 block">Username</label>
        <Input value={username} onChange={(e) => setU(e.target.value)} autoFocus />
        <label className="text-xs text-muted mt-4 mb-1 block">Parol</label>
        <Input type="password" value={password} onChange={(e) => setP(e.target.value)} />

        {err && <div className="mt-4 text-sm text-red-400">{err}</div>}

        <Button type="submit" className="w-full mt-6" disabled={busy}>
          {busy ? "Kirilmoqda…" : "Kirish"}
        </Button>

        <div className="text-xs text-muted text-center mt-4">
          Hisobingiz yo'qmi?{" "}
          <Link to="/register" className="text-accent-soft hover:underline">
            Ro'yxatdan o'ting
          </Link>
        </div>
      </form>
    </div>
  );
}
