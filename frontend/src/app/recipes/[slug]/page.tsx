import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecipe, getRecipes } from "@/lib/api";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SmartImage } from "@/components/ui/SmartImage";
import {
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  MapPinIcon,
  UtensilsIcon,
} from "@/components/ui/icons";

export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await getRecipe(slug).catch(() => null);
  // Runs before streaming commits to 200 — guarantees a real HTTP 404 status.
  if (!recipe) notFound();

  return {
    title: recipe.title,
    description: `${recipe.cuisine} recipe with ${recipe.cook_time_minutes} minute cooking time.`,
  };
}

export default async function RecipeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const recipe = await getRecipe(slug).catch(() => null);

  if (!recipe) {
    notFound();
  }

  const allRecipes = await getRecipes();
  const related = allRecipes.filter((item) => item.slug !== recipe.slug).slice(0, 3);

  const meta = [
    { Icon: MapPinIcon, label: "Cuisine", value: recipe.cuisine },
    { Icon: UtensilsIcon, label: "Dish type", value: recipe.dish_type },
    { Icon: ClockIcon, label: "Cook time", value: `${recipe.cook_time_minutes} mins` },
  ];

  return (
    <>
      {/* ============================ BREADCRUMBS + HERO ============================ */}
      <section className="shell py-14 md:py-20">
        <Breadcrumbs items={[{ label: "Recipes", href: "/recipes" }, { label: recipe.title }]} />

        <div className="group relative mt-6 overflow-hidden rounded-3xl md:rounded-4xl">
          <SmartImage
            src={recipe.hero_image_url}
            alt={recipe.title}
            aspect="aspect-video"
            priority
            sizes="100vw"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-ink-950/92 via-ink-950/45 to-transparent"
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 md:p-10">
            <p className="eyebrow text-saffron-300">{recipe.cuisine}</p>
            <h1 className="mt-2 max-w-[20ch] font-display text-2xl leading-tight font-semibold text-paper-50 sm:text-3xl md:text-4xl lg:text-5xl">
              {recipe.title}
            </h1>
            <p className="mt-3 hidden flex-wrap items-center gap-x-5 gap-y-1 text-sm text-paper-300 sm:flex">
              <span className="flex items-center gap-1.5">
                <ClockIcon className="size-4 text-saffron-300" />
                {recipe.cook_time_minutes} mins
              </span>
              <span className="flex items-center gap-1.5">
                <UtensilsIcon className="size-4 text-saffron-300" />
                {recipe.dish_type}
              </span>
            </p>
          </div>
        </div>

        {/* Meta strip */}
        <ul className="panel mt-6 grid gap-x-6 gap-y-4 px-5 py-4 sm:grid-cols-3 sm:py-5">
          {meta.map((item) => (
            <li key={item.label} className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-masala-700 shadow-xs">
                <item.Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.68rem] font-bold tracking-[0.16em] text-ink-400 uppercase">
                  {item.label}
                </span>
                <span className="block truncate font-display text-base font-semibold text-ink-950">
                  {item.value}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ============================ INGREDIENTS + METHOD ============================ */}
      <section className="shell py-14 md:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
          {/* Sidebar: ingredients + CTA */}
          <Reveal className="h-full">
            <div className="lg:sticky lg:top-32">
              <div className="panel p-6">
                <h2 className="font-display text-xl font-semibold text-ink-950">
                  Ingredients
                </h2>
                <p className="mt-1 text-sm text-ink-500">Tick them off as you go.</p>

                {recipe.ingredients.length > 0 ? (
                  <ul className="mt-5 space-y-3">
                    {recipe.ingredients.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 text-[0.975rem] leading-relaxed text-ink-700"
                      >
                        <span
                          className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-cardamom-300 bg-cardamom-50 text-cardamom-700"
                          aria-hidden="true"
                        >
                          <CheckIcon className="size-3" />
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm leading-relaxed text-ink-500">
                    The ingredient list is being updated — check back shortly.
                  </p>
                )}
              </div>

              {/* Use this blend CTA */}
              <div className="relative mt-5 overflow-hidden rounded-3xl bg-ink-950 p-6 text-paper-100">
                <div className="grain absolute inset-0" aria-hidden="true" />
                <div className="relative">
                  <p className="eyebrow text-saffron-300">Use this blend</p>
                  <h2 className="mt-2 font-display text-xl font-semibold text-paper-50">
                    Cook it with our small-batch masalas
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-paper-300">
                    Roasted and ground the same week — the difference shows up in the pan.
                  </p>
                  <Link href="/collections/breakfast-masalas" className="btn btn-saffron mt-5">
                    Shop the blends
                    <ArrowRightIcon className="size-4" />
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Method */}
          <Reveal delay={90} className="h-full">
            <div>
              <p className="eyebrow">Step by step</p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-ink-950 md:text-3xl">
                Method
              </h2>

              {recipe.steps.length > 0 ? (
                <ol className="mt-7 space-y-7">
                  {recipe.steps.map((step, index) => (
                    <li key={index} className="flex gap-4 md:gap-6">
                      <span
                        aria-hidden="true"
                        className="w-9 shrink-0 pt-1 font-display text-3xl leading-none font-semibold text-masala-700 md:w-12 md:text-4xl"
                      >
                        {index + 1}
                      </span>
                      <p className="text-[1.0625rem] leading-8 text-ink-700">{step}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-5 text-sm leading-relaxed text-ink-500">
                  The method for this recipe is being written up — check back shortly.
                </p>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================ RELATED ============================ */}
      <section className="bg-paper-100 py-14 md:py-20">
        <div className="shell">
          <Reveal>
            <SectionHeading
              eyebrow="Cook next"
              title="More recipes to try"
              description="Three more from the recipe book, picked for your next cook."
              action={{ label: "All recipes", href: "/recipes" }}
            />
          </Reveal>

          {related.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                title="More recipes are simmering"
                description="This is the only one on the menu so far — the kitchen journal has plenty to read meanwhile."
                action={{ label: "Open the journal", href: "/blog" }}
              />
            </div>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item, index) => (
                <Reveal key={item.slug} delay={index * 90} className="h-full">
                  <Link
                    href={`/recipes/${item.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-3xl border border-paper-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-paper-300 hover:shadow-lg"
                  >
                    <SmartImage
                      src={item.hero_image_url}
                      alt={item.title}
                      aspect="aspect-video"
                      zoom
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="flex flex-1 flex-col p-5">
                      <p className="eyebrow">{item.cuisine}</p>
                      <h3 className="mt-2.5 font-display text-xl leading-snug font-semibold text-ink-950 transition-colors group-hover:text-masala-800">
                        {item.title}
                      </h3>
                      <p className="mt-auto flex items-center gap-1.5 pt-4 text-sm text-ink-500">
                        <ClockIcon className="size-4 shrink-0 text-masala-600" />
                        <span className="truncate">
                          {item.cook_time_minutes} mins · {item.dish_type}
                        </span>
                      </p>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
