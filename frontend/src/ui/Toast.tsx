import { useToast } from "../hooks/useToast";

export function ToastHost() {
  const { items } = useToast();
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`card px-4 py-2.5 text-sm shadow-lg border ${
            t.kind === "error" ? "border-red-500/40 text-red-300" :
            t.kind === "success" ? "border-emerald-500/40 text-emerald-300" :
            "border-accent/40 text-ink"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
