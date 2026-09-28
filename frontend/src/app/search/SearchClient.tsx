"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Category, Product } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import { CloseIcon, SearchIcon } from "@/components/ui/icons";

type Props = {
  products: Product[];
  categories: Category[];
};

const POPULAR_SEARCHES = [
  "Sambar masala",
  "Garam masala",
  "Biryani",
  "Breakfast",
  "Whole spices",
  "Chilli",
];

const QUICK_LINKS = [
  { label: "All recipes", href: "/recipes" },
  { label: "Order tracking", href: "/order-status" },
  { label: "FAQ", href: "/pages/faq" },
  { label: "Bulk orders", href: "/pages/bulk-order" },
];

const DISH_TYPES = ["Biryani", "Fried Rice", "Kulambu/Curry", "Fry/Varuval", "Sambar/Rasam", "Podi/Idli-Dosa"];
const SPICE_LEVELS = ["mild", "medium", "hot"];

function editDistance(left: string, right: string): number {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const previous = row[j];
      row[j] = left[i - 1] === right[j - 1] ? diagonal : 1 + Math.min(diagonal, row[j], row[j - 1]);
      diagonal = previous;
    }
  }
  return row[right.length];
}

function matchesSearch(product: Product, query: string): boolean {
  const terms = [product.name, product.description, product.dish_type ?? "", ...product.categories, ...product.ingredients]
    .join(" ")
    .toLowerCase();
  if (terms.includes(query)) return true;
  return query.split(/\s+/).every((word) =>
    terms.split(/\s+/).some((term) => editDistance(word, term) <= Math.max(1, Math.floor(word.length / 4))),
  );
}

const chipClass = (active: boolean) =>
  cn(
    "chip !px-4 !py-2 whitespace-nowrap transition",
    active
      ? "!border-masala-700 !bg-masala-700 !text-white"
      : "!bg-white hover:!border-masala-200 hover:!bg-masala-50 hover:!text-masala-700",
  );

/**
 * The interactive half of `/search`: text query + category chips filter the
 * server-fetched catalogue client-side, with a live result count.
 */
