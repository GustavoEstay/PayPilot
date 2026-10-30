import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hideLabel?: boolean;
}

export function Input({ label, hideLabel = false, className, id, ...props }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <label
        htmlFor={inputId}
        className={cn("text-xs font-medium text-slate-600", hideLabel && "sr-only")}
      >
        {label}
      </label>
      <input
        id={inputId}
        className={cn(
          "h-9 w-full rounded-lg bg-white px-3 text-sm text-slate-900 shadow-xs ring-1 ring-slate-300 ring-inset placeholder:text-slate-400",
          "focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none",
        )}
        {...props}
      />
    </div>
  );
}
