import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersApi, type OrgUser } from "../api/users";
import { UserPlus, Trash2, Shield, UserRound, X } from "lucide-react";

function Modal({ open, onClose, title, children }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-md rounded-lg" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid var(--divider)" }}>
          <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="text-ink-subtle hover:text-ink"><X size={18} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function TeamPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery<OrgUser[]>({ queryKey: ["team"], queryFn: usersApi.list });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ username: "", password: "", role: "manager" as "manager" | "admin" });

  const create = useMutation({
    mutationFn: () => usersApi.create({ ...f, is_active: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["team"] }); setOpen(false); setF({ username: "", password: "", role: "manager" }); },
  });
  const del = useMutation({
    mutationFn: (id: number) => usersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-ink">Jamoa</h1>
          <p className="mt-0.5 text-[13px] text-ink-subtle">Adminlar va menejerlar</p>
        </div>
        <button onClick={() => setOpen(true)} className="flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium btn-primary">
          <UserPlus size={13} /> Yangi
        </button>
      </div>

      <div className="surface overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--divider)" }}>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Username</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Rol</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {data.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid var(--divider)" }}>
                <td className="px-4 py-3 font-medium text-ink">{u.username}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium"
                    style={{ backgroundColor: u.role === "admin" ? "var(--brand-soft)" : "var(--raised)",
                      color: u.role === "admin" ? "var(--brand)" : "var(--ink-muted)" }}>
                    {u.role === "admin" ? <Shield size={11} /> : <UserRound size={11} />}
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-[12px]" style={{ color: u.is_active ? "var(--success)" : "var(--ink-subtle)" }}>
                  {u.is_active ? "Faol" : "Nofaol"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { if (confirm("O'chirishga ishonchingiz komilmi?")) del.mutate(u.id); }}
                    className="text-ink-subtle hover:text-red-400"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-ink-subtle">Foydalanuvchilar yo'q</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Yangi foydalanuvchi">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Username</label>
            <input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} className="w-full px-3 py-2 text-[13px]" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Parol</label>
            <input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} className="w-full px-3 py-2 text-[13px]" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Rol</label>
            <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as any })} className="w-full px-3 py-2 text-[13px]">
              <option value="manager">Menejer (leadlarga javob beradi)</option>
              <option value="admin">Admin (to'liq boshqaruv)</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setOpen(false)} className="h-8 px-3 text-[13px] text-ink-subtle">Bekor</button>
            <button onClick={() => create.mutate()} disabled={create.isPending || !f.username || !f.password}
              className="h-8 rounded-md px-3 text-[13px] font-medium btn-primary disabled:opacity-50">
              {create.isPending ? "..." : "Yaratish"}
            </button>
          </div>
          {create.isError && <p className="text-[12px]" style={{ color: "var(--danger)" }}>Xatolik: {(create.error as any)?.response?.data?.detail || "yaratib bo'lmadi"}</p>}
        </div>
      </Modal>
    </div>
  );
}
