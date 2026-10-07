import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { getCategories, getProducts } from "@/lib/api";
import type { Product } from "@/lib/types";
import { getStartingPrice } from "@/lib/productPricing";
import { cn } from "@/lib/cn";
import { LeafIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

function normalizeCategoryKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_]+/g, "-");
}

function findCategory(category: string, categories: Awaited<ReturnType<typeof getCategories>>) {
  const key = normalizeCategoryKey(category);
  const exactMatch = categories.find(
    (item) => normalizeCategoryKey(item.slug) === key || normalizeCategoryKey(item.name) === key,
  );
  if (exactMatch) return exactMatch;

  const prefixMatches = categories.filter(
    (item) => normalizeCategoryKey(item.slug).startsWith(`${key}-`),
  );
  return prefixMatches.length === 1 ? prefixMatches[0] : undefined;
}

/**
 * Metadata resolves before the HTML stream starts, so a bad slug returns a real
 * HTTP 404 here. (The root `loading.tsx` streams a 200 too early for the
 * page-level `notFound()` to still be able to set the status code.)
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const current = findCategory(category, await getCategories());
  if (!current) notFound();

  return {
    title: `${current.name}`,
    description:
      current.description ??
      "Small-batch blends, stone-ground to order and sealed the same week.",
  };
}

type SortKey = "featured" | "price-asc" | "price-desc" | "newest";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "price-asc", label: "Price: low → high" },
  { key: "price-desc", label: "Price: high → low" },
  { key: "newest", label: "Newest" },
];

function normalizeSort(value: string | string[] | undefined): SortKey {
  const first = Array.isArray(value) ? value[0] : value;
  return SORT_OPTIONS.some((option) => option.key === first)
    ? (first as SortKey)
    : "featured";
}

function sortProducts(products: Product[], sort: SortKey): Product[] {
  const list = [...products];
  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => getStartingPrice(a) - getStartingPrice(b));
    case "price-desc":
      return list.sort((a, b) => getStartingPrice(b) - getStartingPrice(a));
    case "newest":
      // The API exposes no timestamp — catalogue id order doubles as newest-first.
      return list.sort((a, b) => b.id.localeCompare(a.id));
    default:
      return list;
  }
}

type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ sort?: string | string[] }>;
};

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category } = await params;
  const { sort } = await searchParams;
  const sortKey = normalizeSort(sort);

  const [categories, products] = await Promise.all([getCategories(), getProducts()]);
  const current = findCategory(category, categories);

  if (!current) {
    notFound();
  }

  const filtered = products.filter((product) => product.categories.includes(current.slug));
  const visible = sortProducts(filtered, sortKey);
  const countLabel = `${visible.length} ${visible.length === 1 ? "blend" : "blends"}`;

  return (
    <>
      {/* ============================ PRODUCT GRID ============================ */}
      <section className="bg-paper-100 py-10 md:py-14">
        <div className="shell">
          {/* Toolbar — count + server-side sort via ?sort= links */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p aria-live="polite" className="text-sm text-ink-500">
              Showing{" "}
              <span className="font-display font-semibold text-ink-950">{countLabel}</span>{" "}
              on this shelf
            </p>

            <nav aria-label="Sort products" className="flex flex-wrap items-center gap-2">
              <span className="text-[0.68rem] font-bold tracking-[0.16em] text-ink-400 uppercase">
                Sort by
              </span>
              {SORT_OPTIONS.map((option) => {
                const isActive = option.key === sortKey;
                return (
                  <Link
                    key={option.key}
                    href={
                      option.key === "featured"
                        ? `/collections/${category}`
                        : `/collections/${category}?sort=${option.key}`
                    }
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "chip transition",
                      isActive
                        ? "!border-masala-700 !bg-masala-700 !text-white"
                        : "!bg-white hover:!border-masala-200 hover:!bg-masala-50 hover:!text-masala-700",
                    )}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {visible.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                icon={<LeafIcon className="size-7" />}
                eyebrow="Nothing here yet"
                title={
                  products.length === 0
                    ? "The shelves are being restocked"
                    : "No blends on this shelf yet"
                }
                description={
                  products.length === 0
                    ? "The catalogue is syncing from the kitchen API. Check back in a moment."
                    : `We couldn't find any products in ${current.name} right now — try another shelf or browse the recipes instead.`
                }
                action={{ label: "Browse recipes", href: "/recipes" }}
              />
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {visible.map((product, index) => (
                <Reveal key={product.id} delay={(index % 3) * 80} className="h-full">
                  <ProductCard
                    product={product}
                    priority={index < 3}
                    density="compact"
                    className="h-full"
                  />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