export function SearchClient({ products, categories }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [spiceLevel, setSpiceLevel] = useState<string | null>(null);
  const [dishType, setDishType] = useState<string | null>(null);
  const [priceBand, setPriceBand] = useState<string | null>(null);
  const [packSize, setPackSize] = useState<string | null>(null);
  const [vegOnly, setVegOnly] = useState(false);
  const [gingerGarlic, setGingerGarlic] = useState(false);
  const [tamarind, setTamarind] = useState(false);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      const inCategory = category === null || product.categories.includes(category);
      if (!inCategory) return false;
      if (spiceLevel !== null && product.spice_level !== spiceLevel) return false;
      if (dishType !== null && product.dish_type !== dishType) return false;
      if (priceBand === "under-200" && product.price >= 200) return false;
      if (priceBand === "200-300" && (product.price < 200 || product.price > 300)) return false;
      if (priceBand === "over-300" && product.price <= 300) return false;
      if (packSize !== null && !product.variants.some((variant) => variant.pack_size === packSize)) return false;
      if (vegOnly && product.is_veg === false) return false;
      if (gingerGarlic && !product.contains_ginger_garlic) return false;
      if (tamarind && !product.contains_tamarind) return false;
      if (!needle) return true;
      return matchesSearch(product, needle);
    });
  }, [products, query, category, spiceLevel, dishType, priceBand, packSize, vegOnly, gingerGarlic, tamarind]);

  const activeCategory = categories.find((item) => item.slug === category) ?? null;
  const hasFilters = query.trim().length > 0 || category !== null || spiceLevel !== null || dishType !== null || priceBand !== null || packSize !== null || vegOnly || gingerGarlic || tamarind;

  const clearFilters = () => {
    setQuery("");
    setCategory(null);
    setSpiceLevel(null);
    setDishType(null);
    setPriceBand(null);
    setPackSize(null);
    setVegOnly(false);
    setGingerGarlic(false);
    setTamarind(false);
  };

  const applySearch = (term: string) => {
    setQuery(term);
    setCategory(null);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* ------------------------ Search field ------------------------ */}
      <div className="card p-5 shadow-sm md:p-6">
        <label className="field-label" htmlFor="search-products">
          Search products
        </label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-masala-600" />
          <input
            id="search-products"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try “sambar”, “biryani” or “chilli”…"
            autoComplete="off"
            className="input !py-4 !pl-12 !pr-11 text-base [&::-webkit-search-cancel-button]:hidden"
          />
          {query.length > 0 ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="btn btn-ghost btn-icon btn-sm absolute top-1/2 right-2 -translate-y-1/2"
            >
              <CloseIcon className="size-4" />
            </button>
          ) : null}

          <div className="mt-5 grid gap-3 border-t border-paper-200 pt-5 sm:grid-cols-2 lg:grid-cols-4">
            <select className="input" value={spiceLevel ?? ""} onChange={(event) => setSpiceLevel(event.target.value || null)} aria-label="Filter by spice level">
              <option value="">All spice levels</option>
              {SPICE_LEVELS.map((level) => <option key={level} value={level}>{level[0].toUpperCase() + level.slice(1)}</option>)}
            </select>
            <select className="input" value={dishType ?? ""} onChange={(event) => setDishType(event.target.value || null)} aria-label="Filter by dish type">
              <option value="">All dish types</option>
              {DISH_TYPES.map((dish) => <option key={dish} value={dish}>{dish}</option>)}
            </select>
            <select className="input" value={priceBand ?? ""} onChange={(event) => setPriceBand(event.target.value || null)} aria-label="Filter by price">
              <option value="">All prices</option>
              <option value="under-200">Under ₹200</option>
              <option value="200-300">₹200–₹300</option>
              <option value="over-300">Over ₹300</option>
            </select>
            <select className="input" value={packSize ?? ""} onChange={(event) => setPackSize(event.target.value || null)} aria-label="Filter by pack size">
              <option value="">All pack sizes</option>
              {Array.from(new Set(products.flatMap((product) => product.variants.map((variant) => variant.pack_size)))).map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-ink-700">
            <label className="flex items-center gap-2"><input type="checkbox" checked={vegOnly} onChange={(event) => setVegOnly(event.target.checked)} /> Veg only</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={gingerGarlic} onChange={(event) => setGingerGarlic(event.target.checked)} /> Contains ginger-garlic</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={tamarind} onChange={(event) => setTamarind(event.target.checked)} /> Contains tamarind</label>
          </div>
        </div>

        {products.length > 0 ? (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="eyebrow mr-1">Popular searches</span>
            {POPULAR_SEARCHES.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => applySearch(term)}
                className="chip transition hover:!border-masala-200 hover:!bg-masala-50 hover:!text-masala-700"
              >
                {term}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* ------------------------ Filter toolbar ------------------------ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {products.length > 0 && categories.length > 0 ? (
          <nav aria-label="Filter by category" className="no-scrollbar -mx-1 overflow-x-auto px-1">
            <ul className="flex w-max gap-2">
              <li>
                <button
                  type="button"
                  aria-pressed={category === null}
                  onClick={() => setCategory(null)}
                  className={chipClass(category === null)}
                >
                  All blends
                </button>
              </li>
              {categories.map((item) => (
                <li key={item.slug}>
                  <button
                    type="button"
                    aria-pressed={category === item.slug}
                    onClick={() =>
                      setCategory(category === item.slug ? null : item.slug)
                    }
                    className={chipClass(category === item.slug)}
                  >
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        ) : (
          <span />
        )}

        <p aria-live="polite" className="shrink-0 text-sm text-ink-500">
          Showing{" "}
          <span className="font-display font-semibold text-ink-950">{results.length}</span>{" "}
          of {products.length} {products.length === 1 ? "blend" : "blends"}
          {query.trim() ? (
            <>
              {" "}
              for <span className="font-medium text-ink-800">“{query.trim()}”</span>
            </>
          ) : null}
          {activeCategory ? <> in {activeCategory.name}</> : null}
        </p>
      </div>

      {/* ------------------------ Results ------------------------ */}
      {results.length === 0 ? (
        <div>
          <EmptyState
            icon={<SearchIcon className="size-7" />}
            eyebrow="No matches"
            title={
              products.length === 0
                ? "Nothing to search yet"
                : query.trim()
                  ? `Nothing matched “${query.trim()}”`
                  : "No blends on this shelf"
            }
            description={
              products.length === 0
                ? "The catalogue is syncing from the kitchen API — check back in a moment, or read the journal meanwhile."
                : "Try a spice like “chilli”, a dish like “biryani”, or clear the filters to see everything again."
            }
            action={{ label: "Browse recipes", href: "/recipes" }}
          />

          {products.length > 0 ? (
            <>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <span className="text-[0.68rem] font-bold tracking-[0.16em] text-ink-400 uppercase">
                  Quick searches
                </span>
                {POPULAR_SEARCHES.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => applySearch(term)}
                    className="chip transition hover:!border-masala-200 hover:!bg-masala-50 hover:!text-masala-700"
                  >
                    {term}
                  </button>
                ))}
              </div>

              {hasFilters ? (
                <div className="mt-4 text-center">
                  <button type="button" onClick={clearFilters} className="btn btn-secondary btn-sm">
                    Clear search &amp; filters
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {results.map((product, index) => (
            <Reveal key={product.id} delay={(index % 3) * 80} className="h-full">
              <ProductCard product={product} density="compact" className="h-full" />
            </Reveal>
          ))}
        </div>
      )}

      {/* ------------------------ Quick links ------------------------ */}
      <div className="hairline flex flex-wrap items-center gap-2 pt-6">
        <span className="eyebrow mr-1">Quick links</span>
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="chip transition hover:!border-masala-200 hover:!bg-masala-50 hover:!text-masala-700"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
