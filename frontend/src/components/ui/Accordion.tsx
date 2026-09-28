"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { ChevronDownIcon } from "@/components/ui/icons";

export type AccordionItem = {
  title: string;
  content: React.ReactNode;
};

type Props = {
  items: AccordionItem[];
  /** Index of the panel open on first paint. Pass `null` to start collapsed. */
  defaultOpen?: number | null;
  /** Allow several panels to stay open at once. */
  multiple?: boolean;
  className?: string;
};

export function Accordion({ items, defaultOpen = null, multiple = false, className }: Props) {
  const baseId = useId();
  const [open, setOpen] = useState<number[]>(defaultOpen === null ? [] : [defaultOpen]);

  const toggle = (index: number) => {
    setOpen((current) => {
      const isOpen = current.includes(index);
      if (isOpen) return current.filter((i) => i !== index);
      return multiple ? [...current, index] : [index];
    });
  };

  return (
    <div className={cn("divide-y divide-paper-200 overflow-hidden rounded-2xl border border-paper-200 bg-white", className)}>
      {items.map((item, index) => {
        const isOpen = open.includes(index);
        const panelId = `${baseId}-panel-${index}`;
        const buttonId = `${baseId}-button-${index}`;

        return (
          <div key={item.title}>
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(index)}
                className={cn(
                  "flex w-full items-center justify-between gap-4 px-5 py-4 text-left",
                  "text-[0.975rem] font-semibold text-ink-900 transition hover:bg-paper-50",
                  isOpen && "bg-paper-50",
                )}
              >
                <span>{item.title}</span>
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full border border-paper-300 bg-white text-ink-600 transition-all duration-300",
                    isOpen && "rotate-180 border-masala-300 bg-masala-50 text-masala-700",
                  )}
                >
                  <ChevronDownIcon className="size-4" />
                </span>
              </button>
            </h3>

            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="px-5 pb-5 pt-1 text-[0.9375rem] leading-relaxed text-ink-600 motion-safe:animate-fade-up"
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
