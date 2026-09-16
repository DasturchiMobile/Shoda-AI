import { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/utils";

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("card overflow-hidden", className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}
export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-surface2 text-muted text-xs uppercase tracking-wider">{children}</thead>;
}
export function TR({ children, className, ...rest }: HTMLAttributes<HTMLTableRowElement> & { children?: ReactNode }) {
  return <tr className={cn("border-t border-border hover:bg-surface2/50 transition", className)} {...rest}>{children}</tr>;
}
export function TH({ children, className, ...rest }: HTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return <th className={cn("text-left font-medium px-4 py-2.5", className)} {...rest}>{children}</th>;
}
export function TD({ children, className, ...rest }: HTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return <td className={cn("px-4 py-2.5 align-middle", className)} {...rest}>{children}</td>;
}
