import type { Metadata } from "next";
import Link from "next/link";
import type { AccordionItem } from "@/components/ui/Accordion";
import { Accordion } from "@/components/ui/Accordion";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ArrowRightIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description:
    "How Masala House orders are confirmed, payment methods, shipping timelines and the ₹349 free-shipping threshold, freshness, allergens, returns, export and bulk orders.",
};

const linkClass =
  "font-semibold text-masala-700 underline-offset-4 transition hover:text-masala-800 hover:underline";

const GROUPS: { id: string; eyebrow: string; title: string; items: AccordionItem[] }[] = [
  {
    id: "orders",
    eyebrow: "Orders & payment",
    title: "Placing and paying for an order",
    items: [
      {
        title: "How is my order confirmed?",
        content: (
          <p>
            Checkout gives you an on-screen confirmation, and then we confirm the order{" "}
            <strong className="font-semibold text-ink-900">
              offline after our admin team reviews it
            </strong>
            . Keep the order number handy — we use it when we call or email to confirm. Once that
            confirmation lands, your order is scheduled for the next grind-and-dispatch cycle.
          </p>
        ),
      },
      {
        title: "Which payment methods do you accept?",
        content: (
          <p>
            UPI, Visa, Mastercard, RuPay, net banking and cash on delivery — the same list you will
            see in the site footer. If a method you want is missing at checkout, contact us before
            ordering and we will sort it out.
          </p>
        ),
      },
      {
        title: "Where can I track my order?",
        content: (
          <p>
            On the{" "}
            <Link href="/order-status" className={linkClass}>
              order status page
            </Link>{" "}
            — you need your order number and the phone number you ordered with. If the lookup comes
            back empty or a status looks wrong,{" "}
            <Link href="/pages/contact" className={linkClass}>
              send us a message
            </Link>{" "}
            with the order number and we will check it from the kitchen side.
          </p>
        ),
      },
    ],
  },
  {
    id: "products",
    eyebrow: "Products & freshness",
    title: "What is actually in the jar",
    items: [
      {
        title: "How fresh is the masala, and how long will it keep?",
        content: (
          <p>
            We roast in 4&nbsp;kg batches and seal the pouches the same week they are ground —
            usually within 48 hours. Every pack carries its grind date. For peak aroma, use ground
            masala within the first few months and finish the jar soon after opening; spices lose
            their oils slowly, they do not suddenly go off.
          </p>
        ),
      },
      {
        title: "Do you publish ingredients and allergen information?",
        content: (
          <p>
            Yes. Every blend lists its full ingredients on the pack and on its product page, and our
            masalas are ground spices only — no fillers, no anti-caking agents, no added colour. If
            you have an allergy or dietary concern, write to us before ordering and we will confirm
            the exact ingredients for that batch.
          </p>
        ),
      },
      {
        title: "How should I store my spices?",
        content: (
          <p>
            Airtight, in a cool cupboard away from the stove and direct sunlight, with a dry spoon.
            No refrigeration needed — humidity and repeated cold-to-warm cycles are what dull the
            aroma, not time on the shelf.
          </p>
        ),
      },
    ],
  },
  {
    id: "shipping",
    eyebrow: "Shipping & bigger orders",
    title: "Delivery, returns, export and wholesale",
    items: [
      {
        title: "What are the shipping timelines, and when is shipping free?",
        content: (
          <p>
            Shipping is free on orders over&nbsp;₹349; below that, the fee is shown at checkout.
            Dispatch happens after the offline confirmation, usually within a couple of working
            days. Metro addresses typically receive parcels 2–4 working days after dispatch, with
            the rest of India taking a little longer. Need it for a specific date? Tell us when you
            order and we will be honest about whether it fits.
          </p>
        ),
      },
      {
        title: "What if my parcel arrives damaged?",
        content: (
          <p>
            Photograph the parcel and the jar, then email{" "}
            <a href="mailto:hello@masalahouse.in" className={linkClass}>
              hello@masalahouse.in
            </a>{" "}
            within 48 hours of delivery with your order number. We review it and arrange a
            replacement or a refund — you will not be asked to argue your case twice.
          </p>
        ),
      },
      {
        title: "Do you ship internationally?",
        content: (
          <p>
            Yes. Choose “Flying Abroad” at checkout to see supported destinations,
            destination-specific shipping and customs guidance. Payment, duties and clearance are
            arranged offline with the admin. For larger export volumes, packaging formats and
            documentation, use our{" "}
            <Link href="/pages/export" className={linkClass}>
              export page
            </Link>
            .
          </p>
        ),
      },
      {
        title: "Can I order in bulk or wholesale?",
        content: (
          <p>
            Yes — we pack for restaurants, retailers, caterers and resellers using the same
            small-batch process. Send your estimated monthly volume through the{" "}
            <Link href="/pages/bulk-order" className={linkClass}>
              bulk order form
            </Link>{" "}
            and we will reply with pricing, lead times and sample options.
          </p>
        ),
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <>
      {/* ============================ HERO ============================ */}
      <section className="shell py-14 md:py-20">
        <Breadcrumbs items={[{ label: "FAQ" }]} />

        <div className="mt-6 max-w-3xl">
          <p className="eyebrow">Help desk</p>
          <h1 className="display mt-5">Questions, answered properly.</h1>
          <p className="lede mt-6 max-w-2xl">
            Order confirmation, payments, freshness, shipping and everything in between — the
            answers we give on the phone, written down.
          </p>
        </div>
      </section>

      {/* ============================ QUESTIONS ============================ */}
      <section className="bg-paper-100 py-14 md:py-20">
        <div className="shell">
          {GROUPS.map((group, groupIndex) => (
            <div key={group.id} className={groupIndex > 0 ? "mt-12" : undefined}>
              <Reveal>
                <SectionHeading eyebrow={group.eyebrow} title={group.title} />
              </Reveal>
              <Reveal delay={90}>
                <Accordion items={group.items} multiple className="mt-6" />
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      {/* ============================ STILL STUCK ============================ */}
      <section className="shell py-14 md:py-20">
        <Reveal>
          <div className="grain relative overflow-hidden rounded-4xl bg-ink-950 px-6 py-12 sm:px-10 md:py-14">
            <span
              className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-[radial-gradient(circle,rgb(214_93_49/0.4),transparent_70%)]"
              aria-hidden="true"
            />

            <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="eyebrow text-saffron-300">Still stuck?</p>
                <h2 className="section-title mt-3 text-paper-50">Ask the kitchen directly.</h2>
                <p className="lede mt-4 max-w-lg text-paper-300">
                  If your question is not here, send it through — we reply within one working day,
                  Monday to Saturday. Already know your order number? Track it instead.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Link href="/pages/contact" className="btn btn-saffron btn-lg">
                  Contact us
                  <ArrowRightIcon className="size-4" />
                </Link>
                <Link href="/order-status" className="btn btn-secondary btn-lg">
                  Track an order
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
