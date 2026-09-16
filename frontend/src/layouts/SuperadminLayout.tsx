import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ToastHost } from "../ui/Toast";
import { Menu } from "lucide-react";

export function SuperadminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar variant="superadmin" open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="flex-1 min-w-0">
        <div className="lg:hidden h-16 px-4 flex items-center justify-between border-b border-border bg-white"><span className="wordmark text-xl">Shoda AI</span><button onClick={() => setMenuOpen(true)} className="h-10 w-10 grid place-items-center rounded-xl border border-border" aria-label="Menyuni ochish"><Menu size={19}/></button></div>
        <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <Outlet />
        </div>
      </main>
      <ToastHost />
    </div>
  );
}
