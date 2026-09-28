"use client";

import axios from "axios";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/cn";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { apiClient } from "@/lib/http";
import { useUIStore } from "@/store/ui";
import {
  AlertIcon,
  CheckIcon,
  ClockIcon,
  InfoIcon,
  RefreshIcon,
} from "@/components/ui/icons";

function normalizePhoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

const isCheckoutPhone = (value: string): boolean => {
  const digits = normalizePhoneDigits(value);
  return 8 <= digits.length && digits.length <= 15;
};

const trackSchema = z.object({
  order_number: z
    .string()
    .trim()
    .min(1, "Order number is required.")
    .regex(/^MAS-\d{5}$/i, "Enter your 5-digit order reference, for example MAS-00001."),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required.")
    .refine(isCheckoutPhone, "Enter the phone number you checked out with, including its country code."),
});

type TrackValues = z.infer<typeof trackSchema>;

type LookupResult = {
  order_number: string;
  status: "placed" | "processing" | "shipped" | "delivered";
  tracking_id: string | null;
  courier_partner: string | null;
};

type Phase = "idle" | "loading" | "success" | "error";

const STAGES: { label: string; status: LookupResult["status"] }[] = [
  { label: "Placed", status: "placed" },
  { label: "Processing", status: "processing" },
  { label: "Shipped", status: "shipped" },
  { label: "Delivered", status: "delivered" },
];

