import Link from "next/link";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { ArrowRightIcon } from "@/components/ui/icons";

export function ProductRail({
  products,
  title,
  description,
  navigationHref,
  sectionClassName = "bg-white pt-8 pb-2 md:pt-10 md:pb-3",
}: {
  products: Product[];
  title: string;
  description?: string;
  navigationHref?: string;
  sectionClassName?: string;
}) {
  return (
    <section className={sectionClassName}>
      <div className="shell">
        <div className="flex flex-col items-center gap-2 sm:relative sm:block">
          <div className="text-center sm:mx-auto sm:max-w-[calc(100%-11rem)]">
            <h2 className="section-title text-center text-3xl text-masala-900 md:text-4xl">{title}</h2>
            {description ? <p className="mt-1.5 text-center text-xs text-ink-500 sm:text-sm">{description}</p> : null}
          </div>
          {navigationHref ? (
            <Link
              href={navigationHref}
              className="group inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-masala-700 transition hover:text-masala-900 sm:absolute sm:top-1/2 sm:right-0 sm:-translate-y-1/2"
            >
              View all {title.toLowerCase()}
              <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          ) : null}
        </div>

        <div
          className="no-scrollbar mt-6 flex w-full min-w-0 max-w-full gap-4 overflow-x-auto px-1 pb-2"
        >
          {products.map((product, index) => (
            <div
              key={product.id}
              className="h-full w-[78%] shrink-0 min-w-0 sm:w-[34%] lg:w-[25%]"
            >
              <ProductCard
                product={product}
                priority={index < 3}
                density="comfortable"
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
