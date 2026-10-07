"use client";

import type { Product } from "@/lib/types";
import { cn } from "@/lib/cn";
import { HeartIcon } from "@/components/ui/icons";
import { useWatchlistHydrated, useWatchlistStore } from "@/store/watchlist";
import { useUIStore } from "@/store/ui";

type Props = {
  product: Product;
  compact?: boolean;
};

export function WishlistButton({ product, compact = false }: Props) {
  const hydrated = useWatchlistHydrated();
  const saved = useWatchlistStore((state) => state.slugs.includes(product.slug)) && hydrated;
  const toggle = useWatchlistStore((state) => state.toggle);
  const showToast = useUIStore((state) => state.showToast);

  const handleClick = () => {
    toggle(product.slug);
    showToast(
      saved ? `${product.name} removed from your watchlist` : `${product.name} saved to your watchlist`,
      "success",
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${product.name} from watchlist` : `Add ${product.name} to watchlist`}
      title={saved ? "Remove from watchlist" : "Add to watchlist"}
      className={cn(
        "grid shrink-0 place-items-center rounded-full border shadow-sm transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-masala-600",
        compact ? "size-10" : "size-12",
        saved
          ? "border-masala-200 bg-masala-50 text-masala-700"
          : "border-paper-200 bg-white/95 text-ink-600 hover:border-masala-200 hover:text-masala-700",
      )}
    >
      <HeartIcon className={cn(compact ? "size-4.5" : "size-5", saved && "fill-current")} />
    </button>
  );
}
