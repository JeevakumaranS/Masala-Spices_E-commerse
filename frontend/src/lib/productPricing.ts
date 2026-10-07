import type { Product, ProductVariant } from "@/lib/types";

export function getStartingVariant(product: Product): ProductVariant | null {
  return product.variants.reduce<ProductVariant | null>(
    (cheapest, variant) => !cheapest || variant.price < cheapest.price ? variant : cheapest,
    null,
  );
}

export function getStartingPrice(product: Product): number {
  return product.is_combo
    ? product.price ?? 0
    : getStartingVariant(product)?.price ?? 0;
}

export function getStartingMrp(product: Product): number {
  return product.is_combo
    ? product.mrp ?? 0
    : getStartingVariant(product)?.mrp ?? 0;
}
