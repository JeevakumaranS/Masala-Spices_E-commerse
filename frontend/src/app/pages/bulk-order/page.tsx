import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BulkOrderForm } from "./BulkOrderForm";
import {
  ArrowRightIcon,
  ClockIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  SparkleIcon,
  TagIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Bulk orders",
  description:
    "Request a bulk quote for restaurants, caterers, retailers and resellers — small-batch masalas packed to your volume, with samples, specs and pricing within one working day.",
};

const EXPECT = [
  {
    icon: ClockIcon,
    title: "Reply within one working day",
    body: "Quotes come back with price, lead time and shipping options — reviewed by a person, not a calculator.",
  },
  {
    icon: SparkleIcon,
    title: "Samples before you commit",
    body: "We send sample pouches of the blends you are considering, so your kitchen can taste the actual batch first.",
  },
  {
    icon: TagIcon,
    title: "No fixed minimum",
    body: "MOQs depend on the blend and the pack size. We set them per enquiry, and we say so plainly if a volume is not worth your money.",
  },
];

const HELP_CARDS = [
  {
    title: "Read the FAQ",
    body: "Confirmation flow, shipping timelines, freshness and returns — the questions wholesale buyers ask first.",
    href: "/pages/faq",
    cta: "Browse answers",
  },
  {
    title: "Shop the blends",
    body: "Name the SKUs in your enquiry by browsing the shelves customers order from every week.",
    href: "/collections/breakfast-masalas",
    cta: "View collections",
  },
  {
    title: "Track an order",
    body: "Already ordered? Look up where a parcel is with your order number and phone.",
    href: "/order-status",
    cta: "Order status",
  },
];

export default function BulkOrderPage() {
  return (
    <>
      {/* ============================ HERO + FORM ============================ */}
      <section className="shell py-14 md:py-20">
        <Breadcrumbs items={[{ label: "Bulk orders" }]} />

        <div className="mt-6 max-w-2xl">
          <p className="eyebrow">Wholesale & bulk</p>
          <h1 className="section-title mt-3">Masala by the case, packed to your spec.</h1>
          <p className="lede mt-4">
            Restaurants, caterers, retailers and resellers — tell us what you cook with, how much
            you need each month and where it ships. Same small-batch roasting, quoted to your
            volume.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          {/* --- enquiry form --- */}
          <Reveal className="h-full">
            <div className="card h-full p-6 md:p-8">
              <h2 className="font-display text-2xl font-semibold text-ink-950">
                Request a quote
              </h2>
              <p className="mt-2 text-sm text-ink-600">
                All fields required — the more detail you give, the closer the first quote lands.
              </p>
              <div className="mt-6">
                <BulkOrderForm />
              </div>
            </div>
          </Reveal>

          {/* --- what to expect --- */}
          <Reveal delay={100} className="h-full">
            <aside className="panel h-full p-6 md:p-8">
              <h2 className="font-display text-2xl font-semibold text-ink-950">
                What to expect
              </h2>

              <ul className="mt-5 space-y-4">
                {EXPECT.map((item) => (
                  <li key={item.title} className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-white text-masala-700 shadow-xs">
                      <item.icon className="size-[1.05rem]" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink-900">{item.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-ink-600">{item.body}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="hairline mt-6 space-y-3 pt-5 text-sm">
                <p className="text-sm font-semibold text-ink-900">Talk to the wholesale desk</p>
                <p className="flex items-start gap-2.5 text-ink-600">
                  <MapPinIcon className="mt-0.5 size-4 shrink-0 text-masala-600" />
                  14 Mill Road, Egmore, Chennai 600008
                </p>
                <p className="flex items-center gap-2.5 text-ink-600">
                  <PhoneIcon className="size-4 shrink-0 text-masala-600" />
                  <a
                    href="tel:+919876543210"
                    className="font-semibold text-ink-900 underline-offset-4 transition hover:text-masala-700 hover:underline"
                  >
                    +91 98765 43210
                  </a>
                </p>
                <p className="flex items-center gap-2.5 text-ink-600">
                  <MailIcon className="size-4 shrink-0 text-masala-600" />
                  <a
                    href="mailto:hello@masalahouse.in"
                    className="font-semibold text-ink-900 underline-offset-4 transition hover:text-masala-700 hover:underline"
                  >
                    hello@masalahouse.in
                  </a>
                </p>
              </div>

              <div className="hairline mt-6 pt-5">
                <Link
                  href="/pages/export"
                  className="group inline-flex items-center gap-2 text-sm font-semibold text-masala-700 transition hover:text-masala-800"
                >
                  Shipping internationally? See export enquiries
                  <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </aside>
          </Reveal>
        </div>
      </section>

      {/* ============================ HELP ============================ */}
      <section className="bg-paper-100 py-14 md:py-20">
        <div className="shell">
          <Reveal>
            <SectionHeading
              eyebrow="While you decide"
              title="Useful before you enquire"
              description="Answers, SKUs and parcel tracking — everything that makes the form faster to fill."
            />
          </Reveal>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {HELP_CARDS.map((card, index) => (
              <Reveal key={card.href} delay={index * 90} className="h-full">
                <Link href={card.href} className="card card-hover group flex h-full flex-col p-6">
                  <h3 className="font-display text-xl font-semibold text-ink-950">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{card.body}</p>
                  <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-masala-700">
                    {card.cta}
                    <span className="grid size-8 place-items-center rounded-full border border-masala-200 bg-white transition-all duration-300 group-hover:bg-masala-700 group-hover:text-white">
                      <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
