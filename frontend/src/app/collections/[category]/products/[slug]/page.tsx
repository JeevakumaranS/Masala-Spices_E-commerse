import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Accordion } from "@/components/ui/Accordion";
import type { AccordionItem } from "@/components/ui/Accordion";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { getProduct, getProducts, getRecipes } from "@/lib/api";
import { LeafIcon, RefreshIcon, TruckIcon } from "@/components/ui/icons";
import { ProductGallery } from "./ProductGallery";
import { ProductPurchasePanel } from "./ProductPurchasePanel";
import { ProductRecommendations } from "./ProductRecommendations";
import { ProductReviews } from "./ProductReviews";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  // Must happen in generateMetadata: it runs before streaming commits to 200,
  // so a missing product returns a real HTTP 404 rather than a soft one.
  if (!product) notFound();

  return {
    title: product.name,
    description: product.description,
  };
}

const TRUST_POINTS = [
  {
    Icon: TruckIcon,
    title: "Free shipping over ₹349",
    body: "Packed within 24 hours and at your door in 2–5 days, pan-India.",
  },
  {
    Icon: RefreshIcon,
    title: "7-day easy returns",
    body: "Unopened jars, no questions asked — just send us the order ID.",
  },
  {
    Icon: LeafIcon,
    title: "Small-batch, filler-free",
    body: "Roasted and stone-ground weekly. Never anti-caking agents, never bulking flour.",
  },
];

export default async function ProductPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { slug } = await params;
  const [product, products, recipes] = await Promise.all([
    getProduct(slug).catch(() => null),
    getProducts(),
    getRecipes(),
  ]);

  if (!product) {
    notFound();
  }

  const categorySlug = product.categories[0] ?? "breakfast-masalas";
  const linkedRecipe = recipes.find(
    (recipe) =>
      recipe.dish_type.toLowerCase() === product.dish_type?.toLowerCase() ||
      product.name.toLowerCase().includes(recipe.dish_type.toLowerCase()),
  );

  const details: AccordionItem[] = [
    {
      title: "Ingredients",
      content: product.ingredients.length
        ? `${product.ingredients.join(", ")}. Nothing else — no fillers, anti-caking agents or added colour.`
        : "The full ingredient list isn't published for this jar yet — message us and we'll send the lab sheet for the current batch.",
    },
    {
      title: "Shipping & returns",
      content:
        "Free shipping on orders over ₹349. We dispatch within one working day and most orders land in 2–5 days. Unopened jars can be returned within 7 days of delivery — write to us with the order ID and we'll arrange a pickup or refund.",
    },
    {
      title: "How we source",
      content:
        "Whole spices are bought grower-direct by the lot — single-origin lots we visit and taste before buying. Each spice is roasted on its own schedule, stone-ground cool the same week, and nitrogen-flushed within 48 hours so the volatile oils stay in the jar.",
    },
  ];

  return (
    <>
      {/* ============================ GALLERY + PURCHASE ============================ */}
      <section className="shell py-14 md:py-20">
        <Breadcrumbs
          items={[
            { label: "Collections", href: `/collections/${categorySlug}` },
            { label: product.name },
          ]}
        />

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <ProductGallery product={product} />
          <ProductPurchasePanel product={product} />
        </div>
      </section>

      {/* ============================ TRUST ROW ============================ */}
      <section className="border-y border-paper-200 bg-white">
        <ul className="shell grid gap-6 py-8 sm:grid-cols-3 md:py-10">
          {TRUST_POINTS.map(({ Icon, title, body }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-masala-50 text-masala-700">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-base font-semibold text-ink-950">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-600">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ============================ INGREDIENTS + DETAILS ============================ */}
      <section className="bg-paper-100 py-14 md:py-20">
        <div className="shell grid gap-10 lg:grid-cols-2 lg:gap-14">
          <Reveal className="h-full">
            <div className="flex h-full flex-col">
              <p className="eyebrow">What&apos;s in the jar</p>
              <h2 className="section-title mt-3">Just spices — nothing to hide</h2>
              <p className="lede mt-3">
                Every spoon of {product.name} is ground from whole spices we roast ourselves —
                measured for a real kitchen, not a factory line.
              </p>

              {product.ingredients.length > 0 ? (
                <ul className="mt-6 flex flex-wrap gap-2">
                  {product.ingredients.map((ingredient) => (
                    <li key={ingredient} className="chip !bg-white !text-ink-700">
                      {ingredient}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-6">
                  <EmptyState
                    eyebrow="Ingredients"
                    title="Ingredient list pending"
                    description="We publish the full list for each batch as it comes off the mill. Ask us and we'll send it over."
                    action={{ label: "Contact the kitchen", href: "/pages/contact" }}
                  />
                </div>
              )}
            </div>
          </Reveal>

          <Reveal delay={100} className="h-full">
            <div>
              <p className="eyebrow">Good to know</p>
              <h2 className="section-title mt-3">The fine print</h2>
              <Accordion className="mt-6" items={details} defaultOpen={0} />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-b border-paper-200 bg-white py-14 md:py-20">
        <div className="shell grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <p className="eyebrow">Product details</p>
            <h2 className="section-title mt-3">Everything in the jar</h2>
            <p className="lede mt-3">{product.description}</p>
          </div>
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {[
              ["Net weight", product.net_weight ?? product.variants[0]?.pack_size ?? "See pack selector"],
              ["Spice level", product.spice_level],
              ["Salt", product.contains_salt ? "Included" : "Not included"],
            ].map(([label, value]) => (
              <div key={label} className="border-b border-paper-200 pb-3">
                <dt className="text-xs font-bold tracking-[0.14em] text-ink-400 uppercase">{label}</dt>
                <dd className="mt-1 text-sm font-medium text-ink-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {linkedRecipe ? (
        <section className="bg-paper-100 py-14 md:py-20">
          <div className="shell grid gap-8 rounded-[2rem] bg-white p-6 shadow-sm sm:p-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="eyebrow">Linked recipe</p>
              <h2 className="section-title mt-3">{linkedRecipe.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">{linkedRecipe.cook_time_minutes} minutes · {linkedRecipe.cuisine}</p>
              <Link href={`/recipes/${linkedRecipe.slug}`} className="btn btn-primary mt-6">See how to cook it</Link>
            </div>
            <div className="grid gap-3">
              {linkedRecipe.steps.slice(0, 3).map((step, index) => (
                <div key={step} className="flex gap-3 rounded-2xl bg-paper-50 p-4">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-masala-700 text-sm font-bold text-white">{index + 1}</span>
                  <p className="text-sm leading-relaxed text-ink-700">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <ProductReviews product={product} />
      <ProductRecommendations product={product} products={products} />
    </>
  );
}
