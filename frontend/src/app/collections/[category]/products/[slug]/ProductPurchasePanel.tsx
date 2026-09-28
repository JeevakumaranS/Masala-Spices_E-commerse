"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import { formatINR, percentOff } from "@/lib/format";
import { cn } from "@/lib/cn";
import { AddToCartButton } from "@/components/AddToCartButton";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { useCartStore } from "@/store/cart";
import { useUIStore } from "@/store/ui";
import { CheckCircleIcon, FlameIcon } from "@/components/ui/icons";
import { ProductWishlistButton } from "./ProductWishlistButton";

type Props = {
  product: Product;
};

/**
 * PDP purchase panel: pricing, functional pack-size selector, quantity and
 * cart actions. Also renders the mobile sticky buy bar (hidden at md+).
 */
export function ProductPurchasePanel({ product }: Props) {
  const router = useRouter();
  const add = useCartStore((s) => s.add);
  const showToast = useUIStore((s) => s.showToast);

  const [variantId, setVariantId] = useState<string | null>(product.variants[0]?.id ?? null);
  const [quantity, setQuantity] = useState(1);

  const selected =
    product.variants.find((variant) => variant.id === variantId) ?? product.variants[0] ?? null;

  const price = selected?.price ?? product.price;
  const mrp = selected?.mrp ?? product.mrp;
  const off = percentOff(price, mrp);
  const stock = selected?.stock_qty ?? 0;
  const inStock = selected ? selected.stock_qty > 0 : true;
  const maxQty = Math.max(1, Math.min(stock || 20, 20));
  const perMeal = product.meal_cost ?? (product.categories.some((category) => category.includes("kit") || category.includes("combo")) ? Math.ceil(price / 4) : null);

  const selectVariant = (id: string) => {
    setVariantId(id);
    setQuantity(1);
  };

  const handleBuyNow = () => {
    if (!inStock) return;

    add(
      {
        id: product.id,
        variantId: selected?.id ?? null,
        name: product.name,
        slug: product.slug,
        category: product.categories[0] ?? "all",
        categories: product.categories,
        dishType: product.dish_type,
        image: product.images[0]?.url ?? "",
        packSize: selected?.pack_size ?? "Standard",
        price,
        mrp,
        maxQty,
      },
      quantity,
    );
    showToast(`Added ${product.name} to your bag`, "success", "cart");
    router.push("/checkout");
  };

  return (
    <div className="flex flex-col self-start lg:sticky lg:top-32">
      {/* ---- Title + price ---- */}
      <p className="eyebrow">{product.spice_level} heat · roasted weekly</p>
      <h1
        className="display mt-3"
        style={{ fontSize: "clamp(2.1rem, 1.5rem + 2.6vw, 3.4rem)" }}
      >
        {product.name}
      </h1>

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-display text-3xl font-semibold text-ink-950">
          {formatINR(price)}
        </span>
        {mrp > price ? (
          <span className="text-lg text-ink-400 line-through">{formatINR(mrp)}</span>
        ) : null}
        {off > 0 ? <span className="badge-sale">{off}% off</span> : null}
        <span
          className={cn(
            "chip",
            inStock
              ? "!border-cardamom-200 !bg-cardamom-50 !text-cardamom-700"
              : "!border-chili-100 !bg-chili-50 !text-chili-600",
          )}
        >
          <CheckCircleIcon className="size-3.5" />
          {inStock ? "In stock" : "Sold out"}
        </span>
        <span className="chip">
          <FlameIcon className="size-3.5" />
          {product.spice_level}
        </span>
      </div>

      <p className="mt-5 text-base leading-relaxed text-ink-600">{product.description}</p>

      {/* ---- Pack-size selector ---- */}
      <div className="mt-7">
        {product.variants.length > 0 ? (
          <>
            <p className="field-label" id="pack-size-label">
              {product.variant_type ?? "Pack size"}
            </p>
            <div
              role="group"
              aria-labelledby="pack-size-label"
              className="mt-2 flex flex-wrap gap-2.5"
            >
              {product.variants.map((variant) => {
                const isActive = variant.id === selected?.id;
                const variantStock = variant.stock_qty;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    aria-pressed={isActive}
                    disabled={variantStock <= 0}
                    onClick={() => selectVariant(variant.id)}
                    className={cn(
                      "rounded-2xl border px-4 py-2.5 text-left transition",
                      isActive
                        ? "border-masala-700 bg-masala-700 text-white shadow-md"
                        : "border-paper-300 bg-white hover:border-masala-300 hover:shadow-xs",
                      variantStock <= 0 && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <span className="block text-sm font-semibold">{variant.pack_size}</span>
                    <span
                      className={cn(
                        "mt-0.5 block text-xs",
                        isActive ? "text-masala-100" : "text-ink-500",
                      )}
                    >
                      {formatINR(variant.price)} ·{" "}
                      {variantStock > 0
                        ? `${variantStock} in stock`
                        : "Out of stock"}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <p className="field-hint">
            This blend ships in a single standard jar — stock is confirmed at checkout.
          </p>
        )}
      </div>

      {/* ---- Quantity + cart actions ---- */}
      <div className="mt-7 flex flex-wrap items-center gap-4">
        <QuantityStepper
          value={quantity}
          onChange={(next) => setQuantity(Math.min(next, maxQty))}
          max={maxQty}
          label={`Quantity for ${product.name}`}
        />
        {inStock && stock > 0 && stock <= 8 ? (
          <span className="chip !border-saffron-200 !bg-saffron-100 !text-ink-800">
            Only {stock} left
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <AddToCartButton
          product={product}
          variant={selected}
          quantity={quantity}
          appearance="full"
          className="btn-lg btn-block sm:flex-1"
        />
        <ProductWishlistButton product={product} />
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={!inStock}
          className="btn btn-dark btn-lg"
        >
          Buy now
        </button>
      </div>

      <p className="field-hint mt-3">
        Free shipping over ₹349 · dispatched within 24 hours.
      </p>
      {perMeal ? <p className="mt-2 text-sm font-medium text-masala-700">About ₹{perMeal} per meal</p> : null}

      {/* ---- Stock / SKU panel ---- */}
      {selected ? (
        <div className="panel mt-6 p-4 sm:p-5">
          <p className="eyebrow">Stock &amp; SKU</p>
          <dl className="mt-3 space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-500">SKU</dt>
              <dd className="font-medium text-ink-900">{selected.sku}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-500">Pack</dt>
              <dd className="font-medium text-ink-900">{selected.pack_size}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-500">Availability</dt>
              <dd className="flex items-center gap-2 font-medium text-ink-900">
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2 rounded-full",
                    inStock ? "bg-cardamom-500" : "bg-chili-500",
                  )}
                />
                {inStock ? `${stock} jars ready to ship` : "Out of stock"}
              </dd>
            </div>
            {selected.expiry_date ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-500">Best before</dt>
                <dd className="font-medium text-ink-900">{selected.expiry_date}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : (
        <p className="field-hint mt-6">
          Live stock details are unavailable for this blend right now — reach out and we&apos;ll
          confirm the batch.
        </p>
      )}

      {/* ---- Mobile sticky buy bar (full-bleed below md) ---- */}
      <div className="sticky bottom-0 z-40 -mx-5 mt-8 border-t border-paper-200 bg-white/95 px-5 py-3 shadow-[0_-10px_30px_-20px_rgb(23_16_9/0.5)] backdrop-blur-md md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.68rem] font-bold tracking-[0.14em] text-ink-400 uppercase">
              {selected?.pack_size ?? "Standard jar"}
            </p>
            <p className="font-display text-lg font-semibold text-ink-950">
              {formatINR(price)}
            </p>
          </div>
          <AddToCartButton
            product={product}
            variant={selected}
            quantity={quantity}
            appearance="full"
            className="shrink-0"
          />
        </div>
      </div>
    </div>
  );
}
