"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { getProducts, getRecipes } from "@/lib/api";
import type { Product, Recipe } from "@/lib/types";
import { formatINR } from "@/lib/format";
import { getStartingPrice } from "@/lib/productPricing";
import { useUIStore } from "@/store/ui";
import {
  ArrowRightIcon,
  ClockIcon,
  CloseIcon,
  FlameIcon,
  LeafIcon,
  PackageIcon,
  SearchIcon,
  SparkleIcon,
} from "@/components/ui/icons";

type PageLink = { title: string; href: string; group: "Pages" };
type ProductHit = Product & { group: "Products"; href: string };
type RecipeHit = Recipe & { group: "Recipes"; href: string };
type Hit = ProductHit | RecipeHit | PageLink;

const PAGE_LINKS: PageLink[] = [
  { title: "All recipes", href: "/recipes", group: "Pages" },
  { title: "Track your order", href: "/order-status", group: "Pages" },
  { title: "About Masala House", href: "/pages/about", group: "Pages" },
  { title: "Frequently asked questions", href: "/pages/faq", group: "Pages" },
  { title: "Contact us", href: "/pages/contact", group: "Pages" },
  { title: "Bulk orders", href: "/pages/bulk-order", group: "Pages" },
  { title: "Export enquiries", href: "/pages/export", group: "Pages" },
  { title: "Kitchen journal", href: "/blog", group: "Pages" },
];

const QUICK_SEARCHES = ["Sambar masala", "Biriyani", "Garam masala", "Whole spices", "Breakfast"];

const GROUP_ORDER = ["Products", "Recipes", "Pages"] as const;

/** `Product` uses `name`, everything else uses `title`. */
const hitTitle = (hit: Hit): string => (hit.group === "Products" ? hit.name : hit.title);

function HitIcon({ hit }: { hit: Hit }) {
  if (hit.group === "Products") return <PackageIcon className="size-4" />;
  if (hit.group === "Recipes") return <ClockIcon className="size-4" />;
  return <SparkleIcon className="size-4" />;
}

