"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
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
} from "@/store/cart";
import {
  ArrowRightIcon,
  BagIcon,
  CheckCircleIcon,
  ShieldIcon,
  TrashIcon,
  TruckIcon,
} from "@/components/ui/icons";
import { calculatePromo, PROMO_RULES, validatePromoCode } from "@/lib/promos";
import { getShippingDestination } from "@/lib/shipping";

const QUICK_LINKS = [
  { label: "Recipes", href: "/recipes" },
  { label: "Bestsellers", href: "/collections/breakfast-masalas" },
  { label: "Track an order", href: "/order-status" },
];

const GRID = "mt-10 grid items-start gap-8 lg:grid-cols-[1.45fr_0.55fr] lg:gap-10";

export default function CartPage() {
  const lines = useCartStore((s) => s.lines);
  const remove = useCartStore((s) => s.remove);
  const setQty = useCartStore((s) => s.setQty);
  const promoCode = useCartStore((s) => s.promoCode);
  const promoDiscount = useCartStore((s) => s.promoDiscount);
  const promoLabel = useCartStore((s) => s.promoLabel);
  const setPromoCode = useCartStore((s) => s.setPromoCode);
  const deliveryMode = useCartStore((s) => s.deliveryMode);
  const destinationCountry = useCartStore((s) => s.destinationCountry);
  const hydrated = useCartHydrated();

  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);

  const count = selectCount(lines);
  const subtotal = selectSubtotal(lines);
  const discount = calculatePromo(promoCode, lines, subtotal, promoDiscount);
  const shipping = selectShipping(lines, deliveryMode, destinationCountry, discount);
  const savings = selectSavings(lines);
  const total = selectTotal(lines, deliveryMode, destinationCountry, discount);
  const international = deliveryMode === "international";
  const destination = getShippingDestination(destinationCountry);
  const qualifyingSubtotal = Math.max(0, subtotal - discount);
  const toFreeShipping = international
    ? 0
    : Math.max(0, FREE_SHIPPING_THRESHOLD - qualifyingSubtotal);
  const progress = international
    ? 100
    : Math.min(100, (qualifyingSubtotal / FREE_SHIPPING_THRESHOLD) * 100);

  useEffect(() => {
    if (!hydrated || !promoCode || lines.length === 0) return;
    let cancelled = false;

    void validatePromoCode(promoCode, lines)
      .then((result) => {
        if (cancelled) return;
        if (!result.valid) {
          setPromoCode(null);
          setPromoError(result.message ?? "That code no longer qualifies for this bag.");
        } else {
          setPromoCode(result.code, result.discount, result.label);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPromoError(error instanceof Error ? error.message : "We couldn't recheck that code.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, lines, promoCode, setPromoCode]);

  const applyPromo = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = promoInput.trim().toUpperCase();

    if (!code) {
      setPromoError("Enter a promo code, then press Apply.");
      return;
    }

    setCheckingPromo(true);
    setPromoError(null);
    try {
      const result = await validatePromoCode(code, lines);
      if (!result.valid) {
        setPromoCode(null);
        setPromoError(result.message ?? `“${code}” isn't valid for this bag.`);
        return;
      }
      setPromoCode(result.code, result.discount, result.label);
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
    <>
      <section className="shell py-14 md:py-20">
        <Breadcrumbs items={[{ label: "Cart" }]} />

        <div className="mt-6 max-w-2xl">
          <p className="eyebrow">Shopping bag</p>
          <h1 className="section-title mt-2.5">Your bag</h1>
          <p className="lede mt-3">
            {!hydrated
              ? "Loading your bag…"
              : count === 0
                ? "Nothing here yet — the shelves are fully stocked though."
                : `${count} item${count === 1 ? "" : "s"} in your bag`}
          </p>
        </div>

        {/* ---- Hydration skeletons: cart data lives in localStorage ---- */}
        {!hydrated ? (
          <div className={GRID} aria-hidden="true">
            <div className="card divide-y divide-paper-100 overflow-hidden">
              {[0, 1].map((row) => (
                <div key={row} className="flex gap-4 p-5">
                  <div className="skeleton size-20 shrink-0 rounded-xl sm:size-24" />
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="skeleton h-4 w-2/3" />
                    <div className="skeleton h-3 w-1/4" />
                    <div className="skeleton h-9 w-36 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
            <div className="skeleton h-96 w-full rounded-3xl" />
          </div>
        ) : count === 0 ? (
          /* ---- Empty state ---- */
          <div className="mt-10 grid gap-6">
            <EmptyState
              icon={<BagIcon className="size-7" />}
              eyebrow="Your bag"
              title="Your bag is empty"
              description="Freshly ground blends are only a click away — most orders dispatch within 24 hours."
              action={{ label: "Start shopping", href: "/collections/breakfast-masalas" }}
            />
            <ul className="flex flex-wrap justify-center gap-2">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="chip bg-white transition hover:border-paper-300 hover:bg-paper-50"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          /* ---- Line items + sticky summary ---- */
          <div className={GRID}>
            <Reveal>
              <ul className="card divide-y divide-paper-100 overflow-hidden">
                {lines.map((line) => {
                  const pdp = `/collections/${line.category}/products/${line.slug}`;

                  return (
                    <li key={line.key} className="flex gap-4 p-4 sm:gap-5 sm:p-5">
                      <Link href={pdp} className="block shrink-0">
                        <SmartImage
                          src={line.image}
                          alt={line.name}
                          aspect="aspect-square"
                          sizes="96px"
                          wrapperClassName="w-20 rounded-xl border border-paper-200 sm:w-24"
                        />
                      </Link>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              href={pdp}
                              className="text-sm font-semibold text-ink-950 transition hover:text-masala-700 sm:text-base"
                            >
                              {line.name}
                            </Link>
                            <p className="mt-1 text-xs text-ink-500">{line.packSize}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => remove(line.key)}
                            aria-label={`Remove ${line.name} from cart`}
                            className="btn btn-ghost btn-icon btn-sm shrink-0"
                          >
                            <TrashIcon className="size-4" />
                          </button>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <QuantityStepper
                            value={line.qty}
                            max={line.maxQty}
                            onChange={(next) => setQty(line.key, next)}
                            label={`Quantity for ${line.name}`}
                          />
                          <div className="ml-auto text-right">
                            <p className="font-display text-base font-semibold text-ink-950 sm:text-lg">
                              {formatINR(line.price * line.qty)}
                            </p>
                            {line.mrp > line.price ? (
                              <p className="text-xs text-ink-400 line-through">
                                {formatINR(line.mrp * line.qty)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Reveal>

            <aside className="lg:sticky lg:top-28">
              <div className="card overflow-hidden">
                {/* Free-shipping progress — same math/copy as the cart drawer */}
                <div className="border-b border-paper-200 bg-saffron-50 px-5 py-3.5">
                  {international ? (
                    <p className="text-xs font-medium text-ink-700">
                      Flying Abroad to {destination.name} · {formatINR(shipping)} shipping
                    </p>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-ink-700">
                        {toFreeShipping > 0 ? (
                          <>
                            Add{" "}
                            <span className="font-semibold text-masala-700">
                              {formatINR(toFreeShipping)}
                            </span>{" "}
                            for free shipping
                          </>
                        ) : (
                          <span className="font-semibold text-cardamom-700">
                            ✓ You&apos;ve unlocked free shipping
                          </span>
                        )}
                      </p>
                      <div
                        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white"
                        role="progressbar"
                        aria-valuenow={Math.round(progress)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Free shipping progress"
                      >
                        <div
                          className="h-full rounded-full bg-masala-600 transition-[width] duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="p-5">
                  <h2 className="font-display text-lg font-semibold text-ink-950">
                    Order summary
                  </h2>

                  <div className="mt-4 space-y-1.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-600">Subtotal</span>
                      <span className="font-semibold text-ink-950">{formatINR(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink-600">Shipping</span>
                      <span
                        className={cn(
                          "font-semibold",
                          shipping === 0 ? "text-cardamom-600" : "text-ink-950",
                        )}
                      >
                        {shipping === 0 ? "Free" : formatINR(shipping)}
                      </span>
                    </div>

                    {discount > 0 && promoCode ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-ink-600">
                          Discount
                          <span className="chip text-[0.65rem]">{promoCode}</span>
                        </span>
                        <span className="flex items-center gap-2.5">
                          <span className="font-semibold text-cardamom-700">
                            −{formatINR(discount)}
                          </span>
                          <button
                            type="button"
                            onClick={removePromo}
                            aria-label={`Remove promo code ${promoCode}`}
                            className="text-xs font-semibold text-ink-400 underline underline-offset-2 transition hover:text-chili-600"
                          >
                            Remove
                          </button>
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* Promo code */}
                  <form onSubmit={applyPromo} noValidate className="mt-4">
                    <label htmlFor="promo-code" className="field-label">
                      Promo code
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="promo-code"
                        className="input"
                        placeholder="FIRST10"
                        value={promoInput}
                        onChange={(event) => {
                          setPromoInput(event.target.value);
                          if (promoError) setPromoError(null);
                        }}
                        aria-invalid={promoError ? true : undefined}
                        aria-describedby={promoError ? "promo-error" : undefined}
                      />
                      <button
                        type="submit"
                        disabled={checkingPromo}
                        className="btn btn-secondary btn-sm shrink-0"
                      >
                        {checkingPromo ? "Checking…" : "Apply"}
                      </button>
                    </div>

                    <p className="mt-1.5 text-[0.7rem] text-ink-400">
                      Starter codes: FIRST10, FESTIVE20 and BIRYANI3.
                    </p>

                    {promoError ? (
                      <p id="promo-error" role="alert" className="field-error">
                        {promoError}
                      </p>
                    ) : promoCode && discount > 0 ? (
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-cardamom-700">
                        <CheckCircleIcon className="size-3.5" />
                        {promoCode} applied — {promoLabel ?? PROMO_RULES[promoCode]?.blurb ?? "discount applied"}
                      </p>
                    ) : null}
                  </form>

                  {savings > 0 ? (
                    <p className="mt-3 text-xs font-medium text-cardamom-700">
                      You&apos;re saving {formatINR(savings)} on this order
                    </p>
                  ) : null}

                  <div className="mt-3 flex items-center justify-between border-t border-paper-200 pt-3">
                    <span className="text-sm font-semibold text-ink-900">Total</span>
                    <span className="font-display text-xl font-semibold text-ink-950">
                      {formatINR(total)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2">
                    <Link href="/checkout" className="btn btn-primary btn-block">
                      Proceed to checkout
                      <ArrowRightIcon className="size-4" />
                    </Link>
                    <Link
                      href="/collections/breakfast-masalas"
                      className="btn btn-secondary btn-block"
                    >
                      Continue shopping
                    </Link>
                  </div>

                  <p className="mt-3 flex items-center justify-center gap-1.5 text-[0.7rem] text-ink-500">
                    <ShieldIcon className="size-3.5 text-cardamom-600" />
                    No card or UPI collected
                    <span className="text-ink-300">·</span>
                    <TruckIcon className="size-3.5 text-cardamom-600" />
                    Dispatched within 24h
                  </p>
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>
    </>
  );
}
