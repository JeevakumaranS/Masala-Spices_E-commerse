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
const PAGE_SIZE = 12;

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

function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.ceil(total / pageSize);
  if (pageCount <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const pages = new Set<number>([1, pageCount]);
  for (let candidate = Math.max(1, page - 1); candidate <= Math.min(pageCount, page + 1); candidate += 1) {
    pages.add(candidate);
  }
  const visiblePages = [...pages].sort((left, right) => left - right);

  return (
    <nav aria-label="Search results pagination" className="mt-6 flex flex-col gap-3 border-t border-paper-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-ink-500" aria-live="polite">
        Showing {start}–{end} of {total} blends
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className="rounded-lg border border-paper-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 transition hover:border-masala-300 disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </button>
        {visiblePages.map((currentPage, index) => (
          <span key={currentPage} className="contents">
            {index > 0 && currentPage - visiblePages[index - 1] > 1 ? (
              <span className="px-1 text-sm text-ink-400" aria-hidden="true">…</span>
            ) : null}
            <button
              type="button"
              className={`size-9 rounded-lg border text-sm font-semibold transition ${
                currentPage === page
                  ? "border-masala-700 bg-masala-700 text-white"
                  : "border-paper-200 bg-white text-ink-700 hover:border-masala-300"
              }`}
              aria-label={`Page ${currentPage}`}
              aria-current={currentPage === page ? "page" : undefined}
              onClick={() => onPageChange(currentPage)}
            >
              {currentPage}
            </button>
          </span>
        ))}
        <button
          type="button"
          className="rounded-lg border border-paper-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 transition hover:border-masala-300 disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
        >
          Next
        </button>
      </div>
    </nav>
  );
}

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
  const [page, setPage] = useState(1);

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
      if (!needle) return true;
      return matchesSearch(product, needle);
    });
  }, [products, query, category, spiceLevel, dishType, priceBand, packSize, vegOnly]);

  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleResults = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const activeCategory = categories.find((item) => item.slug === category) ?? null;
  const hasFilters = query.trim().length > 0 || category !== null || spiceLevel !== null || dishType !== null || priceBand !== null || packSize !== null || vegOnly;

  const clearFilters = () => {
    setPage(1);
    setQuery("");
    setCategory(null);
    setSpiceLevel(null);
    setDishType(null);
    setPriceBand(null);
    setPackSize(null);
    setVegOnly(false);
  };

  const applySearch = (term: string) => {
    setPage(1);
    setQuery(term);
    setCategory(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------ Search field ------------------------ */}
      <div className="rounded-2xl border border-paper-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-masala-600" />
            <input
              id="search-products"
              type="search"
              value={query}
              onChange={(event) => {
                setPage(1);
                setQuery(event.target.value);
              }}
              placeholder="Search products, ingredients or dishes"
              autoComplete="off"
              aria-label="Search products"
              className="input !mt-0 !py-3 !pl-10 !pr-10 text-sm [&::-webkit-search-cancel-button]:hidden"
            />
            {query.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  setQuery("");
                }}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-ink-400 transition hover:bg-paper-100 hover:text-ink-700"
              >
                <CloseIcon className="size-4" />
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2 md:w-[min(100%,34rem)] md:grid-cols-4">
            <select className="input !mt-0 !py-2.5 text-sm" value={spiceLevel ?? ""} onChange={(event) => { setPage(1); setSpiceLevel(event.target.value || null); }} aria-label="Filter by spice level">
              <option value="">All spice levels</option>
              {SPICE_LEVELS.map((level) => <option key={level} value={level}>{level[0].toUpperCase() + level.slice(1)}</option>)}
            </select>
            <select className="input !mt-0 !py-2.5 text-sm" value={dishType ?? ""} onChange={(event) => { setPage(1); setDishType(event.target.value || null); }} aria-label="Filter by dish type">
              <option value="">All dish types</option>
              {DISH_TYPES.map((dish) => <option key={dish} value={dish}>{dish}</option>)}
            </select>
            <select className="input !mt-0 !py-2.5 text-sm" value={priceBand ?? ""} onChange={(event) => { setPage(1); setPriceBand(event.target.value || null); }} aria-label="Filter by price">
              <option value="">All prices</option>
              <option value="under-200">Under ₹200</option>
              <option value="200-300">₹200–₹300</option>
              <option value="over-300">Over ₹300</option>
            </select>
            <select className="input !mt-0 !py-2.5 text-sm" value={packSize ?? ""} onChange={(event) => { setPage(1); setPackSize(event.target.value || null); }} aria-label="Filter by pack size">
              <option value="">All pack sizes</option>
              {Array.from(new Set(products.flatMap((product) => product.variants.map((variant) => variant.pack_size)))).map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-paper-100 pt-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {products.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[0.65rem] font-bold tracking-[0.12em] text-ink-400 uppercase">Popular</span>
                {POPULAR_SEARCHES.slice(0, 4).map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => applySearch(term)}
                    className="rounded-full border border-paper-200 bg-paper-50 px-2.5 py-1 text-xs font-medium text-ink-600 transition hover:border-masala-200 hover:bg-masala-50 hover:text-masala-700"
                  >
                    {term}
                  </button>
                ))}
              </div>
            ) : null}
            <label className="flex items-center gap-2 text-xs font-medium text-ink-600">
              <input type="checkbox" checked={vegOnly} onChange={(event) => { setPage(1); setVegOnly(event.target.checked); }} />
              Veg only
            </label>
          </div>
          {hasFilters ? (
            <button type="button" onClick={clearFilters} className="text-xs font-semibold text-masala-700 hover:text-masala-900">
              Clear filters
            </button>
          ) : null}
        </div>
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
                  onClick={() => {
                    setPage(1);
                    setCategory(null);
                  }}
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
                    onClick={() => {
                      setPage(1);
                      setCategory(category === item.slug ? null : item.slug);
                    }}
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
          {visibleResults.map((product, index) => (
            <Reveal key={product.id} delay={(index % 3) * 80} className="h-full">
              <ProductCard product={product} density="compact" className="h-full" />
            </Reveal>
          ))}
        </div>
      )}
      {results.length > 0 ? (
        <Pagination
          page={currentPage}
          pageSize={PAGE_SIZE}
          total={results.length}
          onPageChange={setPage}
        />
      ) : null}

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
