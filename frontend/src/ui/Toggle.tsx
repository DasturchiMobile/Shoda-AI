export function Toggle({ checked, onChange, label }:
  { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <span
        onClick={() => onChange(!checked)}
        className={`h-5 w-9 rounded-full transition relative ${checked ? "bg-accent" : "bg-surface2 border border-border"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? "left-[18px]" : "left-0.5"}`}
        />
      </span>
      {label && <span className="text-sm">{label}</span>}
    </label>
  );
}
