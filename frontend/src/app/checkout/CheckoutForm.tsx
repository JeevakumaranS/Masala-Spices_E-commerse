"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatINR } from "@/lib/format";
import {
  getShippingDestination,
  INTERNATIONAL_DESTINATIONS,
  INTERNATIONAL_PACKAGING_NOTE,
  INTERNATIONAL_PAYMENT_NOTE,
  OFFLINE_PAYMENT_NOTE,
  type DeliveryMode,
} from "@/lib/shipping";
import { calculatePromo, validatePromoCode } from "@/lib/promos";
import { apiClient, getApiErrorMessage } from "@/lib/http";
import {
  FREE_SHIPPING_THRESHOLD,
  selectShipping,
  selectSubtotal,
  selectTotal,
  useCartStore,
  type CartLine,
} from "@/store/cart";
import { useUIStore } from "@/store/ui";
import { SmartImage } from "@/components/ui/SmartImage";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  InfoIcon,
  MapPinIcon,
  PackageIcon,
  RefreshIcon,
  TruckIcon,
  UserIcon,
} from "@/components/ui/icons";

/** "+91 98765 43210" / "09876543210" / "9876543210" → bare 10-digit mobile. */
function normalizeIndianPhone(raw: string): string {
  let value = raw.replace(/[\s\-().]/g, "");
  if (value.startsWith("+91")) value = value.slice(3);
  else if (value.startsWith("0091")) value = value.slice(4);
  if (value.length > 10 && value.startsWith("91")) value = value.slice(2);
  if (value.length === 11 && value.startsWith("0")) value = value.slice(1);
  return value;
}

