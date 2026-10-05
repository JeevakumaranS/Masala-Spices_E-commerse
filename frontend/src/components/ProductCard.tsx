import Link from "next/link";
import type { Product } from "@/lib/types";
import { SmartImage } from "@/components/ui/SmartImage";
import { AddToCartButton } from "@/components/AddToCartButton";
import { formatINR, percentOff } from "@/lib/format";
import { cn } from "@/lib/cn";
import { FlameIcon, TagIcon } from "@/components/ui/icons";

type Props = {
  product: Product;
  /** Raise LCP for cards sitting above the fold (hero rows / PDP rails). */
  priority?: boolean;
  /** `compact` drops the description for denser grids. */
  density?: "comfortable" | "compact";
  /** Reduced decoration and motion for the homepage bestseller rail. */
  cardStyle?: "default" | "bestseller" | "deal";
  imageOverride?: string;
  className?: string;
};

export function ProductCard({
  product,
  priority = false,
  density = "comfortable",
  cardStyle = "default",
  imageOverride,
  className,
}: Props) {
  const href = `/collections/${product.categories[0] ?? "all"}/products/${product.slug}`;
  const image = imageOverride || product.images[0]?.url;
  const off = percentOff(product.price, product.mrp);
  const variant = product.variants[0] ?? null;
  const stock = variant?.stock_qty ?? 0;
  const bestsellerStyle = cardStyle === "bestseller";
  const dealStyle = cardStyle === "deal";

  return (
    <article
      className={cn(
        "group relative flex overflow-hidden rounded-2xl bg-white",
        dealStyle
          ? "flex-col border border-paper-200"
          : "flex-col",
        bestsellerStyle
          ? "transition-shadow duration-200 hover:shadow-sm"
          : !dealStyle && "border border-paper-200 transition-all duration-300 hover:-translate-y-1 hover:border-paper-300 hover:shadow-lg",
        className,
      )}
    >
      <Link href={href} className="relative block focus-visible:outline-offset-4">
        <SmartImage
          src={image}
          alt={product.name}
          aspect={dealStyle ? "aspect-[2.4/1]" : density === "compact" ? "aspect-square" : "aspect-[4/5]"}
          priority={priority}
          zoom={!bestsellerStyle}
          className={bestsellerStyle ? "group-hover:scale-[1.02] !duration-200" : undefined}
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 20vw"
          wrapperClassName="transition-colors"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
          {off > 0 ? <span className="badge-sale">{off}% off</span> : null}
          {stock > 0 && stock <= 8 ? (
            <span className="badge-accent">Only {stock} left</span>
          ) : null}
        </div>

        {image && !bestsellerStyle ? (
          <span className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-950/55 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />
        ) : null}
      </Link>

      <div className={cn("flex min-w-0 flex-1 flex-col", density === "compact" ? "p-3" : "p-4 sm:p-5", dealStyle && "min-h-0 p-2")}>
        {!dealStyle ? <div className="flex min-w-0 items-center gap-1.5">
          <span
            className={cn(
              "chip !border-masala-100 !bg-masala-50 !text-masala-700",
              density === "compact" && "!px-2 !py-0.5 !text-[0.6rem]",
            )}
          >
            <FlameIcon className={density === "compact" ? "size-3" : "size-3.5"} />
            {product.spice_level}
          </span>
          {product.categories[0] ? (
            <span
              className={cn(
                "min-w-0 truncate text-[0.62rem] font-semibold tracking-[0.12em] text-ink-400 uppercase",
                density === "compact" && "hidden sm:block",
              )}
            >
              {product.categories[0].replace(/-/g, " ")}
            </span>
          ) : null}
        </div> : null}

        <h3
          className={cn(
            "font-display leading-snug font-semibold text-ink-950",
            dealStyle ? "mt-0 line-clamp-1" : "mt-3 line-clamp-2",
            !bestsellerStyle && "transition-colors group-hover:text-masala-800",
            dealStyle ? "text-[0.95rem]" : density === "compact" ? "text-[0.95rem]" : "text-lg",
          )}
        >
          <Link href={href}>{product.name}</Link>
        </h3>

        {density === "comfortable" ? (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-500">
            {product.description}
          </p>
        ) : null}

        <div className={cn(dealStyle ? "mt-8" : "mt-auto", dealStyle ? "" : density === "compact" ? "pt-3" : "pt-4")}>
          <div className="flex items-end justify-between gap-2">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span
                className={cn(
                  "font-display font-semibold text-ink-950",
                  dealStyle ? "text-sm" : density === "compact" ? "text-base" : "text-xl",
                )}
              >
                {formatINR(product.price)}
              </span>
              {product.mrp > product.price ? (
                <span className="text-sm text-ink-400 line-through">
                  {formatINR(product.mrp)}
                </span>
              ) : null}
            </div>

            {variant ? (
              <span className="flex max-w-[45%] items-center gap-1 truncate text-[0.65rem] font-medium text-ink-400">
                <TagIcon className="size-3.5" />
                {variant.pack_size}
              </span>
            ) : null}
          </div>

          {/* Quick add — always visible on mobile, revealed on hover at md+ */}
          <div className={cn(
            dealStyle ? "mt-1" : "mt-3 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100",
            bestsellerStyle
              ? "md:transition-opacity md:duration-200"
              : "md:translate-y-1.5 md:transition-all md:duration-300 md:group-hover:translate-y-0 md:focus-within:translate-y-0",
          )}>
            <AddToCartButton
              product={product}
              variant={variant}
              appearance="quick"
              className={dealStyle ? "!h-7 !min-h-7 !py-0 text-xs" : "pointer-events-auto"}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
