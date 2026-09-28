import Link from "next/link";
import { ArrowRightIcon, SearchIcon } from "@/components/ui/icons";

export default function NotFound() {
  return (
    <div className="shell flex flex-1 flex-col items-center justify-center py-24 text-center">
      <p
        className="font-display text-[clamp(6rem,20vw,13rem)] leading-none font-semibold text-masala-200 select-none"
        aria-hidden="true"
      >
        404
      </p>

      <p className="eyebrow -mt-4">Empty jar</p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink-950 md:text-4xl">
        This page has been ground to dust
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-ink-600">
        The link may be old, or the blend was retired. Here&apos;s where to go instead.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="btn btn-primary">
          Back to home
          <ArrowRightIcon className="size-4" />
        </Link>
        <Link href="/collections/breakfast-masalas" className="btn btn-secondary">
          <SearchIcon className="size-4" />
          Browse collections
        </Link>
      </div>

      <nav aria-label="Popular destinations" className="mt-10">
        <ul className="flex flex-wrap justify-center gap-2">
          {[
            { label: "Recipes", href: "/recipes" },
            { label: "Track order", href: "/order-status" },
            { label: "FAQ", href: "/pages/faq" },
            { label: "Contact", href: "/pages/contact" },
            { label: "Blog", href: "/blog" },
          ].map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="chip transition hover:border-masala-200 hover:bg-masala-50 hover:text-masala-700">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
