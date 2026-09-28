import Link from "next/link";
import { ChevronRightIcon, HomeIcon } from "@/components/ui/icons";

export type Crumb = { label: string; href?: string };

/**
 * Semantic breadcrumb trail with BreadcrumbList structured data
 * (Google reads this for the storefront's rich results).
 */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  if (items.length === 0) return null;

  const trails = [
    { name: "Home", item: "/" },
    ...items.map((item) => ({
      name: item.label,
      item: item.href ? new URL(item.href, "https://masalahouse.local").pathname : undefined,
    })),
  ].filter((entry) => entry.item);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trails.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: `https://masalahouse.local${entry.item}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className={className}>
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-500">
          <li className="flex items-center gap-1.5">
            <Link
              href="/"
              aria-label="Home"
              className="grid size-7 place-items-center rounded-full text-ink-500 transition hover:bg-paper-100 hover:text-ink-900"
            >
              <HomeIcon className="size-4" />
            </Link>
            <ChevronRightIcon className="size-3.5 text-ink-300" />
          </li>

          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={item.label} className="flex items-center gap-1.5">
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="rounded-full px-1.5 py-0.5 transition hover:bg-paper-100 hover:text-ink-950"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isLast ? "page" : undefined}
                    className="max-w-[14rem] truncate rounded-full px-1.5 py-0.5 font-medium text-ink-800"
                  >
                    {item.label}
                  </span>
                )}
                {!isLast && <ChevronRightIcon className="size-3.5 text-ink-300" />}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
