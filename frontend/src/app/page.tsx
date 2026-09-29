import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroImageCarousel } from "@/components/HeroImageCarousel";
import { SmartImage } from "@/components/ui/SmartImage";
import { getActiveOffers, getCategories, getProducts, getRecipes } from "@/lib/api";
import { formatINR } from "@/lib/format";
import {
  ArrowRightIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Masala House | Freshly ground spice blends",
  description:
    "Explore curated spice blends, recipe inspiration and easy everyday masala picks — roasted and ground in small batches.",
};

const TICKER = [
  "Stone-ground, never beaten",
  "No fillers or anti-caking agents",
  "Roasted in 4kg batches",
  "Sealed within 48 hours",
  "Single-origin whole spices",
  "Recipes that actually work",
];

const CTA_LINKS = [
  { label: "All recipes", href: "/recipes" },
  { label: "Bulk orders", href: "/pages/bulk-order" },
  { label: "Export enquiries", href: "/pages/export" },
  { label: "FAQ", href: "/pages/faq" },
];

export default async function HomePage() {
  const [categories, products, recipes, offers, comboProducts] = await Promise.all([
    getCategories(),
    getProducts(),
    getRecipes(),
    getActiveOffers(),
    getProducts("combos-packs"),
  ]);

  const bestsellers = products.slice(0, 6);
  const featuredCategories = categories.slice(0, 3);
  const featuredRecipes = recipes.slice(0, 4);
  const featuredCombos = comboProducts.slice(0, 4);
  const featuredOffers = offers.slice(0, 3);

  return (
    <>
      {/* ============================ HERO ============================ */}
      <section className="relative overflow-hidden bg-[radial-gradient(130%_100%_at_0%_0%,var(--color-saffron-50),transparent_55%),radial-gradient(110%_100%_at_100%_0%,var(--color-masala-50),transparent_50%)]">
        <div className="grain">
          <div className="flex w-full justify-center">
            <HeroImageCarousel
              images={products.flatMap((product) =>
                product.images.map((image) => ({
                  src: image.url,
                  alt: image.alt_text,
                })),
              )}
            />
          </div>
        </div>
      </section>

      {/* ============================ TICKER ============================ */}
      <section
        aria-label="Our promises"
        className="overflow-hidden border-y border-paper-200 bg-white py-3.5"
      >
        <div className="flex w-max animate-marquee gap-8 hover:[animation-play-state:paused] motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-6">
          {[...TICKER, ...TICKER].map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="flex items-center gap-8 text-[0.78rem] font-semibold tracking-[0.16em] whitespace-nowrap text-ink-500 uppercase"
            >
              {item}
              <span className="size-1.5 rounded-full bg-masala-300" aria-hidden="true" />
            </span>
          ))}
        </div>
      </section>

      {/* ============================ CATEGORIES ============================ */}
      <section className="shell py-14 md:py-20">
        <Reveal>
          <SectionHeading
            eyebrow="Start here"
            title="Shop by category"
            description="Three shelves, everything flavour-first. Pick a starting point and we'll do the roasting."
            action={
              featuredCategories[0]
                ? { label: "View all collections", href: `/collections/${featuredCategories[0].slug}` }
                : undefined
            }
          />
        </Reveal>

        {featuredCategories.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="Collections are being restocked"
              description="Our catalogue is loading from the kitchen. Check back in a moment."
              action={{ label: "Browse recipes", href: "/recipes" }}
            />
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {featuredCategories.map((category, index) => (
              <Reveal key={category.slug} delay={index * 90}>
                <Link
                  href={`/collections/${category.slug}`}
                  className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-paper-200 bg-paper-100 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-masala-200 hover:shadow-lg"
                >
                  <span
                    className="pointer-events-none absolute -top-16 -right-16 size-52 rounded-full bg-[radial-gradient(circle,var(--color-saffron-200),transparent_70%)] opacity-70 transition-transform duration-500 group-hover:scale-125"
                    aria-hidden="true"
                  />

                  <div className="relative">
                    <p className="eyebrow">{category.type}</p>
                    <h3 className="mt-3 font-display text-2xl font-semibold text-ink-950">
                      {category.name}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-600">
                      {category.description ?? "Small-batch blends, ground to order."}
                    </p>
                  </div>

                  <span className="relative mt-8 inline-flex items-center gap-2 text-sm font-semibold text-masala-700">
                    Browse shelf
                    <span className="grid size-8 place-items-center rounded-full border border-masala-200 bg-white transition-all duration-300 group-hover:bg-masala-700 group-hover:text-white">
                      <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* ============================ BESTSELLERS ============================ */}
      <section className="bg-white py-14 md:py-20">
        <div className="shell">
          <Reveal>
            <SectionHeading
              eyebrow="Most reordered"
              title="Bestsellers"
              description="The jars our customers replace before they run out."
              action={{ label: "Shop all blends", href: "/collections/breakfast-masalas" }}
            />
          </Reveal>

          {bestsellers.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                eyebrow="No products yet"
                title="The shelves are empty"
                description="Products are being synced from the kitchen API. Try refreshing shortly."
                action={{ label: "Read the journal", href: "/blog" }}
              />
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {bestsellers.map((product, index) => (
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

      {/* ============================ COMBOS & OFFERS ============================ */}
      <section className="bg-paper-50 py-14 md:py-20">
        <div className="shell">
          <Reveal>
            <SectionHeading
              eyebrow="Better value"
              title="Combos made for the way you cook"
              description="Stock up on pantry favourites and take advantage of our latest offers."
              action={{ label: "Shop all combos", href: "/collections/combos-packs" }}
            />
          </Reveal>

          {featuredCombos.length ? (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {featuredCombos.map((product, index) => (
                <Reveal key={product.id} delay={index * 70} className="h-full">
                  <ProductCard product={product} density="compact" className="h-full" />
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-ink-500">
              Combo packs are coming soon. Browse all{" "}
              <Link href="/collections/combos-packs" className="font-semibold text-masala-700 underline">
                combos and packs
              </Link>
              .
            </p>
          )}

          <div className="mt-10">
            <h3 className="font-display text-2xl font-semibold text-ink-950">Current offers</h3>
            {featuredOffers.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {featuredOffers.map((offer) => (
                  <article key={offer.code} className="rounded-2xl border border-saffron-200 bg-white p-5">
                    <p className="font-semibold text-ink-950">{offer.label}</p>
                    <p className="mt-1 text-sm font-medium text-masala-700">
                      {offer.kind === "percentage"
                        ? `${offer.discount_value}% off`
                        : offer.kind === "fixed"
                          ? `${formatINR(offer.discount_value)} off`
                          : `Buy ${offer.buy_quantity}, get ${offer.free_quantity}`}
                      {offer.first_order_only ? " · First order" : ""}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-paper-200 pt-3">
                      <span className="text-xs text-ink-500">
                        {offer.minimum_order > 0 ? `On orders over ${formatINR(offer.minimum_order)}` : "Use at checkout"}
                      </span>
                      <span className="rounded-lg bg-saffron-100 px-2.5 py-1 font-mono text-sm font-bold tracking-wider text-ink-900">
                        {offer.code}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-500">No active offers right now. Check back soon.</p>
            )}
          </div>
        </div>
      </section>

      {/* ============================ RECIPES ============================ */}
      <section className="bg-white py-14 text-ink-950 md:py-20">
        <div className="shell">
          <Reveal>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="eyebrow text-saffron-700">Cook with confidence</p>
                <h2 className="mt-2.5 font-display text-3xl font-semibold text-ink-950 md:text-4xl">
                  Recipes that put the jar to work
                </h2>
                <p className="mt-3 text-base leading-relaxed text-ink-600">
                  Written for home cooks — measured in spoons, not scales, and timed for a
                  weeknight.
                </p>
              </div>
              <Link
                href="/recipes"
                className="group inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-masala-700 transition hover:text-masala-900"
              >
                All recipes
                <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>

          {featuredRecipes.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                title="Recipes are simmering"
                description="We're plating up new content. The kitchen journal has plenty to read meanwhile."
                action={{ label: "Open the journal", href: "/blog" }}
                className="!border-paper-200 !bg-paper-50"
              />
            </div>
          ) : (
            <div className="mt-8 grid gap-5 md:grid-cols-4">
              {featuredRecipes.map((recipe, index) => (
                <Reveal key={recipe.slug} delay={index * 90} className="h-full">
                  <Link
                    href={`/recipes/${recipe.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-3xl border border-paper-200 bg-paper-50 transition-all duration-300 hover:-translate-y-1 hover:border-saffron-400 hover:bg-white"
                  >
                    <SmartImage
                      src={recipe.hero_image_url}
                      alt={recipe.title}
                      aspect="aspect-video"
                      sizes="(max-width: 768px) 100vw, 25vw"
                      zoom
                    />
                    <div className="flex flex-1 flex-col p-5">
                      <p className="eyebrow text-saffron-700">{recipe.cuisine}</p>
                      <h3 className="mt-2.5 font-display text-xl leading-snug font-semibold text-ink-950 transition-colors group-hover:text-masala-800">
                        {recipe.title}
                      </h3>
                      <p className="mt-auto pt-4 text-sm text-ink-500">
                        {recipe.cook_time_minutes} mins · {recipe.dish_type}
                      </p>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============================ CTA ============================ */}
      <section className="shell py-14 md:py-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-4xl border border-paper-200 bg-[linear-gradient(120deg,var(--color-masala-50),var(--color-saffron-50))] px-6 py-12 sm:px-10 md:py-16">
            <span
              className="pointer-events-none absolute -right-24 -bottom-28 size-72 rounded-full bg-[radial-gradient(circle,var(--color-masala-200),transparent_70%)]"
              aria-hidden="true"
            />

            <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="eyebrow">Wholesale · Export · Gifting</p>
                <h2 className="section-title mt-3 max-w-xl">
                  Need masala by the case, or by the container?
                </h2>
                <p className="lede mt-4 max-w-lg">
                  We pack for restaurants, retailers and export partners — same small-batch
                  process, scaled to your volume.
                </p>
              </div>

              <div className="flex flex-col gap-3 lg:items-end">
                <div className="flex flex-wrap gap-3">
                  <Link href="/pages/bulk-order" className="btn btn-dark btn-lg">
                    Request a bulk quote
                    <ArrowRightIcon className="size-4" />
                  </Link>
                  <Link href="/pages/contact" className="btn btn-secondary btn-lg">
                    Talk to us
                  </Link>
                </div>

                <ul className="flex flex-wrap gap-2 lg:justify-end">
                  {CTA_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="chip bg-white/70 transition hover:bg-white">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
