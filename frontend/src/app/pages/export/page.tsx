import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  ArrowRightIcon,
  MailIcon,
  PackageIcon,
  ShieldIcon,
  SparkleIcon,
  TruckIcon,
  UtensilsIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Export & international orders",
  description:
    "Export enquiries for Masala House blends — hospitality, retail and B2B supply with samples, specs, shipment documents and small-batch packing.",
};

const CAPABILITIES = [
  {
    icon: UtensilsIcon,
    title: "Hospitality, retail & B2B",
    body: "Restaurant groups, hotel kitchens, importers and retail shelves all draw from the same small-batch process — we scale the volume, never the shortcut.",
  },
  {
    icon: PackageIcon,
    title: "Formats that fit your channel",
    body: "Retail-ready pouches, food-service packs and larger bulk formats, arranged per enquiry. Tell us the size your shelf needs and we will quote it.",
  },
  {
    icon: ShieldIcon,
    title: "Documents that travel with the order",
    body: "Invoices, packing lists and product specifications prepared for every shipment, plus whatever destination paperwork your importer asks us for.",
  },
  {
    icon: TruckIcon,
    title: "Packed for the journey",
    body: "Nitrogen-flushed, dated and sealed before dispatch, then handed to your forwarder or ours — whichever your team prefers to control.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Send your enquiry",
    body: "Volumes, target blends, pack sizes, destination port and timeline — through the bulk order form or a note to the kitchen.",
    Icon: MailIcon,
  },
  {
    step: "02",
    title: "Samples & specs",
    body: "We send samples of the blends you are considering along with ingredient lists and spec sheets, so your team can taste and check before committing.",
    Icon: SparkleIcon,
  },
  {
    step: "03",
    title: "Compliance & documents",
    body: "Once you approve, we line up the invoices, packing lists and any destination-specific documentation your importer or forwarder requires.",
    Icon: ShieldIcon,
  },
  {
    step: "04",
    title: "Packed & dispatched",
    body: "Ground fresh for your order, packed in your agreed format, sealed and released to freight — with tracking details sent back to you.",
    Icon: TruckIcon,
  },
];

export default function ExportPage() {
  return (
    <>
      {/* ============================ HERO ============================ */}
      <section className="shell py-14 md:py-20">
        <div className="max-w-3xl">
          <p className="eyebrow">Export & international</p>
          <h1 className="display mt-5">Premium regional masalas, packed for the world.</h1>
          <p className="lede mt-6 max-w-2xl">
            We support hospitality, retail and B2B export enquiries for our small-batch blends —
            same roasting and stone-grinding routine, scaled to your order and documented for the
            journey.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/pages/bulk-order" className="btn btn-primary btn-lg">
              Start an enquiry
              <ArrowRightIcon className="size-4" />
            </Link>
            <Link href="/pages/contact" className="btn btn-secondary btn-lg">
              Talk to us
            </Link>
          </div>
        </div>
      </section>

      {/* ============================ CAPABILITIES ============================ */}
      <section className="bg-paper-100 py-14 md:py-20">
        <div className="shell">
          <Reveal>
            <SectionHeading
              eyebrow="What we bring"
              title="Built for buyers who need more than a good taste."
              description="The practical side of shipping masala across borders — formats, paperwork and packing handled by the same team that grinds it."
            />
          </Reveal>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {CAPABILITIES.map((capability, index) => (
              <Reveal key={capability.title} delay={(index % 2) * 90} className="h-full">
                <article className="card card-hover flex h-full flex-col p-6">
                  <span className="grid size-11 place-items-center rounded-2xl bg-masala-50 text-masala-700">
                    <capability.icon className="size-5" />
                  </span>
                  <h3 className="mt-5 font-display text-xl font-semibold text-ink-950">
                    {capability.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{capability.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ HOW IT WORKS ============================ */}
      <section className="shell py-14 md:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          <Reveal>
            <div className="lg:sticky lg:top-32">
              <p className="eyebrow">How it works</p>
              <h2 className="section-title mt-3">Four steps from enquiry to freight.</h2>
              <p className="lede mt-4">
                No anonymous quoting engines. Every export order runs through the kitchen team, so
                the person pricing your pallet is the person who knows the roast.
              </p>

              <div className="mt-7 rounded-3xl border border-paper-200 bg-paper-100 p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-white text-masala-700 shadow-sm">
                    <PackageIcon className="size-5" />
                  </span>
                  <p className="text-sm leading-relaxed text-ink-600">
                    <span className="font-semibold text-ink-900">Domestic volumes too?</span> The
                    same steps apply for restaurant and retail supply inside India — start on the
                    bulk order page.
                  </p>
                </div>
              </div>

              <Link href="/pages/bulk-order" className="btn btn-secondary mt-6">
                Open the enquiry form
                <ArrowRightIcon className="size-4" />
              </Link>
            </div>
          </Reveal>

          <ol className="grid gap-4 sm:grid-cols-2">
            {STEPS.map((item, index) => (
              <Reveal key={item.step} delay={index * 90} className="h-full">
                <li className="card card-hover flex h-full flex-col p-6">
                  <div className="flex items-start justify-between">
                    <span className="grid size-11 place-items-center rounded-2xl bg-masala-50 text-masala-700">
                      <item.Icon className="size-5" />
                    </span>
                    <span className="font-display text-2xl font-semibold text-paper-300">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold text-ink-950">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{item.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ============================ ENQUIRY CTA ============================ */}
      <section className="relative overflow-hidden bg-[linear-gradient(120deg,var(--color-masala-50),var(--color-saffron-50))]">
        <div className="grain">
          <div className="shell py-14 md:py-20">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="eyebrow">Enquiries</p>
                <h2 className="section-title mt-3 max-w-xl">
                  Tell us where it is going and how much you need.
                </h2>
                <p className="lede mt-4 max-w-lg">
                  Share destination, volume and the blends you want to carry — we reply with
                  samples, specs and a quote. Not sure where to begin? Just ask.
                </p>
              </div>

              <div className="flex flex-col gap-3 lg:items-end">
                <div className="flex flex-wrap gap-3">
                  <Link href="/pages/bulk-order" className="btn btn-dark btn-lg">
                    Request a quote
                    <ArrowRightIcon className="size-4" />
                  </Link>
                  <Link href="/pages/contact" className="btn btn-secondary btn-lg">
                    Contact the kitchen
                  </Link>
                </div>

                <ul className="flex flex-wrap gap-2 lg:justify-end">
                  {[
                    { label: "FAQ", href: "/pages/faq" },
                    { label: "Carry home", href: "/pages/carry-home" },
                    { label: "Recipes", href: "/recipes" },
                  ].map((link) => (
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
        </div>
      </section>
    </>
  );
}
