import { NavLink } from "react-router-dom";
import { LayoutDashboard, Package, Users, Settings, Building2, Inbox, LogOut, Folder, Zap, Send, BookOpen, Plug, Wallet, X, Sparkles } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../lib/utils";

type Item = { to: string; label: string; icon: JSX.Element };

const adminGroups: { title: string; items: Item[] }[] = [
  {
    title: "Boshqaruv",
    items: [
      { to: "/app", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
    ],
  },
  {
    title: "Ish maydoni",
    items: [
      { to: "/app/products", label: "Mahsulotlar", icon: <Package size={16} /> },
      { to: "/app/categories", label: "Kategoriyalar", icon: <Folder size={16} /> },
      { to: "/app/triggers", label: "Triggerlar", icon: <Zap size={16} /> },
      { to: "/app/channels", label: "Majburiy obuna", icon: <Send size={16} /> },
      { to: "/app/knowledge", label: "Bilim bazasi", icon: <BookOpen size={16} /> },
      { to: "/app/leads", label: "Lidlar", icon: <Users size={16} /> },
      { to: "/app/integrations", label: "Integratsiyalar", icon: <Plug size={16} /> },
    ],
  },
  {
    title: "Sozlash",
    items: [
      { to: "/app/team", label: "Jamoa", icon: <Users size={16} /> },
      { to: "/app/billing", label: "Balans", icon: <Wallet size={16} /> },
      { to: "/app/settings", label: "Sozlamalar", icon: <Settings size={16} /> },
    ],
  },
];

const superGroups: { title: string; items: Item[] }[] = [
  {
    title: "Boshqaruv",
    items: [
      { to: "/superadmin", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
    ],
  },
  {
    title: "Tizim",
    items: [
      { to: "/superadmin/registrations", label: "Arizalar", icon: <Inbox size={16} /> },
      { to: "/superadmin/tenants", label: "Tashkilotlar", icon: <Building2 size={16} /> },
      { to: "/superadmin/billing", label: "Balanslar", icon: <Wallet size={16} /> },
      { to: "/superadmin/integrations", label: "Integratsiyalar", icon: <Plug size={16} /> },
    ],
  },
];

export function Sidebar({ variant, open = false, onClose }: { variant: "admin" | "superadmin"; open?: boolean; onClose?: () => void }) {
  const { me, logout } = useAuth();
  const groups = variant === "admin" ? adminGroups : superGroups;

  return (
    <>
      {open && <button onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden" aria-label="Menyuni yopish" />}
    <aside className={`w-[268px] shrink-0 h-screen fixed lg:sticky top-0 z-50 lg:z-20 flex flex-col bg-surface border-r border-border transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
      <div className="px-6 pt-7 pb-6 flex items-start justify-between">
        <div>
        <div className="flex items-center gap-2">
          <span className="wordmark text-[25px] text-ink">Shoda</span>
          <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-extrabold text-white">AI</span>
        </div>
        <div className="mt-1 text-[10px] font-bold uppercase tracking-[.18em] text-muted">Savdo yordamchisi</div>
        {variant === "superadmin" && (
          <div className="mt-1 text-[11px] uppercase tracking-wider text-accent">Superadmin</div>
        )}
        </div>
        <button onClick={onClose} className="lg:hidden p-2 rounded-lg hover:bg-surface2"><X size={18} /></button>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 space-y-7 pb-4">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[.16em] text-muted">{g.title}</div>
            <div className="space-y-0.5">
              {g.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  onClick={onClose}
                  end={it.to === "/app" || it.to === "/superadmin"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all",
                      isActive
                        ? "bg-accent text-white shadow-[0_8px_20px_rgba(49,91,232,.22)]"
                        : "text-muted hover:text-ink hover:bg-surface2"
                    )
                  }
                >
                  {it.icon}
                  {it.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4">
        {variant === "admin" && <div className="mb-3 rounded-2xl bg-[#eef2ff] p-3.5"><div className="flex items-center gap-2 text-xs font-bold text-accent"><Sparkles size={14}/> AI yordamchi tayyor</div><p className="mt-1.5 text-[11px] leading-5 text-muted">Bilim bazasini to‘ldirib, aniqroq javoblar oling.</p></div>}
        <div className="flex items-center gap-2.5 p-2 rounded-xl border border-border bg-white">
          <div className="h-9 w-9 rounded-xl bg-ink text-white flex items-center justify-center text-sm font-bold">
            {me?.username?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{me?.username}</div>
            <div className="text-[11px] text-muted truncate">{me?.org_name}</div>
          </div>
          <button className="btn-ghost !p-2" onClick={logout} title="Chiqish">
            <LogOut size={16} />
          </button>
        </div>

        <div className="mt-3 text-center text-[9.5px] leading-tight text-muted/70">
          Created by{" "}
          <a
            href="https://t.me/namangan_raqamlashtirish"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-muted hover:text-accent-soft transition"
          >
            SuniCode LLC
          </a>
        </div>
      </div>
    </aside>
    </>
  );
}
