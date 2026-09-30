"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { LeafIcon } from "@/components/ui/icons";

/** Hosts whitelisted in `next.config.ts` → `images.remotePatterns`. */
const ALLOWED_HOSTS = new Set([
  "images.unsplash.com",
  "plus.unsplash.com",
  "localhost",
  "127.0.0.1",
]);

function isRenderable(src: string): boolean {
  if (!src) return false;
  if (src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:")) return true;
  try {
    const url = new URL(src);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return ALLOWED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

type Props = {
  src?: string | null;
  alt: string;
  /** Tailwind aspect utility for the frame, e.g. `aspect-[4/5]`. */
  aspect?: string;
  sizes?: string;
  priority?: boolean;
  preload?: boolean;
  wrapperClassName?: string;
  /** Classes applied to the <img> itself — use for hover zoom etc. */
  className?: string;
  /** Show the soft-focus zoom on hover (cards). */
  zoom?: boolean;
};

/**
 * Resilient remote image: shimmer placeholder while loading, graceful
 * spice-pattern fallback for missing/blocked sources, and no layout shift.
 */
export function SmartImage({
  src,
  alt,
  aspect = "aspect-[4/5]",
  sizes = "(max-width: 768px) 100vw, 33vw",
  priority = false,
  preload = false,
  wrapperClassName,
  className,
  zoom = false,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const usable = !failed && isRenderable(src ?? "");

  return (
    <div className={cn("relative overflow-hidden bg-paper-100", aspect, wrapperClassName)}>
      {usable ? (
        <Image
          src={src as string}
          alt={alt}
          fill
          sizes={sizes}
          priority={preload ? undefined : priority}
          preload={preload}
          loading={preload ? undefined : priority ? "eager" : "lazy"}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setFailed(true);
            setLoaded(true);
          }}
          className={cn(
            "object-cover transition-[opacity,transform] duration-700 ease-out",
            loaded ? "opacity-100" : "opacity-0",
            zoom && "group-hover:scale-105",
            className,
          )}
        />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,var(--color-masala-50),var(--color-saffron-50),var(--color-paper-100))]"
        >
          <span className="grid size-14 place-items-center rounded-full bg-white/70 text-masala-600 shadow-sm">
            <LeafIcon className="size-7" />
          </span>
        </div>
      )}

      {!loaded && (
        <div className="skeleton absolute inset-0 !rounded-none" aria-hidden="true" />
      )}
    </div>
  );
}
