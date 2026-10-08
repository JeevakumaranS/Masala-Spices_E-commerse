"use client";

import { useState } from "react";
import { ArrowRightIcon, CheckIcon } from "@/components/ui/icons";
import { apiClient, getApiErrorMessage } from "@/lib/http";

type SignupResponse = {
  subscribed: boolean;
  email_status: "sent" | "already_sent" | "failed" | "disabled";
};

export function NewsletterForm({ tone = "dark" }: { tone?: "dark" | "light" | "footer" }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [emailStatus, setEmailStatus] = useState<SignupResponse["email_status"] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

    if (!valid) {
      setError("Enter a valid email address.");
      return;
    }

    setError("");
    setEmailStatus(null);
    setSubmitting(true);
    try {
      const response = await apiClient.post<SignupResponse>("/api/updates", {
        email: email.trim(),
      });
      if (!response.data.subscribed) {
        setError("We couldn't complete your subscription. Please try again.");
        return;
      }
      setEmailStatus(response.data.email_status);
      setDone(
        response.data.email_status === "sent" ||
          response.data.email_status === "already_sent",
      );
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, "We couldn't save your email. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const dark = tone === "dark";
  const footer = tone === "footer";

  if (done || emailStatus === "failed" || emailStatus === "disabled") {
    const emailSent = emailStatus === "sent";
    const alreadySent = emailStatus === "already_sent";
    return (
      <div className="space-y-3" role={done ? "status" : "alert"}>
        <div className={
          done
            ? dark || footer
              ? "flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3.5 text-sm text-paper-100 shadow-lg shadow-black/5"
              : "flex items-start gap-3 rounded-2xl border border-cardamom-200 bg-cardamom-50 px-4 py-3.5 text-sm text-cardamom-800 shadow-sm"
            : dark || footer
              ? "flex items-start gap-3 rounded-2xl border border-[#F0956B]/40 bg-[#4B1B12]/70 px-4 py-3.5 text-sm text-[#FFE0CE]"
              : "flex items-start gap-3 rounded-2xl border border-chili-200 bg-chili-50 px-4 py-3.5 text-sm text-chili-800"
        }>
          <span className={`grid size-8 shrink-0 place-items-center rounded-full text-white ${
            done ? "bg-cardamom-500" : "bg-[#B64B31]"
          }`}>
            {done ? <CheckIcon className="size-4" /> : <span aria-hidden="true">!</span>}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">
              {alreadySent ? "You’re already on the list." : done ? "You’re on the list!" : "Your signup was saved."}
            </span>
            <span className="mt-0.5 block opacity-85">
              {emailSent || alreadySent
                ? "Check your inbox for a welcome email from Masala House."
                : "We couldn’t send the welcome email right now. Submit again later to retry."}
            </span>
          </span>
        </div>
        {!done ? (
          <button
            type="button"
            onClick={() => setEmailStatus(null)}
            className={`text-sm font-semibold underline underline-offset-4 ${
              dark || footer ? "text-[#FFD2B8] hover:text-white" : "text-masala-700 hover:text-masala-900"
            }`}
          >
            Retry email
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="w-full">
      <label htmlFor="newsletter-email" className={dark || footer ? "sr-only" : "field-label"}>
        Email address
      </label>

      <div className={`group relative rounded-full transition-shadow focus-within:ring-4 ${
        dark
          ? "focus-within:ring-saffron-300/15"
          : footer
            ? "focus-within:ring-[#F0956B]/20"
            : "focus-within:ring-masala-200/60"
      }`}>
        <input
          id="newsletter-email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError("");
            if (emailStatus) setEmailStatus(null);
          }}
          placeholder="you@example.com"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "newsletter-error" : "newsletter-privacy"}
          disabled={submitting}
          className={
            dark
              ? "w-full rounded-full border border-white/15 bg-white/10 py-4 pr-36 pl-5 text-sm text-paper-50 shadow-xl shadow-black/10 backdrop-blur-sm transition placeholder:text-paper-300/70 focus:border-saffron-300/70 focus:bg-white/15 focus:outline-none"
              : footer
                ? "w-full rounded-full border border-[#C4795A]/80 bg-white py-4 pr-36 pl-5 text-sm text-[#2D1810] shadow-xl shadow-black/10 transition placeholder:text-[#9A8A7D] focus:border-[#E1662F] focus:outline-none"
                : "input rounded-full py-4 pr-36 shadow-lg shadow-masala-950/5"
          }
        />
        <button
          type="submit"
          className={
            dark
              ? "btn btn-saffron btn-sm absolute top-1/2 right-1.5 min-h-11 -translate-y-1/2 shadow-sm transition-transform hover:scale-[1.02]"
              : footer
                ? "btn btn-sm absolute top-1/2 right-1.5 min-h-11 -translate-y-1/2 border-[#E1662F] bg-[#E1662F] text-white shadow-sm transition-transform hover:scale-[1.02] hover:border-[#FFA469] hover:bg-[#FFA469]"
                : "btn btn-primary btn-sm absolute top-1/2 right-1.5 min-h-11 -translate-y-1/2 shadow-sm transition-transform hover:scale-[1.02]"
          }
          disabled={submitting}
        >
          {submitting ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
              Joining…
            </>
          ) : (
            <>
              Join
              <ArrowRightIcon className="size-4" />
            </>
          )}
        </button>
      </div>
      <p
        id="newsletter-privacy"
        className={`mt-2 pl-4 text-[0.7rem] ${
          dark || footer ? "text-paper-200/75" : "text-ink-500"
        }`}
      >
        One thoughtful note each week. Unsubscribe whenever you like.
      </p>

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
