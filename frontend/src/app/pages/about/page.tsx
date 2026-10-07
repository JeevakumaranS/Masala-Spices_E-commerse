import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SmartImage } from "@/components/ui/SmartImage";
import { getAboutImage, getProducts } from "@/lib/api";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  FlameIcon,
  LeafIcon,
  SparkleIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "About us",
  description:
    "The Masala House story — whole spices bought by the lot, slow-roasted in small batches and stone-ground in Chennai for flavour-first everyday cooking.",
};

const VALUES = [
  {
    icon: LeafIcon,
    title: "Sourced whole",
    body: "We buy whole spices by the lot from growers we visit — never pre-ground commodity powder. What reaches the kitchen still smells like the field it came from.",
  },
  {
    icon: FlameIcon,
    title: "Roasted to its own schedule",
    body: "Every spice is roasted on its own timetable, because coriander and dry chilli never share one. Four kilos at a time means we can stop, taste and adjust instead of guessing at scale.",
  },
  {
    icon: SparkleIcon,
    title: "Ground cool, sealed fresh",
    body: "Stone-ground slowly so the volatile oils stay in the jar, then packed and dated the same week. No fillers, no anti-caking agents, nothing bulking up the weight.",
  },
];

const PROMISES = [
  "Single-origin whole spices, bought by the lot",
  "Roasted and stone-ground in 4 kg batches",
  "No fillers or anti-caking agents, ever",
  "Sealed, dated and dispatched the same week",
];

export default async function AboutPage() {
  const [products, aboutImage] = await Promise.all([getProducts(), getAboutImage()]);
  const heroImage = products.find((product) => product.slug === "sambar-masala")?.images[0]?.url;
  const storyImage = aboutImage || products.find((product) => product.slug === "biriyani-masala")?.images[0]?.url;

  return (
    <>
      {/* ============================ HERO ============================ */}
      <section className="shell py-14 md:py-20">
        <div className="max-w-3xl">
          <p className="eyebrow">Our story</p>
          <h1 className="display mt-5">
            Fresh spices, slow roasting, blends built for real kitchens.
          </h1>
          <p className="lede mt-6 max-w-2xl">
            We source fresh spices, roast and blend in small batches, and build each masala for
            flavour-first everyday cooking — the slow way, because you can taste the difference in a
            single spoon.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/search" className="btn btn-primary btn-lg">
              Shop the blends
              <ArrowRightIcon className="size-4" />
            </Link>
            <Link href="/recipes" className="btn btn-secondary btn-lg">
              Explore recipes
            </Link>
          </div>
        </div>

        <Reveal delay={120}>
          <div className="mt-10 overflow-hidden rounded-3xl border border-paper-200 shadow-md">
            <SmartImage
              src={heroImage}
              alt="Assorted whole spices, seeds and ground masalas arranged on a pale wooden table"
              aspect="aspect-video"
              priority
              sizes="(max-width: 1024px) 100vw, 1200px"
              wrapperClassName="rounded-3xl"
            />
          </div>
        </Reveal>
      </section>

      {/* ============================ VALUES ============================ */}
      <section className="relative overflow-hidden bg-[radial-gradient(120%_100%_at_100%_0%,var(--color-saffron-50),transparent_60%),radial-gradient(100%_110%_at_0%_100%,var(--color-masala-50),transparent_55%)]">
        <div className="grain">
          <div className="shell py-14 md:py-20">
            <Reveal>
              <SectionHeading
                eyebrow="What we stand for"
                title="Three habits we refuse to rush."
                description="Sourcing, roasting and grinding — the whole product, honestly done. No statistics, just the routine that ends up in your jar."
              />
            </Reveal>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {VALUES.map((value, index) => (
                <Reveal key={value.title} delay={index * 90} className="h-full">
                  <article className="card card-hover flex h-full flex-col p-6">
                    <span className="grid size-11 place-items-center rounded-2xl bg-masala-50 text-masala-700">
                      <value.icon className="size-5" />
                    </span>
                    <h3 className="mt-5 font-display text-xl font-semibold text-ink-950">
                      {value.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-600">{value.body}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================ HOW WE GOT HERE ============================ */}
      <section className="bg-paper-100 py-14 md:py-20">
        <div className="shell grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <Reveal>
            <div>
              <p className="eyebrow">How we got here</p>
              <h2 className="section-title mt-3">Built in a Chennai kitchen, one roast at a time.</h2>

              <div className="mt-5 space-y-4 text-[0.975rem] leading-relaxed text-ink-600">
                <p>
                  Most masala is bought by the tonne, pre-ground, blended with whatever bulks it out
                  and left to sit for months. Masala House started as a refusal to cook that way —
                  the way a careful home kitchen already does, only steadier.
                </p>
                <p>
                  So the routine never changed: whole spices bought by the lot, each one roasted on
                  its own schedule, ground cool on stone, then sealed and dated the same week it was
                  ground. It is slower and it costs more per kilo. It also tastes like something.
                </p>
                <p>
                  That same small-batch process now runs out of our kitchen in Egmore for everyday
                  households, restaurant tandoors and wholesale partners alike — flavour-first
                  cooking, whatever size the order is.
                </p>
              </div>

              <ul className="mt-6 space-y-2.5 text-sm text-ink-700">
                {PROMISES.map((promise) => (
                  <li key={promise} className="flex items-start gap-2.5">
                    <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-cardamom-600" />
                    {promise}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="overflow-hidden rounded-3xl border border-paper-200 shadow-md">
              <SmartImage
                src={storyImage}
                alt="Spoons of chilli powder, turmeric and ground masala beside coriander seeds and black peppercorns"
                aspect="aspect-video"
                sizes="(max-width: 1024px) 100vw, 46vw"
                wrapperClassName="rounded-3xl"
                zoom
              />
            </div>
          </Reveal>
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
                <p className="eyebrow">Cook with us</p>
                <h2 className="section-title mt-3 max-w-xl">Put the jar to work.</h2>
                <p className="lede mt-4 max-w-lg">
                  Every blend here is written into recipes measured in spoons, not scales — or write
                  to the kitchen directly if you would rather ask a human first.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Link href="/recipes" className="btn btn-primary btn-lg">
                  Explore recipes
                  <ArrowRightIcon className="size-4" />
                </Link>
                <Link href="/pages/contact" className="btn btn-secondary btn-lg">
                  Contact us
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
