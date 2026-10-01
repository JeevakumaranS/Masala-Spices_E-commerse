import Link from "next/link";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { ArrowRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export function ProductRail({
  products,
  title,
  description,
  navigationHref,
  sectionClassName = "bg-white py-5 md:py-6",
  navigationButtonClassName,
}: {
  products: Product[];
  title: string;
  description?: string;
  navigationHref?: string;
  sectionClassName?: string;
  navigationButtonClassName?: string;
}) {
  return (
    <section className={sectionClassName}>
      <div className="shell">
        <div className="relative">
          <h2 className="section-title section-title--sm text-center">{title}</h2>
          {description ? <p className="mt-2 text-center text-sm text-ink-500">{description}</p> : null}
          {navigationHref ? (
            <Link
              href={navigationHref}
              className={cn(
                "absolute top-1/2 right-0 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-paper-200 bg-white text-masala-700",
                navigationButtonClassName,
              )}
              aria-label={`View all ${title.toLowerCase()}`}
            >
              <ArrowRightIcon className="size-4" />
            </Link>
          ) : null}
        </div>

        <div
          className="no-scrollbar mt-5 flex w-full min-w-0 max-w-full gap-4 overflow-x-auto pb-2"
        >
          {products.map((product, index) => (
            <div
              key={product.id}
              className="h-full w-[65%] shrink-0 min-w-0 sm:w-[27%] lg:w-[21%]"
            >
              <ProductCard
                product={product}
                priority={index < 3}
                density="compact"
                cardStyle="bestseller"
                className="h-full w-full min-w-0"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