export function SearchOverlay() {
  const router = useRouter();
  const open = useUIStore((s) => s.searchOpen);
  const close = useUIStore((s) => s.closeSearch);

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [products, setProducts] = useState<ProductHit[]>([]);
  const [recipes, setRecipes] = useState<RecipeHit[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ---- global ⌘K / Ctrl+K toggle ---- */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        useUIStore.getState().toggleSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---- lazy-load the index the first time the palette opens ---- */
  useEffect(() => {
    if (!open || products.length || recipes.length || loading) return;
    setLoading(true);

    Promise.all([getProducts(), getRecipes()])
      .then(([productItems, recipeItems]) => {
        setProducts(
          productItems.map((product) => ({
            ...product,
            group: "Products" as const,
            href: `/collections/${product.categories[0] ?? "all"}/products/${product.slug}`,
          })),
        );
        setRecipes(
          recipeItems.map((recipe) => ({
            ...recipe,
            group: "Recipes" as const,
            href: `/recipes/${recipe.slug}`,
          })),
        );
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [open, products.length, recipes.length, loading]);

  /* ---- focus + scroll lock ---- */
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 40);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(id);
      document.body.style.overflow = "";
    };
  }, [open]);

  /* ---- filter ---- */
  const results: Hit[] = (() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];

    const productHits = products.filter((product) =>
      [product.name, product.description, product.spice_level, ...product.categories]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );

    const recipeHits = recipes.filter((recipe) =>
      [recipe.title, recipe.cuisine, recipe.dish_type, ...recipe.ingredients]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );

    const pageHits = PAGE_LINKS.filter((page) => page.title.toLowerCase().includes(needle));

    return [...productHits, ...recipeHits, ...pageHits].slice(0, 8);
  })();

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: results.filter((hit) => hit.group === group),
  })).filter((section) => section.items.length > 0);

  const flat = grouped.flatMap((section) => section.items);

  const go = (hit: Hit | undefined) => {
    if (!hit) return;
    close();
    router.push(hit.href);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (flat.length ? (index + 1) % flat.length : 0));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (flat.length ? (index - 1 + flat.length) % flat.length : 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      go(flat[active]);
    }
  };

  if (!open) return null;

  let runningIndex = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[10vh] sm:pt-[12vh]">
      <div
        className="absolute inset-0 bg-ink-950/55 backdrop-blur-sm animate-fade-in"
        onClick={close}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search Masala House"
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-paper-200 bg-white shadow-2xl shadow-ink-950/30 animate-pop"
        onKeyDown={onKeyDown}
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-paper-200 px-5 py-4">
          <SearchIcon className="size-5 shrink-0 text-masala-600" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            placeholder="Search masalas, recipes, help pages…"
            aria-label="Search query"
            autoComplete="off"
            className="w-full bg-transparent text-base text-ink-950 placeholder:text-ink-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={close}
            aria-label="Close search"
            className="btn btn-ghost btn-icon btn-sm shrink-0"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[55vh] overflow-y-auto overscroll-contain p-3">
          {!query.trim() ? (
            <div className="p-2">
              <p className="eyebrow px-2 pt-1 pb-2">Popular right now</p>
              <div className="flex flex-wrap gap-2 px-2 pb-2">
                {QUICK_SEARCHES.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setQuery(term)}
                    className="chip transition hover:border-masala-200 hover:bg-masala-50 hover:text-masala-700"
                  >
                    <FlameIcon className="size-3.5" />
                    {term}
                  </button>
                ))}
              </div>

              <div className="mt-2 border-t border-paper-100 pt-2">
                <p className="eyebrow px-2 pt-2 pb-1">Quick links</p>
                <ul>
                  {PAGE_LINKS.slice(0, 5).map((page, index) => (
                    <li key={page.href}>
                      <button
                        type="button"
                        onClick={() => go(page)}
                        onMouseEnter={() => setActive(index)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-ink-700 transition hover:bg-paper-50"
                      >
                        <HitIcon hit={page} />
                        {page.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : loading && !flat.length ? (
            <ul className="space-y-2 p-2" aria-hidden="true">
              {[0, 1, 2].map((row) => (
                <li key={row} className="skeleton h-14 w-full" />
              ))}
            </ul>
          ) : flat.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <span className="mb-4 grid size-14 place-items-center rounded-full bg-paper-100 text-ink-400">
                <LeafIcon className="size-6" />
              </span>
              <p className="font-display text-lg font-semibold text-ink-950">
                Nothing matched “{query.trim()}”
              </p>
              <p className="mt-1.5 max-w-sm text-sm text-ink-500">
                Try a spice name like “sambar”, a dish like “biryani”, or browse the collections.
              </p>
              <Link
                href="/collections/breakfast-masalas"
                onClick={close}
                className="btn btn-secondary btn-sm mt-5"
              >
                Browse collections
                <ArrowRightIcon className="size-4" />
              </Link>
            </div>
          ) : (
            <div>
              {grouped.map((section) => (
                <div key={section.group} className="mb-2 last:mb-0">
                  <p className="eyebrow px-3 pt-2 pb-1.5">{section.group}</p>
                  <ul>
                    {section.items.map((hit) => {
                      runningIndex += 1;
                      const index = runningIndex;
                      const isActive = index === active;

                      return (
                        <li key={`${hit.group}-${hit.href}-${hitTitle(hit)}`}>
                          <button
                            type="button"
                            onClick={() => go(hit)}
                            onMouseEnter={() => setActive(index)}
                            aria-current={isActive}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition",
                              isActive ? "bg-masala-50" : "hover:bg-paper-50",
                            )}
                          >
                            <span
                              className={cn(
                                "grid size-9 shrink-0 place-items-center rounded-lg border",
                                isActive
                                  ? "border-masala-200 bg-white text-masala-700"
                                  : "border-paper-200 bg-paper-50 text-ink-500",
                              )}
                            >
                              <HitIcon hit={hit} />
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-ink-950">
                                {hit.group === "Products" ? hit.name : hit.title}
                              </span>
                              <span className="block truncate text-xs text-ink-500">
                                {hit.group === "Products"
                                  ? `${hit.spice_level} · ${formatINR(getStartingPrice(hit))}`
                                  : hit.group === "Recipes"
                                    ? `${hit.cuisine} · ${hit.cook_time_minutes} mins`
                                    : "Help page"}
                              </span>
                            </span>

                            <ArrowRightIcon
                              className={cn(
                                "size-4 shrink-0 transition-all",
                                isActive ? "translate-x-0 text-masala-600" : "-translate-x-1 text-transparent",
                              )}
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center justify-between gap-4 border-t border-paper-200 bg-paper-50 px-5 py-3">
          <div className="flex items-center gap-3 text-[0.7rem] text-ink-500">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-paper-300 bg-white px-1.5 py-0.5 font-sans font-semibold">
                ↑
              </kbd>
              <kbd className="rounded border border-paper-300 bg-white px-1.5 py-0.5 font-sans font-semibold">
                ↓
              </kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-paper-300 bg-white px-1.5 py-0.5 font-sans font-semibold">
                ↵
              </kbd>
              open
            </span>
            <span className="hidden items-center gap-1 sm:flex">
              <kbd className="rounded border border-paper-300 bg-white px-1.5 py-0.5 font-sans font-semibold">
                esc
              </kbd>
              close
            </span>
          </div>
          <span className="text-[0.7rem] text-ink-400">Masala House search</span>
        </div>
      </div>
    </div>
  );
}
