import type { SelectHTMLAttributes } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  wrapperClassName?: string;
};

const selectClass =
  "h-11 w-full appearance-none rounded-xl border border-paper-200 bg-white px-3.5 py-0 pr-10 text-sm leading-normal text-ink-900 outline-none transition focus:border-masala-500 focus:ring-2 focus:ring-masala-500/15";

export function SelectField({ children, className, wrapperClassName, ...props }: SelectFieldProps) {
  return (
    <div className={`relative ${wrapperClassName ?? "mt-1.5"}`}>
      <select {...props} className={`${selectClass} ${className ?? ""}`}>
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-400" />
    </div>
  );
}