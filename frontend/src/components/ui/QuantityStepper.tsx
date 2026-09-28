"use client";

import { cn } from "@/lib/cn";
import { MinusIcon, PlusIcon } from "@/components/ui/icons";

type Props = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
  /** Accessible name for the whole stepper, e.g. "Quantity for Sambar Masala". */
  label?: string;
};

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  size = "md",
  className,
  label = "Quantity",
}: Props) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  const dim = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const text = size === "sm" ? "text-sm w-7" : "text-sm w-8";

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex items-center rounded-full border border-paper-300 bg-white p-1",
        className,
      )}
    >
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        aria-label={`Decrease ${label.toLowerCase()}`}
        className={cn(
          dim,
          "grid place-items-center rounded-full text-ink-700 transition",
          "hover:bg-paper-100 hover:text-ink-950 active:scale-95",
          "disabled:cursor-not-allowed disabled:opacity-35",
        )}
      >
        <MinusIcon className="size-4" />
      </button>

      <output
        aria-live="polite"
        className={cn("select-none text-center font-semibold tabular-nums text-ink-950", text)}
      >
        {value}
      </output>

      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        aria-label={`Increase ${label.toLowerCase()}`}
        className={cn(
          dim,
          "grid place-items-center rounded-full text-ink-700 transition",
          "hover:bg-paper-100 hover:text-ink-950 active:scale-95",
          "disabled:cursor-not-allowed disabled:opacity-35",
        )}
      >
        <PlusIcon className="size-4" />
      </button>
    </div>
  );
}
