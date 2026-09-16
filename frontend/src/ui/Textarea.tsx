import { TextareaHTMLAttributes } from "react";
import { cn } from "../lib/utils";

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("input min-h-[96px] resize-y", className)} {...rest} />;
}
