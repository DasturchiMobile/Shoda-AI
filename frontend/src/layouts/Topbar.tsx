export function Topbar({ title, subtitle, right }:
  { title?: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="h-16 border-b border-border bg-white/85 backdrop-blur-xl sticky top-0 z-30 hidden lg:flex items-center px-8 justify-between">
      <div className="flex items-baseline gap-3">
        {title && <div className="text-sm font-bold">{title}</div>}
        {subtitle && <><span className="h-1 w-1 rounded-full bg-slate-300"/><div className="text-xs text-muted">{subtitle}</div></>}
      </div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  );
}
