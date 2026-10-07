"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { SmartImage } from "@/components/ui/SmartImage";
import { percentOff } from "@/lib/format";
import { getStartingMrp, getStartingPrice } from "@/lib/productPricing";
import { cn } from "@/lib/cn";

type Props = {
  product: Product;
};

/**
 * PDP image gallery: one large frame plus a thumbnail strip.
 * With zero or one image the strip disappears and the frame falls back to
 * SmartImage's graceful spice-gradient placeholder.
 */
export function ProductGallery({ product }: Props) {
  const images = [...product.images].sort((a, b) => a.sort_order - b.sort_order);
  const [activeIndex, setActiveIndex] = useState(0);

  const active = images[Math.min(activeIndex, Math.max(images.length - 1, 0))] ?? null;
  const alt =
    active?.alt_text && active.alt_text.trim().length > 0 ? active.alt_text : product.name;
  const off = percentOff(getStartingPrice(product), getStartingMrp(product));

  return (
    <div className="flex flex-col gap-4">
      <div className="relative rounded-[2rem] border border-paper-200 bg-white p-3 shadow-xs">
        <div className="rounded-[1.5rem]">
          <SmartImage
            key={active?.url ?? "placeholder"}
            src={active?.url}
            alt={alt}
            aspect="aspect-[4/5]"
            sizes="(max-width: 1024px) 100vw, 48vw"
            wrapperClassName="rounded-[1.5rem]"
          />
        </div>

        {off > 0 ? (
          <span className="badge-sale absolute top-6 left-6 shadow-sm">{off}% off</span>
        ) : null}
      </div>

      {images.length > 1 ? (
        <ul
          className="no-scrollbar flex gap-3 overflow-x-auto"
          aria-label={`${product.name} images`}
        >
          {images.map((image, index) => {
            const isActive = index === activeIndex;
            return (
              <li key={image.id}>
                <button
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Show image ${index + 1} of ${images.length}: ${
                    image.alt_text || product.name
                  }`}
                  aria-pressed={isActive}
                  className={cn(
                    "relative w-20 shrink-0 overflow-hidden rounded-xl border-2 transition md:w-24",
                    isActive
                      ? "border-masala-700 shadow-md"
                      : "border-paper-200 opacity-70 hover:border-paper-300 hover:opacity-100",
                  )}
                >
                  <SmartImage
                    src={image.url}
                    alt=""
                    aspect="aspect-square"
                    sizes="96px"
                    wrapperClassName="rounded-lg"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {product.recipe_video_url ? (
        <video
          className="w-full rounded-2xl border border-paper-200 bg-ink-950"
          controls
          preload="metadata"
          poster={active?.url}
          aria-label={`${product.name} recipe video`}
        >
          <source src={product.recipe_video_url} />
        </video>
      ) : null}
    </div>
  );
}
