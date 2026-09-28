"use client";

import { useEffect, useState } from "react";
import { HeartIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/types";

const STORAGE_KEY = "masala-house-wishlist-v1";

export function ProductWishlistButton({ product }: { product: Product }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const savedProducts = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as string[];
        setSaved(savedProducts.includes(product.slug));
      } catch {
        setSaved(false);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [product.slug]);

  const toggle = () => {
    try {
      const savedProducts = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as string[];
      const next = saved
        ? savedProducts.filter((slug) => slug !== product.slug)
        : [...new Set([...savedProducts, product.slug])];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSaved(!saved);
    } catch {
      // Wishlist remains optional if browser storage is unavailable.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      className={cn(
        "grid size-12 shrink-0 place-items-center rounded-full border transition",
        saved
          ? "border-masala-200 bg-masala-50 text-masala-700"
          : "border-paper-300 bg-white text-ink-600 hover:border-masala-200 hover:text-masala-700",
      )}
      aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} for later`}
    >
      <HeartIcon className={cn("size-5", saved && "fill-current")} />
    </button>
  );
}
