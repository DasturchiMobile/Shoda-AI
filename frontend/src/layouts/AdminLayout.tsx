import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ToastHost } from "../ui/Toast";
import { Menu } from "lucide-react";

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar variant="admin" open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="flex-1 min-w-0">
        <div className="lg:hidden h-16 px-4 flex items-center justify-between border-b border-border bg-white/90 backdrop-blur sticky top-0 z-30">
          <div className="flex items-center gap-2"><span className="wordmark text-xl text-ink">Shoda</span><span className="rounded bg-accent px-1.5 py-0.5 text-[9px] font-extrabold text-white">AI</span></div>
          <button onClick={() => setMenuOpen(true)} className="h-10 w-10 grid place-items-center rounded-xl border border-border bg-white" aria-label="Menyuni ochish"><Menu size={19} /></button>
        </div>
        <Outlet />
      </main>
      <ToastHost />
    </div>
  );
}
