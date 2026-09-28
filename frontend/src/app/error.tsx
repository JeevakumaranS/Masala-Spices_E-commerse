"use client";

import { useEffect } from "react";
import { AlertIcon, ArrowRightIcon, RefreshIcon } from "@/components/ui/icons";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfacing real failures keeps the reset loop diagnosable in production.
    console.error(error);
  }, [error]);

  return (
    <div className="shell flex flex-1 flex-col items-center justify-center py-24 text-center">
      <span className="mb-6 grid size-20 place-items-center rounded-full bg-chili-50 text-chili-600">
        <AlertIcon className="size-9" />
      </span>

      <p className="eyebrow">Something went sideways</p>
      <h1 className="mt-3 font-display text-4xl font-semibold text-ink-950 md:text-5xl">
        We couldn&apos;t load this page
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-ink-600">
        The kitchen is fine — it&apos;s the oven that misbehaved. Try again, and if it keeps
        happening let us know.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">
          <RefreshIcon className="size-4" />
          Try again
        </button>
        <a href="/" className="btn btn-secondary">
          Back to home
          <ArrowRightIcon className="size-4" />
        </a>
      </div>

      {error.digest ? (
        <p className="mt-6 font-mono text-xs text-ink-400">Ref: {error.digest}</p>
      ) : null}
    </div>
  );
}
