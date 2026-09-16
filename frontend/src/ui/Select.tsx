import { SelectHTMLAttributes } from "react";
import { cn } from "../lib/utils";

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("input pr-8", className)} {...rest} />;
}
