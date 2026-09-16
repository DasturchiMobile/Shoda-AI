import { ReactNode } from "react";
import { cn } from "../lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "accent";

export function Badge({ children, tone = "neutral", className }:
  { children: ReactNode; tone?: Tone; className?: string }) {
  const map: Record<Tone, string> = {
    neutral: "bg-surface2 text-muted border-border",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    danger:  "bg-red-500/10 text-red-400 border-red-500/30",
    accent:  "bg-accent/10 text-accent-soft border-accent/30",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs", map[tone], className)}>
      {children}
    </span>
  );
}
