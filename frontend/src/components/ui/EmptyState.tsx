import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type Props = {
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
};

/** Shared empty / zero-result state so no page ever dead-ends. */
export function EmptyState({
  icon,
  eyebrow,
  title,
  description,
  action,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl border border-dashed border-paper-300 bg-paper-50 px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <span className="mb-5 grid size-16 place-items-center rounded-full bg-white text-masala-600 shadow-sm">
          {icon}
        </span>
      ) : null}

      {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
      <h3 className="font-display text-2xl font-semibold text-ink-950">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-600">{description}</p>
      ) : null}

      {action ? (
        <Link href={action.href} className="btn btn-primary mt-6">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
