"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { MailIcon, WhatsAppIcon, CloseIcon } from "@/components/ui/icons";

/**
 * Floating support bubble — WhatsApp + email only (no phone).
 * Matches the Cookd model: a single floating button that expands
 * to reveal contact options.
 */

const WHATSAPP_NUMBER = "918122339694";
const WHATSAPP_MESSAGE = encodeURIComponent(
  "Hi Masala House! I have a question about your spices.",
);
const EMAIL = "hello@masalahouse.in";

export function SupportBubble() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (dismissed) return null;

  return (
    <div
      ref={containerRef}
      className="fixed right-4 bottom-4 z-[100] flex flex-col items-end gap-3 sm:right-6 sm:bottom-6"
    >
      {/* Expanded options */}
      <div
        className={cn(
          "flex flex-col gap-2 transition-all duration-300 ease-out",
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0",
        )}
      >
        {/* WhatsApp */}
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Chat on WhatsApp"
          className="group flex items-center gap-3 rounded-full bg-[#25D366] py-2.5 pr-5 pl-3 text-white shadow-lg shadow-[#25D366]/30 transition hover:bg-[#1fb857] hover:shadow-xl"
        >
          <span className="grid size-9 place-items-center rounded-full bg-white/20">
            <WhatsAppIcon className="size-5" />
          </span>
          <span className="text-sm font-semibold">WhatsApp us</span>
        </a>

        {/* Email */}
        <a
          href={`mailto:${EMAIL}`}
          aria-label="Send us an email"
          className="group flex items-center gap-3 rounded-full bg-ink-950 py-2.5 pr-5 pl-3 text-white shadow-lg shadow-ink-950/20 transition hover:bg-ink-800 hover:shadow-xl"
        >
          <span className="grid size-9 place-items-center rounded-full bg-white/10">
            <MailIcon className="size-5" />
          </span>
          <span className="text-sm font-semibold">Email us</span>
        </a>
      </div>

      {/* Main FAB */}
      <div className="flex items-center gap-2">
        {/* Close button (visible when open) */}
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setDismissed(true);
          }}
          aria-label="Dismiss support button"
          className={cn(
            "grid size-8 place-items-center rounded-full bg-white text-ink-600 shadow-md transition-all duration-200 hover:bg-paper-100 hover:text-ink-900",
            open
              ? "pointer-events-auto scale-100 opacity-100"
              : "pointer-events-none scale-75 opacity-0",
          )}
        >
          <CloseIcon className="size-4" />
        </button>

        {/* Toggle button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close support options" : "Get support"}
          aria-expanded={open}
          className="group relative grid size-14 place-items-center rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] text-white shadow-xl shadow-[#25D366]/40 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-[#25D366]/50 active:scale-95"
        >
          {/* Pulse ring */}
          <span
            className="absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-20 [animation-duration:2.5s]"
            aria-hidden="true"
          />
          <span className="relative transition-transform duration-300 group-hover:scale-110">
            {open ? (
              <CloseIcon className="size-6" />
            ) : (
              <WhatsAppIcon className="size-7" />
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
