import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Star-anise mark (8-point star) drawn as a polygon with rounded joins so it
 * reads as a hand-cut spice rather than a geometric icon.
 */
export function StarAniseMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={cn("size-full", className)}
      fill="currentColor"
    >
      <polygon
        points="26,16 20.07,17.68 23.07,23.07 17.68,20.07 16,26 14.32,20.07 8.93,23.07 11.93,17.68 6,16 11.93,14.32 8.93,8.93 14.32,11.93 16,6 17.68,11.93 23.07,8.93 20.07,14.32"
        strokeLinejoin="round"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="16" cy="16" r="3.1" fill="var(--color-masala-700, #a83d1b)" />
    </svg>
  );
}

type Props = {
  /** `dark` renders the light treatment for dark surfaces; `footer` uses the warm footer palette. */
  tone?: "light" | "dark" | "footer";
  /** Hide the wordmark — used in the mobile drawer / compact states. */
  markOnly?: boolean;
  compact?: boolean;
  className?: string;
  href?: string;
};

export function Logo({ tone = "light", markOnly = false, compact = false, className, href = "/" }: Props) {
  const dark = tone === "dark";
  const footer = tone === "footer";

  return (
    <Link
      href={href}
      aria-label="Masala House — home"
      className={cn("group inline-flex items-center gap-2.5", compact && "max-[374px]:gap-1.5", className)}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-[0.7rem] transition-transform duration-300 group-hover:rotate-[20deg]",
          compact && "max-[374px]:size-8",
          dark || footer ? "bg-saffron-400 text-ink-950" : "bg-masala-700 text-saffron-300",
        )}
      >
        <StarAniseMark className={cn("size-[1.35rem]", compact && "max-[374px]:size-5")} />
      </span>

      {!markOnly ? (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-display text-[1.3rem] font-semibold tracking-tight",
              compact && "max-[374px]:text-base",
              footer ? "text-[#2D1810]" : dark ? "text-paper-50" : "text-ink-950",
            )}
          >
            Masala<span className={footer ? "text-[#E1662F]" : dark ? "text-saffron-300" : "text-masala-700"}> House</span>
          </span>
          <span
            className={cn(
              "mt-1 hidden text-[0.6rem] font-semibold uppercase tracking-[0.24em] sm:block",
              footer ? "text-[#F0DCC8]" : dark ? "text-paper-300" : "text-ink-400",
            )}
          >
            Small-batch spice co.
          </span>
        </span>
      ) : null}
    </Link>
  );
}
