"use client";

import { useState } from "react";
import { ArrowRightIcon, CheckIcon } from "@/components/ui/icons";

export function NewsletterForm({ tone = "dark" }: { tone?: "dark" | "light" | "footer" }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

    if (!valid) {
      setError("Enter a valid email address.");
      return;
    }

    setError("");
    setDone(true);
  };

  const dark = tone === "dark";
  const footer = tone === "footer";

  if (done) {
    return (
      <div
        role="status"
        className={
          dark
            ? "flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3.5 text-sm text-paper-100"
            : footer
              ? "flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3.5 text-sm text-[#F0DCC8]"
              : "flex items-center gap-3 rounded-2xl bg-cardamom-50 px-4 py-3.5 text-sm text-cardamom-700"
        }
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-cardamom-500 text-white">
          <CheckIcon className="size-4" />
        </span>
        You&apos;re on the list — first dispatch lands next Tuesday.
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="w-full">
      <label htmlFor="newsletter-email" className={dark || footer ? "sr-only" : "field-label"}>
        Email address
      </label>

      <div className="relative">
        <input
          id="newsletter-email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError("");
          }}
          placeholder="you@example.com"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "newsletter-error" : undefined}
          className={
            dark
              ? "w-full rounded-full border border-white/15 bg-white/10 py-3.5 pr-32 pl-5 text-sm text-paper-50 placeholder:text-paper-300/70 focus:border-saffron-400 focus:bg-white/15 focus:outline-none"
              : footer
                ? "w-full rounded-full border border-[#C4795A] bg-white py-3.5 pr-32 pl-5 text-sm text-[#2D1810] placeholder:text-[#9A8A7D] focus:border-[#E1662F] focus:outline-none"
                : "input rounded-full pr-32"
          }
        />
        <button
          type="submit"
          className={
            dark
              ? "btn btn-saffron btn-sm absolute top-1/2 right-1.5 -translate-y-1/2"
              : footer
                ? "btn btn-sm absolute top-1/2 right-1.5 -translate-y-1/2 border-[#E1662F] bg-[#E1662F] text-white hover:border-[#FFA469] hover:bg-[#FFA469]"
                : "btn btn-primary btn-sm absolute top-1/2 right-1.5 -translate-y-1/2"
          }
        >
          Join
          <ArrowRightIcon className="size-4" />
        </button>
      </div>

      {error ? (
        <p
          id="newsletter-error"
          className={
            dark
              ? "mt-2 text-xs text-saffron-300"
              : footer
                ? "mt-2 text-xs text-[#F0956B]"
                : "field-error"
          }
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
