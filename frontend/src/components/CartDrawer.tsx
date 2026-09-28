"use client";

import Link from "next/link";
import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { SmartImage } from "@/components/ui/SmartImage";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { useUIStore } from "@/store/ui";
import {
  selectCount,
  selectSavings,
  selectShipping,
  selectSubtotal,
  selectTotal,
  FREE_SHIPPING_THRESHOLD,
  useCartHydrated,
  useCartStore,
} from "@/store/cart";
import { formatINR } from "@/lib/format";
import { calculatePromo } from "@/lib/promos";
import {
  ArrowRightIcon,
  BagIcon,
  CloseIcon,
  ShieldIcon,
  TrashIcon,
  TruckIcon,
} from "@/components/ui/icons";

export function CartDrawer() {
  const open = useUIStore((s) => s.cartOpen);
  const close = useUIStore((s) => s.closeCart);

  const lines = useCartStore((s) => s.lines);
  const remove = useCartStore((s) => s.remove);
  const setQty = useCartStore((s) => s.setQty);
  const promoCode = useCartStore((s) => s.promoCode);
  const promoDiscount = useCartStore((s) => s.promoDiscount);
  const deliveryMode = useCartStore((s) => s.deliveryMode);
  const destinationCountry = useCartStore((s) => s.destinationCountry);
  const hydrated = useCartHydrated();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  const subtotal = selectSubtotal(lines);
  const discount = calculatePromo(promoCode, lines, subtotal, promoDiscount);
  const shipping = selectShipping(lines, deliveryMode, destinationCountry, discount);
  const savings = selectSavings(lines);
  const count = selectCount(lines);
  const international = deliveryMode === "international";
  const qualifyingSubtotal = Math.max(0, subtotal - discount);
  const toFreeShipping = international
    ? 0
    : Math.max(0, FREE_SHIPPING_THRESHOLD - qualifyingSubtotal);
  const progress = international
    ? 100
    : Math.min(100, (qualifyingSubtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <div className="fixed inset-0 z-[110]">
      <div
        className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm animate-fade-in"
        onClick={close}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Shopping cart, ${count} items`}
        className="absolute inset-y-0 right-0 flex w-[min(26rem,92vw)] flex-col bg-white shadow-2xl animate-slide-in-right"
      >
        <header className="flex items-center justify-between border-b border-paper-200 px-5 py-4">
          <div>
            <p className="eyebrow">Your bag</p>
            <h2 className="font-display text-xl font-semibold text-ink-950">
              {count === 0 ? "Cart" : `${count} item${count === 1 ? "" : "s"}`}
            </h2>
          </div>
          <button type="button" onClick={close} aria-label="Close cart" className="btn btn-ghost btn-icon">
            <CloseIcon className="size-5" />
          </button>
        </header>

        {!hydrated ? (
          <div className="flex-1 space-y-3 p-5" aria-hidden="true">
            {[0, 1].map((row) => (
              <div key={row} className="skeleton h-24 w-full" />
            ))}
          </div>
        ) : lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <span className="mb-5 grid size-20 place-items-center rounded-full bg-paper-100 text-masala-600">
              <BagIcon className="size-9" />
            </span>
            <h3 className="font-display text-xl font-semibold text-ink-950">Your bag is empty</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              Freshly ground blends are only a click away — most orders ship the same day.
            </p>
            <button type="button" onClick={close} className="btn btn-primary mt-6">
              Start shopping
              <ArrowRightIcon className="size-4" />
            </button>
          </div>
        ) : (
          <>
            {/* Free-shipping progress */}
            <div className="border-b border-paper-200 bg-saffron-50 px-5 py-3.5">
              {international ? (
                <p className="text-xs font-medium text-ink-700">
                  Flying Abroad shipping is calculated for your destination at checkout.
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

            <div className="flex-1 overflow-y-auto p-4">
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {lines.map((line) => (
                  <li key={line.key} className="group relative flex flex-col rounded-2xl border border-paper-200 bg-white p-3 transition hover:border-paper-300 hover:shadow-md">
                    <button
                      type="button"
                      onClick={() => remove(line.key)}
                      aria-label={`Remove ${line.name} from cart`}
                      className="absolute top-2 right-2 z-10 grid size-7 place-items-center rounded-full bg-white/90 text-ink-400 opacity-0 shadow-sm transition group-hover:opacity-100 hover:bg-chili-50 hover:text-chili-600"
                    >
                      <TrashIcon className="size-3.5" />
                    </button>

                    <Link
                      href={`/collections/${line.category}/products/${line.slug}`}
                      onClick={close}
                      className="block"
                    >
                      <SmartImage
                        src={line.image}
                        alt={line.name}
                        aspect="aspect-square"
                        sizes="120px"
                        wrapperClassName="w-full rounded-xl border border-paper-100"
                      />
                    </Link>

                    <div className="mt-2.5 flex flex-1 flex-col">
                      <Link
                        href={`/collections/${line.category}/products/${line.slug}`}
                        onClick={close}
                        className="line-clamp-2 text-xs font-semibold text-ink-950 hover:text-masala-700"
                      >
                        {line.name}
                      </Link>
                      <p className="mt-0.5 text-[0.65rem] text-ink-500">{line.packSize}</p>

                      <div className="mt-auto pt-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <QuantityStepper
                            size="sm"
                            value={line.qty}
                            max={line.maxQty}
                            onChange={(next) => setQty(line.key, next)}
                            label={`Quantity for ${line.name}`}
                          />
                        </div>
                        <div className="mt-2 text-center">
                          <p className="text-sm font-bold text-ink-950">
                            {formatINR(line.price * line.qty)}
                          </p>
                          {line.mrp > line.price ? (
                            <p className="text-[0.65rem] text-ink-400 line-through">
                              {formatINR(line.mrp * line.qty)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <footer className="border-t border-paper-200 bg-paper-50 px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-600">Subtotal</span>
                <span className="font-semibold text-ink-950">{formatINR(subtotal)}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-sm">
                <span className="text-ink-600">Shipping</span>
                <span className={cn("font-semibold", shipping === 0 ? "text-cardamom-600" : "text-ink-950")}>
                  {shipping === 0 ? "Free" : formatINR(shipping)}
                </span>
              </div>

              {discount > 0 && promoCode ? (
                <div className="mt-1.5 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-ink-600">
                    Promo <span className="chip text-[0.65rem]">{promoCode}</span>
                  </span>
                  <span className="font-semibold text-cardamom-700">−{formatINR(discount)}</span>
                </div>
              ) : null}

              {savings > 0 ? (
                <p className="mt-2 text-xs font-medium text-cardamom-700">
                  You&apos;re saving {formatINR(savings)} on this order
                </p>
              ) : null}

              <div className="mt-3 flex items-center justify-between border-t border-paper-200 pt-3">
                <span className="text-sm font-semibold text-ink-900">Total</span>
                <span className="font-display text-xl font-semibold text-ink-950">
                  {formatINR(selectTotal(lines, deliveryMode, destinationCountry, discount))}
                </span>
              </div>

              <div className="mt-4 grid gap-2">
                <Link href="/checkout" onClick={close} className="btn btn-primary btn-block">
                  Checkout
                  <ArrowRightIcon className="size-4" />
                </Link>
                <Link href="/cart" onClick={close} className="btn btn-secondary btn-block">
                  View full cart
                </Link>
              </div>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-[0.7rem] text-ink-500">
                <ShieldIcon className="size-3.5 text-cardamom-600" />
                No card or UPI collected
                <span className="text-ink-300">·</span>
                <TruckIcon className="size-3.5 text-cardamom-600" />
                Dispatched within 24h
              </p>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
