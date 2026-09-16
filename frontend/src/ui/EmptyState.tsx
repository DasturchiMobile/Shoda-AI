import { ReactNode } from "react";

export function EmptyState({ icon, title, description, action }:
  { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="card p-12 flex flex-col items-center text-center gap-3">
      {icon && <div className="text-accent-soft mb-1">{icon}</div>}
      <div className="text-lg font-medium">{title}</div>
      {description && <div className="text-muted text-sm max-w-md">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
