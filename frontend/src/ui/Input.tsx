import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "../lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input ref={ref} className={cn("input", className)} {...rest} />
  )
);
Input.displayName = "Input";
