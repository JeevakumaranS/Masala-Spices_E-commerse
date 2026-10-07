"use client";

import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { useWatchlistHydrated, useWatchlistStore } from "@/store/watchlist";

export function WatchlistClient({ products }: { products: Product[] }) {
  const hydrated = useWatchlistHydrated();
  const slugs = useWatchlistStore((state) => state.slugs);
  const savedProducts = products.filter((product) => slugs.includes(product.slug));

  if (!hydrated) {
    return (
      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4" aria-busy="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl bg-paper-100" />
        ))}
      </div>
    );
  }

  if (savedProducts.length === 0) {
    return (
      <EmptyState
        title="Your watchlist is waiting"
        description="Save blends you want to come back to, and they’ll be collected here."
        action={{ label: "Explore blends", href: "/search" }}
      />
    );
  }

  return (
    <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
      {savedProducts.map((product) => (
        <ProductCard key={product.slug} product={product} density="comfortable" />
      ))}
    </div>
  );
}
