import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroImageCarousel } from "@/components/HeroImageCarousel";
import { ProductCard } from "@/components/ProductCard";
import { ProductRail } from "@/components/ProductRail";
import { SmartImage } from "@/components/ui/SmartImage";
import {
  getAllCombos,
  getCategories,
  getHeroImages,
  getHomepageContent,
  getProductsBySlugsAndCategories,
  getRecipes,
} from "@/lib/api";
import {
  ArrowRightIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Masala House | Freshly ground spice blends",
  description:
    "Explore curated spice blends, recipe inspiration and easy everyday masala picks — roasted and ground in small batches.",
};

const TIGHTER_CATEGORY_CROPS = new Set(["masala-powders", "pure-spices", "pickles"]);

type HomepageCategory = {
  slug: string;
  name: string;
  imageUrl?: string;
  href: string;
};

function CategoryLink({ category }: { category: HomepageCategory }) {
  const tighterCrop = TIGHTER_CATEGORY_CROPS.has(category.slug);

  return (
    <Link
      href={category.href}
      className="group flex w-36 shrink-0 flex-col items-center"
    >
      <SmartImage
        src={category.imageUrl}
        alt={category.name}
        aspect="aspect-square"
        sizes="(max-width: 640px) 28vw, (max-width: 1024px) 18vw, 10vw"
        wrapperClassName="size-32 shrink-0 rounded-full"
        className={tighterCrop ? "scale-125" : undefined}
        zoom={false}
      />
      <span className="mt-3 flex min-h-8 w-full items-start justify-center text-center font-display text-[0.82rem] leading-tight font-semibold text-ink-950 transition-colors duration-200 group-hover:text-masala-800 group-focus-visible:text-masala-800 sm:text-sm">
        {category.name}
      </span>
    </Link>
  );
}

export const revalidate = 60;

export default async function HomePage() {
  const [categories, heroImages, homepageContent] = await Promise.all([
    getCategories(),
    getHeroImages(),
    getHomepageContent(),
  ]);

  const configuredBestsellers = homepageContent.bestsellers.product_slugs;
  const categoryImageSlugs = homepageContent.categories.items.map(
    (item) => item.image_product_slug,
  );
  const [products, comboProducts, recipes] = await Promise.all([
    getProductsBySlugsAndCategories(
      [...configuredBestsellers, ...categoryImageSlugs],
      homepageContent.categories.items.map((item) => item.slug),
    ),
    getAllCombos(homepageContent.combos.product_slugs),
    getRecipes(homepageContent.recipes.recipe_slugs),
  ]);

  const bestsellers = configuredBestsellers.length
    ? configuredBestsellers.flatMap((slug) =>
        products.filter((product) => product.slug === slug && !product.is_combo),
      )
    : [];
  const configuredCombos = [...new Set(homepageContent.combos.product_slugs)].slice(0, 4);
  const featuredCombos = configuredCombos.flatMap((slug) =>
    comboProducts.filter((product) => product.is_combo && product.slug === slug),
  );
  const featuredCategories = homepageContent.categories.items.flatMap((entry) => {
    const category = categories.find((item) => item.slug === entry.slug);
    const imageProduct =
      products.find((product) => product.slug === entry.image_product_slug) ??
      products.find((product) => product.categories.includes(entry.slug));
    const categoryImage = entry.image_url || imageProduct?.images[0]?.url;
    return [{
      slug: entry.slug,
      name: entry.label,
      imageUrl: categoryImage,
      href: category ? `/collections/${category.slug}` : "/search",
    }];
  });
  const configuredRecipes = [...new Set(homepageContent.recipes.recipe_slugs)].slice(0, 4);
  const featuredRecipes = configuredRecipes.flatMap((slug) =>
    recipes.filter((recipe) => recipe.slug === slug),
  );
  return (
    <>
      {/* ============================ HERO ============================ */}
      <section className="relative overflow-hidden bg-[radial-gradient(130%_100%_at_0%_0%,var(--color-saffron-50),transparent_55%),radial-gradient(110%_100%_at_100%_0%,var(--color-masala-50),transparent_50%)]">
        <div className="grain">
          <div className="flex w-full justify-center">
            <HeroImageCarousel
              images={heroImages.map((image) => ({ src: image.url, alt: image.alt_text }))}
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
          {[...homepageContent.ticker, ...homepageContent.ticker].map((item, index) => (
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
      <section className="shell pt-8 pb-4 md:pt-10 md:pb-5">
        <Reveal>
          <h2 className="section-title text-center text-3xl text-masala-900 md:text-4xl">
            {homepageContent.categories.title}
          </h2>
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
          <Reveal delay={120}>
            <div className="no-scrollbar mt-6 flex items-start gap-6 overflow-x-auto px-1 pb-2 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 lg:gap-7">
              {featuredCategories.map((category) => (
                <CategoryLink key={category.slug} category={category} />
              ))}
              <Link
                href="/search"
                aria-label="View all collections"
                className="group relative grid size-9 shrink-0 self-center place-items-center rounded-full border border-paper-200 bg-white text-masala-700"
              >
                <ArrowRightIcon className="size-4" />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute top-full z-10 mt-2 rounded-lg bg-ink-950 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  View all collections
                </span>
              </Link>
            </div>
          </Reveal>
        )}
      </section>

      {/* ============================ BESTSELLERS ============================ */}
      {bestsellers.length > 0 ? (
        <ProductRail
          products={bestsellers}
          title={homepageContent.bestsellers.title}
          navigationHref="/search"
        />
      ) : null}

      {/* ============================ COMBOS ============================ */}
      {featuredCombos.length > 0 ? (
        <section className="bg-paper-50 pt-2 pb-8 md:pt-3 md:pb-10">
          <div className="shell">
            <div className="flex flex-col items-center gap-2 sm:relative sm:block">
              <div className="text-center sm:mx-auto sm:max-w-[calc(100%-11rem)]">
                <h2 className="section-title text-center text-3xl text-masala-900 md:text-4xl">Better Valued Combos</h2>
                {homepageContent.combos.description ? <p className="mt-1.5 text-center text-xs text-ink-500 sm:text-sm">{homepageContent.combos.description}</p> : null}
              </div>
              <Link
                href="/offers"
                className="group inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-masala-700 transition hover:text-masala-900 sm:absolute sm:right-0 sm:bottom-0"
              >
                View all offers
                <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {featuredCombos.map((combo, index) => (
                <ProductCard key={combo.id} product={combo} priority={index < 2} density="comfortable" imageAspect="square" className="h-full min-w-0" />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ============================ RECIPES ============================ */}
      {featuredRecipes.length > 0 ? (
      <section className="bg-white py-8 text-ink-950 md:py-10">
        <div className="shell">
          <Reveal>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow text-saffron-700">{homepageContent.recipes.eyebrow}</p>
            <h2 className="mt-2.5 font-display text-3xl font-semibold text-ink-950 md:text-4xl">{homepageContent.recipes.title}</h2>
            <p className="mt-3 text-base leading-relaxed text-ink-600">{homepageContent.recipes.description}</p>
              </div>
              <Link
                href={homepageContent.recipes.link_href}
                className="group inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-masala-700 transition hover:text-masala-900"
              >
                {homepageContent.recipes.link_label}
                <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>

            <div className="no-scrollbar -mx-5 mt-6 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 md:pb-0">
              {featuredRecipes.map((recipe, index) => (
                <Reveal key={recipe.slug} delay={index * 90} className="h-full w-[82%] max-w-sm shrink-0 snap-start md:w-auto md:max-w-none md:shrink">
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
        </div>
      </section>
      ) : null}

    </>
  );
}
