import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  ArrowRightIcon,
  FlameIcon,
  InfoIcon,
  LeafIcon,
  PackageIcon,
  StarAniseIcon,
  TagIcon,
  UtensilsIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Carry home",
  description:
    "Take home Masala House blends as curated packs — family meal packs, gift boxes and occasion selections, assembled to order for gifting and everyday kitchens.",
};

const FORMATS = [
  {
    icon: StarAniseIcon,
    title: "Curated packs",
    body: "Ready-made selections across our shelves, assembled the week you order them — a quick way to carry the house style home without choosing jar by jar.",
  },
  {
    icon: UtensilsIcon,
    title: "Family meal packs",
    body: "Larger formats of the blends a household cooks with weekly, so the kitchen restocks once a month instead of every other shop.",
  },
  {
    icon: PackageIcon,
    title: "Gift boxes",
    body: "Wrapped selections for festivals, housewarmings and host gifts — packed with a note from the kitchen and space for yours.",
  },
];

const PACK_IDEAS = [
  {
    icon: UtensilsIcon,
    title: "Breakfast trio",
    body: "The breakfast shelf in one wrap — pick the blends your mornings actually run on, from pongal days to lazy dosa Sundays.",
    cta: "Browse breakfast masalas",
    href: "/collections/breakfast-masalas",
  },
  {
    icon: FlameIcon,
    title: "Everyday masala set",
    body: "Weeknight gravies, rice dishes and finishing spices, chosen together so the shelf stays complete through the month.",
    cta: "Browse everyday blends",
    href: "/collections/spice-blends",
  },
  {
    icon: LeafIcon,
    title: "Whole spice box",
    body: "Whole spices to toast and grind at home, for cooks who like to start every dish from scratch.",
    cta: "Browse whole spices",
    href: "/pages/contact",
  },
  {
    icon: PackageIcon,
    title: "Family meal pack",
    body: "A month of dinners for a full household in larger formats — restock once instead of weekly, same small-batch grind.",
    cta: "Ask for a family pack",
    href: "/pages/bulk-order",
  },
  {
    icon: StarAniseIcon,
    title: "Host's gift box",
    body: "For housewarmings and festivals: a boxed selection from our shelves, with room for a handwritten note.",
    cta: "Plan a gift box",
    href: "/pages/contact",
  },
  {
    icon: TagIcon,
    title: "Team & favour boxes",
    body: "Gifting at scale for offices, weddings and client hampers — tell us the headcount and budget and we will propose something.",
    cta: "Enquire about gifting",
    href: "/pages/bulk-order",
  },
];

export default function CarryHomePage() {
  return (
    <>
      {/* ============================ HERO ============================ */}
      <section className="shell py-14 md:py-20">
        <Breadcrumbs items={[{ label: "Carry home" }]} />

        <div className="mt-6 max-w-3xl">
          <p className="eyebrow">Take home & gifting</p>
          <h1 className="display mt-5">Carry the kitchen home.</h1>
          <p className="lede mt-6 max-w-2xl">
            Take home our most loved spice blends, or request curated packs for gifting and family
            meals — assembled from the same small-batch shelves, packed the week you ask for them.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/collections/breakfast-masalas" className="btn btn-primary btn-lg">
              Shop breakfast masalas
              <ArrowRightIcon className="size-4" />
            </Link>
            <Link href="/pages/contact" className="btn btn-secondary btn-lg">
              Ask for a curated pack
            </Link>
          </div>
        </div>
      </section>

      {/* ============================ FORMATS ============================ */}
      <section className="bg-paper-100 py-14 md:py-20">
        <div className="shell">
          <Reveal>
            <SectionHeading
              eyebrow="What is available"
              title="Three ways to carry it home."
              description="Whether it is a month of dinners or a gift for someone else's kitchen, it starts from the same jars."
            />
          </Reveal>

          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {FORMATS.map((format, index) => (
              <Reveal key={format.title} delay={index * 90} className="h-full">
                <div className="h-full border-t-2 border-paper-300 pt-5">
                  <span className="grid size-11 place-items-center rounded-2xl bg-white text-masala-700 shadow-xs">
                    <format.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-display text-xl font-semibold text-ink-950">
                    {format.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{format.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ PACK IDEAS ============================ */}
      <section className="shell py-14 md:py-20">
        <Reveal>
          <SectionHeading
            eyebrow="Pack ideas"
            title="Starting points, not fixed products."
            description="Curated selections we assemble to order — nothing here is a fixed SKU and nothing has a set price. Tell us the occasion and budget; we quote before we pack."
          />
        </Reveal>

        <Reveal delay={60}>
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-paper-200 bg-white px-5 py-4">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-saffron-100 text-masala-700">
              <InfoIcon className="size-4" />
            </span>
            <p className="text-sm leading-relaxed text-ink-600">
              <span className="font-semibold text-ink-900">How it works:</span> pick an idea below,
              send us the headcount and budget, and we come back with contents and a quote. Larger
              volumes head to the bulk order form — everything else starts with a message.
            </p>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PACK_IDEAS.map((pack, index) => (
            <Reveal key={pack.title} delay={(index % 3) * 90} className="h-full">
              <Link href={pack.href} className="card card-hover group flex h-full flex-col p-6">
                <span className="grid size-11 place-items-center rounded-2xl bg-masala-50 text-masala-700">
                  <pack.icon className="size-5" />
                </span>
                <h3 className="mt-5 font-display text-xl font-semibold text-ink-950">
                  {pack.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{pack.body}</p>
                <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-masala-700">
                  {pack.cta}
                  <span className="grid size-8 place-items-center rounded-full border border-masala-200 bg-white transition-all duration-300 group-hover:bg-masala-700 group-hover:text-white">
                    <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============================ CTA ============================ */}
      <section className="bg-ink-950 py-14 text-paper-100 md:py-20">
        <div className="shell">
          <Reveal>
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="eyebrow text-saffron-300">Ready when you are</p>
                <h2 className="mt-2.5 font-display text-3xl leading-tight font-semibold text-paper-50 md:text-4xl">
                  Pack a box for your table — or someone else&apos;s.
                </h2>
                <p className="mt-3 max-w-xl text-base leading-relaxed text-paper-300">
                  Shop the breakfast shelf straight away, or tell us what the pack is for and we
                  will curate it, quote it and pack it fresh.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Link href="/collections/breakfast-masalas" className="btn btn-saffron btn-lg">
                  Shop breakfast masalas
                  <ArrowRightIcon className="size-4" />
                </Link>
                <Link href="/pages/bulk-order" className="btn btn-secondary btn-lg">
                  Plan a bigger pack
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
