import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ContactForm } from "./ContactForm";
import {
  ArrowRightIcon,
  ClockIcon,
  InfoIcon,
  MailIcon,
  MapPinIcon,
  PackageIcon,
  PhoneIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Talk to the Masala House kitchen — questions about orders, blends, wholesale volumes or export. Call +91 98765 43210 or send a message.",
};

const DETAILS = [
  {
    icon: MapPinIcon,
    label: "Kitchen & counter",
    value: "14 Mill Road, Egmore, Chennai 600008",
    href: "https://www.google.com/maps/search/?api=1&query=14+Mill+Road%2C+Egmore%2C+Chennai+600008",
    external: true,
  },
  {
    icon: PhoneIcon,
    label: "Phone",
    value: "+91 98765 43210",
    href: "tel:+919876543210",
    external: false,
  },
  {
    icon: MailIcon,
    label: "Email",
    value: "hello@masalahouse.in",
    href: "mailto:hello@masalahouse.in",
    external: false,
  },
  {
    icon: ClockIcon,
    label: "Hours",
    value: "Monday–Saturday, 9am–6pm IST",
    href: null,
    external: false,
  },
];

const HELP_CARDS = [
  {
    icon: PackageIcon,
    title: "Bulk & wholesale",
    body: "Restaurants, retailers and resellers — request a quote sized to your monthly volume.",
    href: "/pages/bulk-order",
    cta: "Request a quote",
  },
  {
    icon: InfoIcon,
    title: "Read the FAQ",
    body: "Order confirmation, shipping, freshness, allergens and returns — already answered.",
    href: "/pages/faq",
    cta: "Browse answers",
  },
  {
    icon: ArrowRightIcon,
    title: "Export enquiries",
    body: "International volumes, packaging formats and the paperwork that travels with them.",
    href: "/pages/export",
    cta: "Export details",
  },
];

export default function ContactPage() {
  return (
    <>
      {/* ============================ HERO + FORM ============================ */}
      <section className="shell py-14 md:py-20">
        <Breadcrumbs items={[{ label: "Contact" }]} />

        <div className="mt-6 max-w-2xl">
          <p className="eyebrow">Get in touch</p>
          <h1 className="section-title mt-3">Talk to the people who roast it.</h1>
          <p className="lede mt-4">
            Questions about an order, a blend, wholesale volumes or export — send a note and the
            kitchen team replies within one working day.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          {/* --- contact form --- */}
          <Reveal className="h-full">
            <div className="card h-full p-6 md:p-8">
              <h2 className="font-display text-2xl font-semibold text-ink-950">Send a message</h2>
              <p className="mt-2 text-sm text-ink-600">
                All fields are required. If it is urgent, the phone line beside this form is faster.
              </p>
              <div className="mt-6">
                <ContactForm />
              </div>
            </div>
          </Reveal>

          {/* --- contact details --- */}
          <Reveal delay={100} className="h-full">
            <aside className="panel h-full p-6 md:p-8">
              <h2 className="font-display text-2xl font-semibold text-ink-950">
                Reach us directly
              </h2>

              <ul className="mt-5 space-y-4">
                {DETAILS.map((detail) => (
                  <li key={detail.label} className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-white text-masala-700 shadow-xs">
                      <detail.icon className="size-[1.05rem]" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[0.68rem] font-bold tracking-[0.16em] text-ink-400 uppercase">
                        {detail.label}
                      </p>
                      {detail.href ? (
                        <a
                          href={detail.href}
                          {...(detail.external
                            ? { target: "_blank", rel: "noreferrer noopener" }
                            : {})}
                          className="mt-0.5 block text-sm font-semibold break-words text-ink-900 underline-offset-4 transition hover:text-masala-700 hover:underline"
                        >
                          {detail.value}
                        </a>
                      ) : (
                        <p className="mt-0.5 text-sm font-semibold text-ink-900">{detail.value}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="hairline mt-6 pt-5">
                <p className="text-sm font-semibold text-ink-900">Looking for something else?</p>
                <ul className="mt-3 space-y-2.5 text-sm">
                  <li>
                    <Link
                      href="/order-status"
                      className="group inline-flex items-center gap-2 font-semibold text-masala-700 transition hover:text-masala-800"
                    >
                      Track an order instead
                      <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/pages/faq"
                      className="group inline-flex items-center gap-2 font-semibold text-masala-700 transition hover:text-masala-800"
                    >
                      Read the FAQ
                      <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                </ul>
              </div>
            </aside>
          </Reveal>
        </div>
      </section>

      {/* ============================ OTHER HELP ============================ */}
      <section className="bg-paper-100 py-14 md:py-20">
        <div className="shell">
          <Reveal>
            <SectionHeading
              eyebrow="Self-serve"
              title="Other ways we can help"
              description="Plenty is answered without waiting on a reply — start here."
            />
          </Reveal>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {HELP_CARDS.map((card, index) => (
              <Reveal key={card.href} delay={index * 90} className="h-full">
                <Link
                  href={card.href}
                  className="card card-hover group flex h-full flex-col p-6"
                >
                  <span className="grid size-11 place-items-center rounded-2xl bg-masala-50 text-masala-700">
                    <card.icon className="size-5" />
                  </span>
                  <h3 className="mt-5 font-display text-xl font-semibold text-ink-950">
                    {card.title}
                  </h3>
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