const isIndianMobile = (value: string): boolean => /^[6-9]\d{9}$/.test(normalizeIndianPhone(value));
const isInternationalPhone = (value: string): boolean => {
  const digits = value.replace(/\D/g, "");
  return 8 <= digits.length && digits.length <= 15;
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const checkoutSchema = z
  .object({
    customer_name: z
      .string()
      .trim()
      .min(2, "Please enter your name (at least 2 characters)."),
    phone: z.string().trim().min(1, "Phone number is required."),
    email: z
      .string()
      .trim()
      .min(1, "Email is required for your order confirmation.")
      .refine(
        (value) => EMAIL_RE.test(value),
        "Enter a valid email address.",
      ),
    address_line: z
      .string()
      .trim()
      .min(6, "Please enter your full street address."),
    city: z.string().trim().min(2, "Please enter your city."),
    state: z.string().trim(),
    postal_code: z.string().trim().min(3, "Please enter your postal or ZIP code."),
    country_code: z.string().length(2, "Choose a destination country."),
    delivery_mode: z.enum(["domestic", "international"]),
  })
  .superRefine((values, context) => {
    if (values.delivery_mode === "domestic") {
      if (!isIndianMobile(values.phone)) {
        context.addIssue({
          code: "custom",
          path: ["phone"],
          message: "Enter a valid 10-digit Indian mobile number, e.g. 98765 43210.",
        });
      }
      if (!/^\d{6}$/.test(values.postal_code)) {
        context.addIssue({
          code: "custom",
          path: ["postal_code"],
          message: "Indian pincode must be exactly 6 digits.",
        });
      }
    } else {
      if (!isInternationalPhone(values.phone)) {
        context.addIssue({
          code: "custom",
          path: ["phone"],
          message: "Enter an international phone number with its country code.",
        });
      }
      if (values.country_code === "IN") {
        context.addIssue({
          code: "custom",
          path: ["country_code"],
          message: "Choose a destination outside India for Flying Abroad.",
        });
      } else {
        const destination = getShippingDestination(values.country_code);
        const digits = values.phone.replace(/\D/g, "");
        if (!digits.startsWith(destination.callingCode.replace("+", ""))) {
          context.addIssue({
            code: "custom",
            path: ["phone"],
            message: `Enter a phone number beginning with ${destination.callingCode}.`,
          });
        }
      }
    }
  });

type CheckoutValues = z.infer<typeof checkoutSchema>;

type OrderResponse = {
  order_number?: string;
  email_confirmation_status?: "sent" | "failed" | "disabled";
  sms_confirmation_status?: "sent" | "failed" | "disabled";
  subtotal?: number;
  shipping_amount?: number;
  discount_amount?: number;
  coupon_code?: string | null;
  total?: number;
  delivery_mode?: DeliveryMode;
  country_code?: string;
  payment_status?: string;
};

type ApiValidationError = {
  loc?: unknown[];
  msg?: string;
};

function getOrderErrorMessage(
  detail: string | ApiValidationError[] | undefined,
): string | null {
  if (typeof detail === "string") return detail;
  if (!Array.isArray(detail) || detail.length === 0) return null;

  return detail
    .map((error) => {
      const field = Array.isArray(error.loc)
        ? error.loc.filter((part) => part !== "body").join(".")
        : "";
      const message = typeof error.msg === "string" ? error.msg : "";
      return field && message ? `${field}: ${message}` : message || field;
    })
    .filter(Boolean)
    .join(" ");
}

/** What was ordered — frozen before the cart store is cleared. */
export type CheckoutReceipt = {
  lines: CartLine[];
  orderNumber: string | null;
  emailConfirmationStatus: "sent" | "failed" | "disabled";
  smsConfirmationStatus: "sent" | "failed" | "disabled";
  subtotal: number;
  shipping: number;
  discount: number;
  promoCode: string | null;
  total: number;
  deliveryMode: DeliveryMode;
  countryCode: string;
  countryName: string;
  paymentStatus: string;
};

type Props = {
  onPlaced: (receipt: CheckoutReceipt) => void;
};

export function CheckoutForm({ onPlaced }: Props) {
  const lines = useCartStore((s) => s.lines);
  const promoCode = useCartStore((s) => s.promoCode);
  const promoDiscount = useCartStore((s) => s.promoDiscount);
  const setPromoCode = useCartStore((s) => s.setPromoCode);
  const deliveryMode = useCartStore((s) => s.deliveryMode);
  const destinationCountry = useCartStore((s) => s.destinationCountry);
  const setDeliveryMode = useCartStore((s) => s.setDeliveryMode);
  const setDestinationCountry = useCartStore((s) => s.setDestinationCountry);
  const clear = useCartStore((s) => s.clear);
  const showToast = useUIStore((s) => s.showToast);

  const [placed, setPlaced] = useState<CheckoutReceipt | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (!promoCode || lines.length === 0) return;
    let cancelled = false;
    void validatePromoCode(promoCode, lines)
      .then((result) => {
        if (cancelled) return;
        if (result.valid) {
          setPromoCode(result.code, result.discount, result.label);
        } else {
          setPromoCode(null);
          setFailure(result.message ?? "That promo code is no longer valid for this bag.");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setFailure(error instanceof Error ? error.message : "We couldn't recheck that promo code.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lines, promoCode, setPromoCode]);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customer_name: "",
      phone: "",
      email: "",
      address_line: "",
      city: "",
      state: "",
      postal_code: "",
      country_code: deliveryMode === "domestic" ? "IN" : destinationCountry,
      delivery_mode: deliveryMode,
    },
    mode: "onBlur",
  });

  const selectedMode = useWatch({ control, name: "delivery_mode" }) ?? deliveryMode;
  const selectedCountryCode = useWatch({ control, name: "country_code" }) ?? destinationCountry;
  const destination = getShippingDestination(selectedCountryCode);
  const subtotal = selectSubtotal(lines);
  const discount = calculatePromo(promoCode, lines, subtotal, promoDiscount);
  const shipping = selectShipping(lines, selectedMode, selectedCountryCode, discount);
  const total = selectTotal(lines, selectedMode, selectedCountryCode, discount);

  const chooseMode = (mode: DeliveryMode) => {
    const country = mode === "domestic" ? "IN" : selectedCountryCode === "IN" ? "AE" : selectedCountryCode;
    setDeliveryMode(mode);
    setDestinationCountry(country);
    setValue("delivery_mode", mode, { shouldValidate: true });
    setValue("country_code", country, { shouldValidate: false });
  };

  const onSubmit = async (values: CheckoutValues) => {
    setFailure(null);

    try {
      let data: OrderResponse;
      try {
        const response = await apiClient.post<OrderResponse>("/api/orders", {
          customer_name: values.customer_name,
          phone: values.phone,
          email: values.email,
          address_line: values.address_line,
          city: values.city,
          state: values.state || null,
          postal_code: values.postal_code,
          country_code: values.country_code,
          delivery_mode: values.delivery_mode,
          coupon_code: promoCode,
          items: lines.map((line) => ({
            product_id: line.id,
            variant_id: line.variantId,
            qty: line.qty,
          })),
        });
        data = response.data;
      } catch (error) {
        const detail = axios.isAxiosError<{ detail?: string | ApiValidationError[] }>(error)
          ? getOrderErrorMessage(error.response?.data?.detail)
          : null;
        throw new Error(
          detail ??
            getApiErrorMessage(
              error,
              "The order could not be placed. Please review your details.",
            ),
        );
      }

      const confirmedMode = data.delivery_mode ?? values.delivery_mode;
      const confirmedCountry = data.country_code ?? values.country_code;
      const receipt: CheckoutReceipt = {
        lines,
        orderNumber: typeof data.order_number === "string" ? data.order_number : null,
        emailConfirmationStatus: data.email_confirmation_status ?? "failed",
        smsConfirmationStatus: data.sms_confirmation_status ?? "failed",
        subtotal: data.subtotal ?? subtotal,
        shipping: data.shipping_amount ?? shipping,
        discount: data.discount_amount ?? discount,
        promoCode: data.coupon_code ?? promoCode,
        total: data.total ?? total,
        deliveryMode: confirmedMode,
        countryCode: confirmedCountry,
        countryName: confirmedMode === "domestic" ? "India" : getShippingDestination(confirmedCountry).name,
        paymentStatus: data.payment_status ?? "pending_offline",
      };

      setPlaced(receipt);
      onPlaced(receipt);
      clear();
      showToast("Order placed — keep your order reference for tracking.", "success");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We couldn’t place your order. Your bag is safe — please try again.";
      setFailure(message);
      showToast("Order not placed — please review the message and try again.", "error");
    }
  };

  /* ------------------------------ Success ------------------------------ */
  if (placed) {
    return (
      <div role="status" className="card p-6 sm:p-8">
        <span className="grid size-14 place-items-center rounded-full bg-cardamom-100 text-cardamom-700">
          <CheckCircleIcon className="size-7" />
        </span>

        <p className="eyebrow mt-5">Order placed</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-ink-950 sm:text-3xl">
          Thank you — we&apos;ve received your order.
        </h2>

        {placed.orderNumber ? (
          <div className="mt-4 rounded-2xl border border-saffron-200 bg-saffron-50 p-4">
            <p className="text-xs font-semibold tracking-wide text-ink-600 uppercase">Order reference</p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink-950">{placed.orderNumber}</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-600">
              Keep this reference for tracking.{" "}
              {placed.emailConfirmationStatus === "sent"
                ? "An order confirmation was sent to your email address."
                : placed.emailConfirmationStatus === "disabled"
                  ? "Email confirmations are currently disabled; keep this reference to track your order."
                  : "We received your order, but could not send the confirmation email. Keep this reference to track your order."}
              {" "}
              {placed.smsConfirmationStatus === "sent"
                ? "An SMS confirmation was also sent."
                : placed.smsConfirmationStatus === "failed"
                  ? "We could not send the SMS confirmation."
                  : ""}
            </p>
          </div>
        ) : null}

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-paper-200 bg-paper-50 p-4">
          <InfoIcon className="mt-0.5 size-5 shrink-0 text-masala-600" />
          <p className="text-sm leading-relaxed text-ink-600">
            No payment was collected. The admin will review the order and contact you on the
            required phone number to confirm payment, address and dispatch before dispatch.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-paper-200 bg-paper-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="eyebrow">What you ordered</p>
            <span className="chip">
              {placed.deliveryMode === "domestic" ? "Domestic" : "Flying Abroad"} · {placed.countryName}
            </span>
          </div>
          <ul className="mt-3 divide-y divide-paper-200">
            {placed.lines.map((line) => (
              <li key={line.key} className="flex items-center gap-3 py-2.5 first:pt-0">
                <SmartImage
                  src={line.image}
                  alt={line.name}
                  aspect="aspect-square"
                  sizes="44px"
                  wrapperClassName="size-11 shrink-0 rounded-lg border border-paper-200"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-950">{line.name}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {line.packSize} · Qty {line.qty}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-ink-950">
                  {formatINR(line.price * line.qty)}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-3 space-y-1.5 border-t border-paper-200 pt-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink-600">Subtotal</span>
              <span className="font-semibold text-ink-950">{formatINR(placed.subtotal)}</span>
            </div>
            {placed.discount > 0 ? (
              <div className="flex items-center justify-between">
                <span className="text-ink-600">Promo discount {placed.promoCode ? `(${placed.promoCode})` : ""}</span>
                <span className="font-semibold text-cardamom-700">−{formatINR(placed.discount)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <span className="text-ink-600">Shipping</span>
              <span className={placed.shipping === 0 ? "font-semibold text-cardamom-600" : "font-semibold"}>
                {placed.shipping === 0 ? "Free" : formatINR(placed.shipping)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-paper-200 pt-2">
              <span className="font-semibold text-ink-900">Total</span>
              <span className="font-display text-lg font-semibold text-ink-950">
                {formatINR(placed.total)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/order-status" className="btn btn-primary">
            Track your order
            <ArrowRightIcon className="size-4" />
          </Link>
          <Link href="/collections/breakfast-masalas" className="btn btn-secondary">
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  /* ------------------------------- Form -------------------------------- */
  const international = selectedMode === "international";

  return (
    <div className="card p-6 sm:p-8">
      <p className="eyebrow">Delivery mode</p>
      <h2 className="mt-2 font-display text-2xl font-semibold text-ink-950">Where are we sending it?</h2>

      <div className="mt-5 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Delivery mode">
        <button
          type="button"
          role="radio"
          aria-checked={selectedMode === "domestic"}
          onClick={() => chooseMode("domestic")}
          className={`rounded-2xl border p-4 text-left transition ${
            selectedMode === "domestic"
              ? "border-masala-600 bg-masala-50 ring-2 ring-masala-100"
              : "border-paper-200 bg-white hover:border-paper-300"
          }`}
        >
          <span className="flex items-center gap-2 font-semibold text-ink-950">
            <TruckIcon className="size-4 text-masala-600" />
            India delivery
          </span>
          <span className="mt-1.5 block text-xs leading-relaxed text-ink-500">
            ₹40, or free on order values of {formatINR(FREE_SHIPPING_THRESHOLD)} and above.
          </span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={international}
          onClick={() => chooseMode("international")}
          className={`rounded-2xl border p-4 text-left transition ${
            international
              ? "border-masala-600 bg-masala-50 ring-2 ring-masala-100"
              : "border-paper-200 bg-white hover:border-paper-300"
          }`}
        >
          <span className="flex items-center gap-2 font-semibold text-ink-950">
            <PackageIcon className="size-4 text-masala-600" />
            Flying Abroad
          </span>
          <span className="mt-1.5 block text-xs leading-relaxed text-ink-500">
            Destination-specific shipping, customs guidance and paperwork.
          </span>
        </button>
      </div>

      {international ? (
        <div className="mt-5 rounded-2xl border border-paper-200 bg-paper-50 p-4">
          <div>
            <label htmlFor="country_code" className="field-label">
              Destination country
            </label>
            <select
              id="country_code"
              autoComplete="country"
              className="input"
              aria-invalid={errors.country_code ? true : undefined}
              aria-describedby={errors.country_code ? "country_code-error" : "country_code-hint shipping-policy"}
              {...register("country_code", {
                onChange: (event) => setDestinationCountry(event.target.value),
              })}
            >
              {INTERNATIONAL_DESTINATIONS.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
            {errors.country_code ? (
              <p id="country_code-error" className="field-error">
                {errors.country_code.message}
              </p>
            ) : (
              <p id="country_code-hint" className="field-hint">
                Only listed destinations are available for standard Flying Abroad checkout.
                Other countries require an admin-approved enquiry.
              </p>
            )}
          </div>

          <div id="shipping-policy" className="mt-4 rounded-xl border border-paper-200 bg-white p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-semibold text-ink-900">Shipping to {destination.name}</span>
              <span className="font-bold text-masala-700">{formatINR(destination.shippingAmount)}</span>
            </div>
            {destination.restricted ? (
              <p className="mt-1 text-xs font-semibold text-masala-700">Admin review required before dispatch.</p>
            ) : null}
            <p className="mt-1 text-xs text-ink-500">Estimated {destination.deliveryEstimate}</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-600">{destination.restriction}</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-600">{INTERNATIONAL_PACKAGING_NOTE}</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-600">{INTERNATIONAL_PAYMENT_NOTE}</p>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 grid gap-5">
        {/* ---------- Contact ---------- */}
        <fieldset className="grid gap-4 border-none p-0">
          <legend className="flex items-center gap-2 font-display text-base font-semibold text-ink-900">
            <span className="grid size-7 place-items-center rounded-full bg-masala-50 text-masala-700">
              <UserIcon className="size-4" />
            </span>
            Contact
          </legend>

          <div>
            <label htmlFor="customer_name" className="field-label">
              Customer name
            </label>
            <input
              id="customer_name"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              className="input"
              aria-invalid={errors.customer_name ? true : undefined}
              aria-describedby={errors.customer_name ? "customer_name-error" : undefined}
              {...register("customer_name")}
            />
            {errors.customer_name ? (
              <p id="customer_name-error" className="field-error">
                {errors.customer_name.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="phone" className="field-label">
                Phone number <span className="text-masala-700">(required)</span>
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder={international ? `${destination.callingCode} 98765 43210` : "+91 98765 43210"}
                className="input"
                aria-invalid={errors.phone ? true : undefined}
                aria-describedby={errors.phone ? "phone-error" : "phone-hint"}
                {...register("phone")}
              />
              {errors.phone ? (
                <p id="phone-error" className="field-error">
                  {errors.phone.message}
                </p>
              ) : (
                <p id="phone-hint" className="field-hint">
                  The admin uses this number to confirm the order offline.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="field-label">
                Email <span className="text-masala-700">(required for order confirmation)</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="input"
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? "email-error" : "email-hint"}
                {...register("email")}
              />
              {errors.email ? (
                <p id="email-error" className="field-error">
                  {errors.email.message}
                </p>
              ) : (
                <p id="email-hint" className="field-hint">
                  We&apos;ll send your order confirmation to this address.
                </p>
              )}
            </div>
          </div>
        </fieldset>

        {/* ---------- Address ---------- */}
        <fieldset className="grid gap-4 border-none p-0">
          <legend className="flex items-center gap-2 font-display text-base font-semibold text-ink-900">
            <span className="grid size-7 place-items-center rounded-full bg-masala-50 text-masala-700">
              <MapPinIcon className="size-4" />
            </span>
            Delivery address
          </legend>

          <div>
            <label htmlFor="address_line" className="field-label">
              Address
            </label>
            <input
              id="address_line"
              type="text"
              autoComplete="street-address"
              placeholder="Flat / house, street, area"
              className="input"
              aria-invalid={errors.address_line ? true : undefined}
              aria-describedby={errors.address_line ? "address_line-error" : undefined}
              {...register("address_line")}
            />
            {errors.address_line ? (
              <p id="address_line-error" className="field-error">
                {errors.address_line.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="city" className="field-label">
                City
              </label>
              <input
                id="city"
                type="text"
                autoComplete="address-level2"
                placeholder={international ? "Dubai" : "Bengaluru"}
                className="input"
                aria-invalid={errors.city ? true : undefined}
                aria-describedby={errors.city ? "city-error" : undefined}
                {...register("city")}
              />
              {errors.city ? (
                <p id="city-error" className="field-error">
                  {errors.city.message}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="state" className="field-label">
                State / province {international ? <span className="font-normal text-ink-400">(optional)</span> : null}
              </label>
              <input
                id="state"
                type="text"
                autoComplete="address-level1"
                placeholder={international ? "Dubai" : "Karnataka"}
                className="input"
                {...register("state")}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="postal_code" className="field-label">
                {international ? "Postal / ZIP code" : "Pincode"}
              </label>
              <input
                id="postal_code"
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder={international ? "Postal code" : "560001"}
                className="input"
                aria-invalid={errors.postal_code ? true : undefined}
                aria-describedby={errors.postal_code ? "postal_code-error" : undefined}
                {...register("postal_code")}
              />
              {errors.postal_code ? (
                <p id="postal_code-error" className="field-error">
                  {errors.postal_code.message}
                </p>
              ) : null}
            </div>

            {!international ? (
              <div>
                <label htmlFor="domestic-country" className="field-label">
                  Country
                </label>
                <input id="domestic-country" value="India" readOnly className="input bg-paper-50" />
                <input type="hidden" {...register("country_code")} />
              </div>
            ) : null}
          </div>
        </fieldset>

        {/* ---------- Offline payment / FR-17 ---------- */}
        <div className="flex items-start gap-3 rounded-2xl border border-saffron-200 bg-saffron-50 p-4">
          <InfoIcon className="mt-0.5 size-5 shrink-0 text-masala-600" />
          <div>
            <p className="text-sm font-semibold text-ink-900">No online payment</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-600">{OFFLINE_PAYMENT_NOTE}</p>
          </div>
        </div>

        {/* ---------- Failure ---------- */}
        {failure ? (
          <div role="alert" className="rounded-2xl border border-chili-200 bg-chili-50 p-4 text-sm text-chili-700">
            <p className="font-semibold">Order didn’t go through</p>
            <p className="mt-1 leading-relaxed">{failure}</p>
            <button
              type="button"
              onClick={() => void handleSubmit(onSubmit)()}
              className="btn btn-secondary btn-sm mt-3"
            >
              <RefreshIcon className="size-4" />
              Try again
            </button>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || lines.length === 0}
          className="btn btn-primary btn-lg btn-block"
        >
          {isSubmitting ? (
            <>
              <RefreshIcon className="size-4 animate-spin" />
              Placing order…
            </>
          ) : (
            <>
              Place order
              <ArrowRightIcon className="size-4" />
            </>
          )}
        </button>

        <p className="-mt-2 text-center text-xs leading-relaxed text-ink-500">
          Placing the order does not charge you. Keep the order reference shown on the next screen.
        </p>
      </form>
    </div>
  );
}
