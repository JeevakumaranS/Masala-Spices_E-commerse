"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";

const STORAGE_KEY = "masala-house-recently-viewed-v1";

export function ProductRecommendations({ product, products }: { product: Product; products: Product[] }) {
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const previous = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as string[];
        const next = [product.slug, ...previous.filter((slug) => slug !== product.slug)].slice(0, 6);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setRecentSlugs(next);
      } catch {
        setRecentSlugs([product.slug]);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [product.slug]);

  const recentlyViewed = useMemo(
    () => recentSlugs.map((slug) => products.find((item) => item.slug === slug)).filter((item): item is Product => Boolean(item && item.slug !== product.slug)),
    [products, product.slug, recentSlugs],
  );
  const related = products.filter((item) => item.slug !== product.slug && item.categories.some((category) => product.categories.includes(category))).slice(0, 4);

  return (
    <section className="bg-paper-100 py-14 md:py-20">
      <div className="shell space-y-14">
        {related.length ? (
          <>
            <RecommendationRail title="Complete the meal" products={related} />
            <RecommendationRail title="Frequently bought together" products={related.slice(0, 3)} />
          </>
        ) : null}
        {recentlyViewed.length ? <RecommendationRail title="Recently viewed" products={recentlyViewed} /> : null}
      </div>
    </section>
  );
}

function RecommendationRail({ title, products }: { title: string; products: Product[] }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <h2 className="section-title">{title}</h2>
        <span className="text-sm text-ink-500">{products.length} suggestions</span>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((item) => <ProductCard key={item.id} product={item} density="compact" />)}
      </div>
    </div>
  );
}
