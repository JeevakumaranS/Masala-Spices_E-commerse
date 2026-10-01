"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";
import { calculatePromo, validatePromoCode } from "@/lib/promos";
import {
  getShippingDestination,
  INTERNATIONAL_CUSTOMS_NOTE,
  INTERNATIONAL_PACKAGING_NOTE,
} from "@/lib/shipping";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { SmartImage } from "@/components/ui/SmartImage";
import {
  FREE_SHIPPING_THRESHOLD,
  selectCount,
  selectSavings,
  selectShipping,
  selectSubtotal,
  selectTotal,
  useCartHydrated,
  useCartStore,
  type CartLine,
} from "@/store/cart";
import { BagIcon, ShieldIcon, TruckIcon } from "@/components/ui/icons";
import { CheckoutForm, type CheckoutReceipt } from "./CheckoutForm";

/** Frozen before `clear()` so the summary survives a successful order. */
export type { CheckoutReceipt };

export default function CheckoutPage() {
  const lines = useCartStore((s) => s.lines);
  const promoCode = useCartStore((s) => s.promoCode);
  const promoDiscount = useCartStore((s) => s.promoDiscount);
  const setPromoCode = useCartStore((s) => s.setPromoCode);
  const deliveryMode = useCartStore((s) => s.deliveryMode);
  const destinationCountry = useCartStore((s) => s.destinationCountry);
  const hydrated = useCartHydrated();
  const [receipt, setReceipt] = useState<CheckoutReceipt | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);

  // After success the store is empty — keep showing what was actually ordered.
  const summaryLines = receipt ? receipt.lines : lines;

  const subtotal = receipt?.subtotal ?? selectSubtotal(summaryLines);
  const discount =
    receipt?.discount ?? calculatePromo(promoCode, promoDiscount);
  const summaryMode = receipt?.deliveryMode ?? deliveryMode;
  const summaryCountry = receipt?.countryCode ?? destinationCountry;
  const destination = getShippingDestination(summaryCountry);
  const shipping =
    receipt?.shipping ?? selectShipping(summaryLines, summaryMode, summaryCountry, discount);
  const total = receipt?.total ?? selectTotal(summaryLines, summaryMode, summaryCountry, discount);
  const savings = selectSavings(summaryLines);
  const qualifyingSubtotal = Math.max(0, subtotal - discount);
  const toFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - qualifyingSubtotal);

  const applyPromo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = promoInput.trim().toUpperCase();
    if (!code) {
      setPromoError("Enter a promo code, then press Apply.");
      return;
    }

    setCheckingPromo(true);
    setPromoError(null);
    try {
      const result = await validatePromoCode(code, summaryLines);
      if (!result.valid) {
        setPromoError(result.message ?? `“${code}” isn't valid for this bag.`);
        return;
      }
      setPromoCode(result.code, result.discount, result.label);
      setPromoInput(result.code);
    } catch (error) {
      setPromoError(error instanceof Error ? error.message : "We couldn't validate that code.");
    } finally {
      setCheckingPromo(false);
    }
  };

  const removePromo = () => {
    setPromoCode(null);
    setPromoInput("");
    setPromoError(null);
  };

  return (
    <section className="shell py-14 md:py-20">
      <Breadcrumbs items={[{ label: "Cart", href: "/cart" }, { label: "Checkout" }]} />

      <header className="mt-6 max-w-2xl">
        <p className="eyebrow">Checkout</p>
        <h1 className="section-title mt-3">Place your order</h1>
        <p className="lede mt-3">
          No account or online payment. Choose delivery, add your contact details and the admin
          will confirm the order by phone before dispatch.
        </p>
      </header>

      {/* ---- Hydration skeletons: cart data lives in localStorage ---- */}
      {!hydrated ? (
        <div
          className="mt-10 grid items-start gap-8 lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-10"
          aria-hidden="true"
        >
          <div className="card space-y-3 p-6">
            <div className="skeleton h-5 w-1/2" />
            <div className="skeleton h-4 w-1/3" />
            <div className="skeleton h-4 w-1/3" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-6 w-1/2" />
          </div>
          <div className="card space-y-4 p-6 sm:p-8">
            <div className="skeleton h-6 w-1/3" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-12 w-full" />
          </div>
        </div>
      ) : !receipt && lines.length === 0 ? (
        /* ---- Empty-cart guard: no form without something to buy ---- */
        <div className="mx-auto mt-10 max-w-2xl">
          <EmptyState
            icon={<BagIcon className="size-8" />}
            eyebrow="Nothing to check out"
            title="Your bag is empty"
            description="Add a fresh blend or two and the checkout will be waiting right here."
            action={{ label: "Start shopping", href: "/collections/breakfast-masalas" }}
          />
        </div>
      ) : (
        <Reveal className="mt-10">
          <div className="grid items-start gap-8 lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-10">
            {/* ---- Order summary (left at lg, first on mobile) ---- */}
            <aside className="rounded-3xl bg-ink-950 p-6 text-paper-100 sm:p-7">
              <p className="eyebrow text-saffron-300">Order summary</p>
              <p className="mt-2 font-display text-lg font-semibold text-paper-50">
                {selectCount(summaryLines)} {selectCount(summaryLines) === 1 ? "item" : "items"}
              </p>

              <ul className="mt-5 divide-y divide-white/10">
                {summaryLines.map((line: CartLine) => (
                  <li key={line.key} className="flex items-center gap-3 py-3 first:pt-0">
                    <SmartImage
                      src={line.image}
                      alt={line.name}
                      aspect="aspect-square"
                      sizes="44px"
                      wrapperClassName="size-11 shrink-0 rounded-xl border border-white/10"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-paper-50">{line.name}</p>
                      <p className="mt-0.5 text-xs text-paper-400">
                        {line.packSize} · Qty {line.qty}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-paper-100">
                      {formatINR(line.price * line.qty)}
                    </p>
                  </li>
                ))}
              </ul>

              <p className="mt-4 text-xs text-paper-400">
                {summaryMode === "domestic" ? (
                  toFreeShipping > 0 ? (
                    <>
                      Add{" "}
                      <span className="font-semibold text-saffron-300">
                        {formatINR(toFreeShipping)}
                      </span>{" "}
                      for free shipping
                    </>
                  ) : (
                    <span className="font-semibold text-cardamom-400">
                      ✓ Free shipping unlocked
                    </span>
                  )
                ) : (
                  <>
                    Flying Abroad to {receipt?.countryName ?? destination.name} · Estimated{" "}
                    {destination.deliveryEstimate}
                  </>
                )}
              </p>

              <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-paper-300">Subtotal</span>
                  <span className="font-semibold text-paper-50">{formatINR(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-paper-300">Shipping</span>
                  <span
                    className={cn(
                      "font-semibold",
                      shipping === 0 ? "text-cardamom-400" : "text-paper-50",
                    )}
                  >
                    {shipping === 0 ? "Free" : formatINR(shipping)}
                  </span>
                </div>
                {discount > 0 && (receipt?.promoCode ?? promoCode) ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-paper-300">
                      Promo <span className="chip text-[0.65rem]">{receipt?.promoCode ?? promoCode}</span>
                    </span>
                    <span className="font-semibold text-cardamom-400">−{formatINR(discount)}</span>
                  </div>
                ) : null}
              </div>

              {!receipt ? (
                <form
                  onSubmit={applyPromo}
                  noValidate
                  className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-3.5"
                >
                  <label htmlFor="checkout-promo-code" className="mb-2 block text-xs font-semibold text-paper-200">
                    Promo, coupon or offer code
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="checkout-promo-code"
                      className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white outline-none placeholder:text-paper-400 focus:border-saffron-300 focus:ring-2 focus:ring-saffron-300/20"
                      placeholder="Enter code"
                      value={promoInput}
                      onChange={(event) => {
                        setPromoInput(event.target.value);
                        if (promoError) setPromoError(null);
                      }}
                      aria-invalid={promoError ? true : undefined}
                      aria-describedby={promoError ? "checkout-promo-error" : undefined}
                    />
                    <button
                      type="submit"
                      disabled={checkingPromo}
                      className="shrink-0 rounded-xl bg-saffron-400 px-3.5 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-saffron-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {checkingPromo ? "Checking…" : "Apply"}
                    </button>
                  </div>
                  {promoError ? (
                    <p id="checkout-promo-error" role="alert" className="mt-2 text-xs font-medium text-chili-200">
                      {promoError}
                    </p>
                  ) : promoCode && discount > 0 ? (
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                      <p className="font-semibold text-cardamom-300">
                        {promoCode} applied — {formatINR(discount)} off
                      </p>
                      <button
                        type="button"
                        onClick={removePromo}
                        className="font-semibold text-paper-300 underline underline-offset-2 transition hover:text-white"
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                </form>
              ) : null}

              {savings > 0 ? (
                <p className="mt-3 text-xs font-medium text-cardamom-400">
                  You&apos;re saving {formatINR(savings)} on this order
                </p>
              ) : null}

              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                <span className="text-sm font-semibold text-paper-100">Total</span>
                <span className="font-display text-2xl font-semibold text-paper-50">
                  {formatINR(total)}
                </span>
              </div>

              {summaryMode === "international" ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-relaxed text-paper-300">
                  <p className="font-semibold text-paper-100">Customs-aware packing</p>
                  <p className="mt-1.5">{INTERNATIONAL_PACKAGING_NOTE}</p>
                  <p className="mt-2">{INTERNATIONAL_CUSTOMS_NOTE}</p>
                </div>
              ) : null}

              <p className="mt-4 flex items-center gap-1.5 text-[0.7rem] text-paper-400">
                <ShieldIcon className="size-3.5 text-cardamom-400" />
                No card or UPI collected
                <span className="text-paper-400/60">·</span>
                <TruckIcon className="size-3.5 text-cardamom-400" />
                Admin confirms by phone
              </p>

              <Link
                href="/cart"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-saffron-300 underline-offset-2 transition hover:text-saffron-200 hover:underline"
              >
                Need to change something? Edit your bag
              </Link>
            </aside>

            {/* ---- Checkout form (right at lg) ---- */}
            <CheckoutForm onPlaced={setReceipt} />
          </div>
        </Reveal>
      )}
    </section>
  );
}
