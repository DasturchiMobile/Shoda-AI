import { Info } from "lucide-react";
import { ReactNode } from "react";

export function InfoTip({ children }: { children: ReactNode }) {
  return (
    <span className="group relative inline-flex ml-1 align-middle">
      <Info size={12} className="text-muted hover:text-ink cursor-help" />
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-20
        min-w-[220px] max-w-[280px] rounded-md bg-black/95 border border-border
        px-2.5 py-1.5 text-[11.5px] text-ink shadow-lg
        opacity-0 group-hover:opacity-100 transition-opacity">
        {children}
      </span>
    </span>
  );
}
