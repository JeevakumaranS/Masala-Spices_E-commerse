"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { useUIStore } from "@/store/ui";
import { AlertIcon, ArrowRightIcon, CheckCircleIcon, InfoIcon } from "@/components/ui/icons";

const TONE = {
  success: {
    Icon: CheckCircleIcon,
    className: "border-cardamom-200 bg-cardamom-50 text-cardamom-700",
    iconClass: "bg-cardamom-500 text-white",
  },
  info: {
    Icon: InfoIcon,
    className: "border-paper-300 bg-white text-ink-800",
    iconClass: "bg-ink-900 text-paper-50",
  },
  error: {
    Icon: AlertIcon,
    className: "border-chili-100 bg-chili-50 text-chili-700",
    iconClass: "bg-chili-600 text-white",
  },
} as const;

export function Toast() {
  const toast = useUIStore((s) => s.toast);
  const dismiss = useUIStore((s) => s.dismissToast);
  const openCart = useUIStore((s) => s.openCart);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(dismiss, 4200);
    return () => window.clearTimeout(id);
  }, [toast, dismiss]);

  if (!toast) return null;

  const { Icon, className, iconClass } = TONE[toast.tone];

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-5 z-[120] flex justify-end sm:right-6 sm:top-6"
    >
      <div
        key={toast.id}
        className={cn(
          "pointer-events-auto flex w-[calc(100vw-2rem)] max-w-md items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg animate-pop",
          className,
        )}
      >
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", iconClass)}>
          <Icon className="size-4" />
        </span>

        <p className="min-w-0 flex-1 text-sm font-medium">{toast.text}</p>

        {toast.action === "cart" ? (
          <button
            type="button"
            onClick={() => {
              dismiss();
              openCart();
            }}
            className="flex shrink-0 items-center gap-1 text-sm font-semibold underline underline-offset-2 hover:opacity-80"
          >
            View cart
            <ArrowRightIcon className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
