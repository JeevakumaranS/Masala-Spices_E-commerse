"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  DOMESTIC_SHIPPING_FEE,
  FREE_SHIPPING_THRESHOLD,
  getShippingDestination,
  type DeliveryMode,
} from "@/lib/shipping";

export type CartLine = {
  /** Stable identity: product + selected variant. */
  key: string;
  id: string;
  variantId: string | null;
  name: string;
  slug: string;
  category: string;
  categories?: string[];
  dishType?: string | null;
  image: string;
  packSize: string;
  price: number;
  mrp: number;
  qty: number;
  maxQty: number;
};

export type AddToCartInput = Omit<CartLine, "key" | "qty">;

type CartStore = {
  lines: CartLine[];
  promoCode: string | null;
  promoDiscount: number | null;
  promoLabel: string | null;
  deliveryMode: DeliveryMode;
  destinationCountry: string;
  add: (input: AddToCartInput, qty?: number) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  setPromoCode: (
    code: string | null,
    verifiedDiscount?: number | null,
    label?: string | null,
  ) => void;
  setDeliveryMode: (mode: DeliveryMode) => void;
  setDestinationCountry: (countryCode: string) => void;
  clear: () => void;
};

const MAX_PER_LINE = 20;

const lineKey = (id: string, variantId: string | null) => `${id}:${variantId ?? "default"}`;

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      lines: [],
      promoCode: null,
      promoDiscount: null,
      promoLabel: null,
      deliveryMode: "domestic",
      destinationCountry: "IN",

      add: (input, qty = 1) =>
        set((state) => {
          const key = lineKey(input.id, input.variantId);
          const existing = state.lines.find((line) => line.key === key);

          if (existing) {
            return {
              lines: state.lines.map((line) =>
                line.key === key
                  ? {
                      ...line,
                      qty: Math.min(line.qty + qty, Math.min(line.maxQty, MAX_PER_LINE)),
                    }
                  : line,
              ),
              promoDiscount: null,
              promoLabel: null,
            };
          }

          return {
            lines: [
              ...state.lines,
              {
                ...input,
                key,
                qty: Math.max(1, Math.min(qty, input.maxQty || MAX_PER_LINE)),
              },
            ],
            promoDiscount: null,
            promoLabel: null,
          };
        }),

      remove: (key) =>
        set((state) => ({
          lines: state.lines.filter((l) => l.key !== key),
          promoDiscount: null,
          promoLabel: null,
        })),

      setQty: (key, qty) =>
        set((state) => ({
          lines:
            qty <= 0
              ? state.lines.filter((l) => l.key !== key)
              : state.lines.map((l) =>
                  l.key === key
                    ? { ...l, qty: Math.min(qty, Math.min(l.maxQty, MAX_PER_LINE)) }
                    : l,
                ),
          promoDiscount: null,
          promoLabel: null,
        })),

      setPromoCode: (code, verifiedDiscount = null, label = null) =>
        set({
          promoCode: code ? code.trim().toUpperCase() : null,
          promoDiscount: code && verifiedDiscount !== null ? Math.max(0, verifiedDiscount) : null,
          promoLabel: code ? label : null,
        }),

      setDeliveryMode: (mode) =>
        set((state) => ({
          deliveryMode: mode,
          destinationCountry:
            mode === "domestic" ? "IN" : state.destinationCountry === "IN" ? "AE" : state.destinationCountry,
        })),

      setDestinationCountry: (countryCode) => set({ destinationCountry: countryCode }),

      clear: () =>
        set({
          lines: [],
          promoCode: null,
          promoDiscount: null,
          promoLabel: null,
          deliveryMode: "domestic",
          destinationCountry: "IN",
        }),
    }),
    {
      name: "masala-house-cart-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        lines: state.lines,
        promoCode: state.promoCode,
        promoDiscount: state.promoDiscount,
        promoLabel: state.promoLabel,
        deliveryMode: state.deliveryMode,
        destinationCountry: state.destinationCountry,
      }),
      version: 5,
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as Partial<CartStore>;
        return {
          lines: [],
          promoCode: typeof state.promoCode === "string" ? state.promoCode : null,
          promoDiscount: null,
          promoLabel: typeof state.promoLabel === "string" ? state.promoLabel : null,
          deliveryMode: state.deliveryMode === "international" ? "international" : "domestic",
          destinationCountry:
            typeof state.destinationCountry === "string" ? state.destinationCountry : "IN",
        };
      },
    },
  ),
);

/* ------------------------------------------------------------------ */
/* Selectors — pure helpers so server/client rendering stays predictable */
/* ------------------------------------------------------------------ */

export const selectCount = (lines: CartLine[]): number =>
  lines.reduce((total, line) => total + line.qty, 0);

export const selectSubtotal = (lines: CartLine[]): number =>
  lines.reduce((total, line) => total + line.price * line.qty, 0);

export const selectSavings = (lines: CartLine[]): number =>
  lines.reduce((total, line) => total + Math.max(0, line.mrp - line.price) * line.qty, 0);

export { FREE_SHIPPING_THRESHOLD } from "@/lib/shipping";

export const selectShipping = (
  lines: CartLine[],
  deliveryMode: DeliveryMode = "domestic",
  countryCode = "IN",
  discount = 0,
): number => {
  if (lines.length === 0) return 0;

  const qualifyingSubtotal = Math.max(0, selectSubtotal(lines) - Math.max(0, discount));
  if (qualifyingSubtotal <= 0) return 0;
  if (deliveryMode === "domestic") {
    return qualifyingSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DOMESTIC_SHIPPING_FEE;
  }

  return getShippingDestination(countryCode).shippingAmount;
};

export const selectTotal = (
  lines: CartLine[],
  deliveryMode: DeliveryMode = "domestic",
  countryCode = "IN",
  discount = 0,
): number =>
  selectSubtotal(lines) + selectShipping(lines, deliveryMode, countryCode, discount) - discount;

/** Cart contents only exist after `localStorage` rehydration — use this in any
 *  component that renders persisted values to avoid a hydration mismatch. */
export function useCartHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
