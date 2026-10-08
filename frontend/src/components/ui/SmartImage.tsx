"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { LeafIcon } from "@/components/ui/icons";

function isRemoteImage(src: string): boolean {
  try {
    const url = new URL(src);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isRenderable(src: string): boolean {
  return Boolean(
    src &&
      (src.startsWith("/") ||
        src.startsWith("data:") ||
        src.startsWith("blob:") ||
        isRemoteImage(src)),
  );
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
  const remoteImageRef = useRef<HTMLImageElement>(null);
  const [imageState, setImageState] = useState({
    src,
    loaded: false,
    failed: false,
  });
  const loaded = imageState.src === src && imageState.loaded;
  const failed = imageState.src === src && imageState.failed;

  const usable = !failed && isRenderable(src ?? "");
  const remoteImage = isRemoteImage(src ?? "");
  const imageClassName = cn(
    "object-cover transition-[opacity,transform] duration-700 ease-out",
    loaded ? "opacity-100" : "opacity-0",
    zoom && "group-hover:scale-105",
    className,
  );

  useEffect(() => {
    const image = remoteImageRef.current;
    if (!remoteImage || !image?.complete) return;

    const frame = window.requestAnimationFrame(() => {
      if (remoteImageRef.current !== image) return;
      setImageState({
        src,
        loaded: image.naturalWidth > 0,
        failed: image.naturalWidth === 0,
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [remoteImage, src]);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-paper-100",
        aspect,
        wrapperClassName,
      )}
    >
      {usable ? (
        remoteImage ? (
          // Signed remote URLs should be fetched by the browser, not Next's image pipeline.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={remoteImageRef}
            src={src as string}
            alt={alt}
            loading="eager"
            fetchPriority={preload || priority ? "high" : undefined}
            decoding="async"
            onLoad={() => {
              setImageState({ src, loaded: true, failed: false });
            }}
            onError={() => {
              setImageState({ src, loaded: true, failed: true });
            }}
            className={cn("absolute inset-0 h-full w-full", imageClassName)}
          />
        ) : (
          <Image
            src={src as string}
            alt={alt}
            fill
            sizes={sizes}
            priority={preload ? undefined : priority}
            preload={preload}
            loading="eager"
            onLoad={() => setImageState({ src, loaded: true, failed: false })}
            onError={() => {
              setImageState({ src, loaded: true, failed: true });
            }}
            className={imageClassName}
          />
        )
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
        <div
          className="skeleton absolute inset-0 !rounded-none"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