export default function OrderStatusPage() {
  const showToast = useUIStore((s) => s.showToast);

  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [failure, setFailure] = useState<{ title: string; detail: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TrackValues>({
    resolver: zodResolver(trackSchema),
    defaultValues: { order_number: "", phone: "" },
    mode: "onBlur",
  });

  const onSubmit = async (values: TrackValues) => {
    setPhase("loading");
    setFailure(null);

    try {
      const orderNumber = values.order_number.trim().toUpperCase();
      const response = await apiClient.get<{
        order_number?: unknown;
        status?: unknown;
        tracking_id?: unknown;
        courier_partner?: unknown;
      }>(`/api/orders/${encodeURIComponent(orderNumber)}`, {
        params: { phone: values.phone.trim() },
      });
      const data = response.data;
      const orderStatus =
        data?.status === "placed" ||
        data?.status === "processing" ||
        data?.status === "shipped" ||
        data?.status === "delivered"
          ? data.status
          : "placed";

      setResult({
        order_number:
          data && typeof data.order_number === "string" ? data.order_number : orderNumber,
        status: orderStatus,
        tracking_id: typeof data?.tracking_id === "string" ? data.tracking_id : null,
        courier_partner: typeof data?.courier_partner === "string" ? data.courier_partner : null,
      });
      setPhase("success");
    } catch (error) {
      const notFound = axios.isAxiosError(error) && error.response?.status === 404;
      const info = notFound
        ? {
            title: "Order not found",
            detail:
              "We couldn’t find an order matching that order number and phone number. Double-check both and try again — or reach out and we’ll look it up for you.",
          }
        : {
            title: "We couldn’t check that",
            detail:
              "Something went wrong while reaching the kitchen. Please try again in a moment — if it keeps happening, we’d love to hear from you.",
          };

      setResult(null);
      setFailure(info);
      setPhase("error");
      showToast(notFound ? "No order found for those details." : "Order lookup failed.", "error");
    }
  };

  const handleReset = () => {
    setPhase("idle");
    setResult(null);
    setFailure(null);
    reset();
  };

  const activeIndex = STAGES.findIndex((stage) => stage.status === result?.status);

  return (
    <section className="shell py-14 md:py-20">
      <Breadcrumbs items={[{ label: "Order status" }]} />

      <header className="mt-6 max-w-2xl">
        <p className="eyebrow">Track &amp; trace</p>
        <h1 className="section-title mt-3">Order status</h1>
        <p className="lede mt-3">
          Enter your order number and the phone you checked out with — we&apos;ll show exactly
          where your masala is on its journey.
        </p>
      </header>

      <Reveal className="mt-10">
        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-10">
          {/* ---- Lookup form ---- */}
          <div>
            <div className="card p-6 sm:p-8">
              <p className="eyebrow">Find your order</p>
              <h2 className="mt-2 font-display text-xl font-semibold text-ink-950 sm:text-2xl">
                Look it up
              </h2>

              <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="mt-6 grid gap-4"
              >
                <div>
                  <label htmlFor="order_number" className="field-label">
                    Order number
                  </label>
                  <input
                    id="order_number"
                    type="text"
                    placeholder="MAS-00001"
                    autoComplete="off"
                    className="input"
                    aria-invalid={errors.order_number ? true : undefined}
                    aria-describedby={
                      errors.order_number ? "order_number-error" : "order_number-hint"
                    }
                    {...register("order_number")}
                  />
                  {errors.order_number ? (
                    <p id="order_number-error" className="field-error">
                      {errors.order_number.message}
                    </p>
                  ) : (
                    <p id="order_number-hint" className="field-hint">
                      Shown on your checkout confirmation and order confirmation email — e.g. MAS-00001.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="track-phone" className="field-label">
                    Phone number
                  </label>
                  <input
                    id="track-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+91 98765 43210 or +971 50 123 4567"
                    className="input"
                    aria-invalid={errors.phone ? true : undefined}
                    aria-describedby={errors.phone ? "track-phone-error" : undefined}
                    {...register("phone")}
                  />
                  {errors.phone ? (
                    <p id="track-phone-error" className="field-error">
                      {errors.phone.message}
                    </p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary btn-block"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshIcon className="size-4 animate-spin" />
                      Checking…
                    </>
                  ) : (
                    <>Check status</>
                  )}
                </button>
              </form>
            </div>

            {/* ---- Idle hint ---- */}
            {phase === "idle" ? (
              <div className="panel mt-6 flex items-start gap-3 p-5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-masala-700 shadow-sm">
                  <InfoIcon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-base font-semibold text-ink-950">
                    Where do I find my order number?
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
                    It&apos;s shown on your checkout confirmation — keep the reference handy. It
                    always looks like <span className="chip font-semibold text-ink-800">MAS-00001</span>. No
                    order yet?{" "}
                    <Link
                      href="/collections/breakfast-masalas"
                      className="font-semibold text-masala-700 underline-offset-2 hover:underline"
                    >
                      Start shopping
                    </Link>
                    .
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* ---- Result column ---- */}
          <div aria-live="polite">
            {phase === "loading" ? (
              <div className="card space-y-4 p-6" role="status">
                <span className="sr-only">Checking your order…</span>
                <div className="skeleton h-5 w-1/3" />
                <div className="skeleton h-4 w-1/2" />
                <div className="skeleton h-48 w-full" />
                <div className="skeleton h-10 w-2/3" />
              </div>
            ) : phase === "error" && failure ? (
              <div role="alert" className="rounded-3xl border border-chili-200 bg-chili-50 p-6">
                <span className="grid size-11 place-items-center rounded-full bg-chili-600 text-white">
                  <AlertIcon className="size-5" />
                </span>
                <h2 className="mt-4 font-display text-xl font-semibold text-ink-950">
                  {failure.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{failure.detail}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/pages/contact" className="btn btn-primary btn-sm">
                    Contact us
                  </Link>
                  <button type="button" onClick={handleReset} className="btn btn-secondary btn-sm">
                    Try again
                  </button>
                </div>
              </div>
            ) : phase === "success" && result ? (
              <div className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-200 bg-saffron-50 px-5 py-4 sm:px-6">
                  <div>
                    <p className="eyebrow">Tracking</p>
                    <p className="mt-1 font-display text-xl font-semibold text-ink-950">
                      {result.order_number}
                    </p>
                  </div>
                  <span className="chip bg-white font-semibold text-ink-800 capitalize">
                    {result.status}
                  </span>
                </div>

                {result.status === "shipped" || result.status === "delivered" ? (
                  <div className="mx-5 mt-5 rounded-2xl border border-cardamom-200 bg-cardamom-50 p-4 sm:mx-6">
                    <h2 className="font-semibold text-ink-950">Shipment tracking</h2>
                    <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-ink-500">Courier partner</dt>
                        <dd className="font-medium text-ink-900">{result.courier_partner ?? "Not provided"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-ink-500">Tracking ID</dt>
                        <dd className="break-all font-medium text-ink-900">{result.tracking_id ?? "Not provided"}</dd>
                      </div>
                    </dl>
                  </div>
                ) : null}

                <>
                  <ol className="px-5 py-6 sm:px-6">
                    {STAGES.map((stage, index) => {
                      const reached = index <= activeIndex;
                      const active = index === activeIndex;

                      return (
                        <li
                          key={stage.label}
                          aria-current={active ? "step" : undefined}
                          className="relative flex gap-4 pb-6 last:pb-0"
                        >
                          {index < STAGES.length - 1 ? (
                            <span
                              aria-hidden="true"
                              className={cn(
                                "absolute top-10 bottom-0 left-[17px] w-0.5 rounded-full",
                                index < activeIndex ? "bg-cardamom-500" : "bg-paper-200",
                              )}
                            />
                          ) : null}

                          <span
                            className={cn(
                              "relative grid size-9 shrink-0 place-items-center rounded-full border-2 text-xs font-bold",
                              reached &&
                                "border-cardamom-500 bg-cardamom-500 text-white",
                              active && "ring-4 ring-masala-100",
                              !reached &&
                                !active &&
                                "border-paper-300 bg-white text-ink-400",
                            )}
                          >
                            {reached ? <CheckIcon className="size-4" /> : index + 1}
                          </span>

                          <div className="pt-1.5">
                            <p
                              className={cn(
                                "text-sm font-semibold",
                                active
                                  ? "text-masala-700"
                                  : reached
                                    ? "text-ink-900"
                                    : "text-ink-400",
                              )}
                            >
                              {stage.label}
                            </p>
                            <p className="mt-0.5 text-xs text-ink-500">
                              {active
                                ? "Current stage"
                                : reached
                                  ? "Completed"
                                  : "Awaiting this stage"}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>

                  <div className="flex flex-wrap gap-3 border-t border-paper-200 px-5 py-4 sm:px-6">
                    <button type="button" onClick={handleReset} className="btn btn-secondary btn-sm">
                      <RefreshIcon className="size-4" />
                      Track another order
                    </button>
                    <Link href="/pages/contact" className="btn btn-ghost btn-sm">
                      Questions? Contact us
                    </Link>
                  </div>
                </>
              </div>
            ) : (
              <EmptyState
                icon={<ClockIcon className="size-7" />}
                eyebrow="Nothing yet"
                title="No results to show"
                description="Run a lookup and your delivery timeline will appear right here."
              />
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
