import { useId, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label: string;
  options: readonly SelectOption[];
  /** Label of the empty option; omit to force a value. */
  placeholder?: string;
  hideLabel?: boolean;
}

export function Select({
  label,
  options,
  placeholder,
  hideLabel = false,
  className,
  id,
  ...props
}: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <label
        htmlFor={selectId}
        className={cn("text-xs font-medium text-slate-600", hideLabel && "sr-only")}
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            "h-9 w-full appearance-none rounded-lg bg-white pr-8 pl-3 text-sm text-slate-900 shadow-xs ring-1 ring-slate-300 ring-inset",
            "focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
          {...props}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-500"
          fill="currentColor"
        >
          <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" />
        </svg>
      </div>
    </div>
  );
}
