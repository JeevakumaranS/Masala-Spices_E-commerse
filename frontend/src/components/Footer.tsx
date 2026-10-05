import Link from "next/link";
import { Logo } from "@/components/Logo";
import { NewsletterForm } from "@/components/NewsletterForm";
import {
  FacebookIcon,
  InstagramIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  XIcon,
  YoutubeIcon,
} from "@/components/ui/icons";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { label: "Breakfast Masalas", href: "/collections/breakfast-masalas" },
      { label: "Everyday Blends", href: "/collections/spice-blends" },
      { label: "Whole Spices", href: "/pages/carry-home" },
      { label: "Bulk Orders", href: "/pages/bulk-order" },
      { label: "Export Enquiries", href: "/pages/export" },
    ],
  },
  {
    title: "Learn",
    links: [
      { label: "All Recipes", href: "/recipes" },
      { label: "Kitchen Journal", href: "/blog" },
      { label: "Carry Home", href: "/pages/carry-home" },
      { label: "FAQ", href: "/pages/faq" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", href: "/pages/about" },
      { label: "Contact", href: "/pages/contact" },
      { label: "Track order", href: "/order-status" },
    ],
  },
];

const SOCIALS = [
  { label: "Instagram", href: "https://instagram.com", Icon: InstagramIcon },
  { label: "Facebook", href: "https://facebook.com", Icon: FacebookIcon },
  { label: "X", href: "https://x.com", Icon: XIcon },
  { label: "YouTube", href: "https://youtube.com", Icon: YoutubeIcon },
];

export function Footer() {
  return (
    <footer className="mt-20 bg-gradient-to-r from-[#6F2414] via-[#8B2A15] to-[#A65331] text-[#F0DCC8]">
      {/* ---------- Newsletter band ---------- */}
      <div className="border-b border-[#C4795A] bg-transparent">
        <div className="shell grid gap-8 py-12 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-14">
          <div>
            <p className="eyebrow text-[#F0956B]">Fresh dispatch</p>
            <h2 className="mt-2.5 font-display text-3xl leading-tight font-semibold text-[#2D1810] md:text-4xl">
              <span className="bg-saffron-200">One recipe, one blend, every Tuesday.</span>
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[#F0DCC8]">
              No spam — just what we ground this week and how to cook with it.
            </p>
          </div>
          <NewsletterForm tone="footer" />
        </div>
      </div>

      {/* ---------- Links ---------- */}
      <div className="shell grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:py-14">
        <div>
          <Logo tone="footer" />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-[#F0DCC8]">
            We source whole spices from single-origin farms, roast them in 4&nbsp;kg batches, and
            stone-grind without bulking agents. What reaches your kitchen is fragrant, honest and
            never more than two weeks old.
          </p>

          <ul className="mt-6 space-y-2.5 text-sm text-[#F0DCC8]">
            <li className="flex items-start gap-2.5">
              <MapPinIcon className="mt-0.5 size-4 shrink-0 text-[#E8865A]" />
              <a
                href="https://www.google.com/maps/search/?api=1&query=14+Mill+Road%2C+Egmore%2C+Chennai+600008"
                target="_blank"
                rel="noreferrer noopener"
                className="transition hover:text-[#FFA469]"
              >
                14 Mill Road, Egmore, Chennai 600008
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <PhoneIcon className="mt-0.5 size-4 shrink-0 text-[#E8865A]" />
              <a href="tel:+919876543210" className="transition hover:text-[#FFA469]">
                +91 98765 43210
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <MailIcon className="mt-0.5 size-4 shrink-0 text-[#E8865A]" />
              <div className="flex flex-col items-start gap-1">
                <a
                  href="mailto:hello@masalahouse.in"
                  className="transition hover:text-[#FFA469]"
                >
                  hello@masalahouse.in
                </a>
              </div>
            </li>
          </ul>

          <ul className="mt-6 flex gap-2.5">
            {SOCIALS.map(({ label, href, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={label}
                  className="grid size-10 place-items-center rounded-full border border-[#C4795A] text-[#F5E6D8] transition hover:border-[#FFA469] hover:bg-white/10 hover:text-[#FFA469]"
                >
                  <Icon className="size-[1.15rem]" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h3 className="text-[0.7rem] font-bold tracking-[0.2em] text-[#F0956B] uppercase">
              {column.title}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-[#F5E6D8] transition hover:translate-x-0.5 hover:text-[#FFA469]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

    </footer>
  );
}
