"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { Product, ProductVariant } from "@/lib/types";
import { useCartStore } from "@/store/cart";
import { useUIStore } from "@/store/ui";
import { BagIcon, CheckIcon } from "@/components/ui/icons";

type Props = {
  product: Product;
  /** Currently selected pack size — falls back to the first variant. */
  variant?: ProductVariant | null;
  quantity?: number;
  appearance?: "quick" | "full" | "dark";
  className?: string;
};

export function AddToCartButton({
  product,
  variant,
  quantity = 1,
  appearance = "full",
  className,
}: Props) {
  const add = useCartStore((s) => s.add);
  const showToast = useUIStore((s) => s.showToast);
  const [added, setAdded] = useState(false);

  const selected = variant ?? product.variants[0] ?? null;
  const bundleStock = product.is_combo
    ? product.combo_catalog_products.length
      ? Math.min(...product.combo_catalog_products.map((item) => Math.floor(item.stock_qty / item.quantity)))
      : 0
    : null;
  const availableStock = bundleStock ?? selected?.stock_qty ?? 20;
  const inStock = availableStock > 0 && (product.is_combo || selected !== null);
  const maxQty = Math.max(1, Math.min(availableStock, 20));

  const handleAdd = () => {
    if (!inStock) return;

    add(
      {
        id: product.id,
        variantId: selected?.id ?? null,
        name: product.name,
        slug: product.slug,
        category: product.categories[0] ?? "all",
        categories: product.categories,
        image: product.images[0]?.url ?? "",
        packSize: selected?.pack_size ?? "Standard",
        price: selected?.price ?? product.price ?? 0,
        mrp: selected?.mrp ?? product.mrp ?? 0,
        maxQty,
      },
      quantity,
    );

    showToast(`Added ${product.name} to your bag`, "success", "cart");

    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  const base =
    appearance === "quick"
      ? "btn btn-dark btn-sm w-full"
      : appearance === "dark"
        ? "btn btn-dark w-full"
        : "btn btn-primary";

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={!inStock}
      aria-label={
        inStock ? `Add ${product.name} to cart` : `${product.name} is out of stock`
      }
      className={cn(base, added && "!bg-cardamom-600 !shadow-none", className)}
    >
      {added ? (
        <>
          <CheckIcon className="size-4" />
          Added
        </>
      ) : (
        <>
          <BagIcon className="size-4" />
          {appearance === "quick" ? "Add" : inStock ? "Add to cart" : "Out of stock"}
        </>
      )}
    </button>
  );
}
