import { HTMLAttributes } from "react";
import { cn } from "../lib/utils";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card p-4", className)} {...rest} />;
}
