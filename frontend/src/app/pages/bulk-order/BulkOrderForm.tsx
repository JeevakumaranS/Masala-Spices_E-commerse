"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUIStore } from "@/store/ui";
import { apiClient } from "@/lib/http";
import { ArrowRightIcon, CheckCircleIcon } from "@/components/ui/icons";

const VOLUMES = [
  "10–50 kg per month",
  "51–200 kg per month",
  "201–1,000 kg per month",
  "1,000+ kg per month",
] as const;

/** Strip formatting and country/trunk prefixes so `98765 43210`, `+91 98765 43210`
 *  and `09876543210` all collapse to the same 10 digits. */
function normaliseIndianMobile(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

const isIndianMobile = (value: string) => /^[6-9]\d{9}$/.test(normaliseIndianMobile(value));

const bulkSchema = z.object({
  companyName: z.string().trim().min(2, "Enter your company or business name."),
  contactName: z.string().trim().min(2, "Enter the name we should ask for."),
  email: z.email("Enter a valid email address so we can send the quote."),
  phone: z
    .string()
    .trim()
    .min(1, "Enter a contact number.")
    .refine(isIndianMobile, "Enter a 10-digit Indian mobile number starting with 6–9."),
  volume: z
    .string()
    .min(1, "Choose your estimated monthly volume.")
    .refine(
      (value) => (VOLUMES as readonly string[]).includes(value),
      "Choose your estimated monthly volume.",
    ),
  requirements: z
    .string()
    .trim()
    .min(20, "A little more detail helps us quote — at least 20 characters.")
    .max(3000, "Keep your requirements under 3000 characters."),
});

type BulkValues = z.infer<typeof bulkSchema>;

export function BulkOrderForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const showToast = useUIStore((state) => state.showToast);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BulkValues>({
    resolver: zodResolver(bulkSchema),
    defaultValues: {
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      volume: "",
      requirements: "",
    },
    mode: "onTouched",
  });

  const onSubmit = async (values: BulkValues) => {
    setSubmitError(null);
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("offline");
      }
      await apiClient.post("/api/enquiries", {
        name: values.contactName,
        email: values.email,
        phone: values.phone,
        company_name: values.companyName,
        subject: "Bulk orders",
        message: values.requirements,
        source: "bulk_order",
        details: { monthly_volume: values.volume },
      });

      const firstName = values.contactName.split(" ")[0];
      reset();
      setSentTo(firstName);
      showToast("Bulk enquiry received — we will reply within one working day.", "success");
    } catch {
      const message = "We could not send your enquiry. Check your connection and try again.";
      setSubmitError(message);
      showToast(message, "error");
    }
  };

  if (sentTo) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-cardamom-200 bg-cardamom-50 p-6 text-sm leading-relaxed text-ink-700"
      >
        <span className="grid size-10 place-items-center rounded-full bg-cardamom-500 text-white">
          <CheckCircleIcon className="size-5" />
        </span>
        <h3 className="mt-4 font-display text-xl font-semibold text-ink-950">Enquiry received</h3>
        <p className="mt-2">
          Thanks {sentTo} — your requirements are with the wholesale team. Expect pricing, lead
          times and sample options within one working day, Monday to Saturday.
        </p>
        <button
          type="button"
          className="btn btn-secondary mt-5"
          onClick={() => setSentTo(null)}
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="bulk-company" className="field-label">
            Company name
          </label>
          <input
            id="bulk-company"
            type="text"
            autoComplete="organization"
            placeholder="Annapoorna Restaurants"
            className="input"
            aria-invalid={Boolean(errors.companyName)}
            aria-describedby={errors.companyName ? "bulk-company-error" : undefined}
            {...register("companyName")}
          />
          {errors.companyName ? (
            <p id="bulk-company-error" className="field-error">
              {errors.companyName.message}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="bulk-contact" className="field-label">
            Contact name
          </label>
          <input
            id="bulk-contact"
            type="text"
            autoComplete="name"
            placeholder="Ravi Kumar"
            className="input"
            aria-invalid={Boolean(errors.contactName)}
            aria-describedby={errors.contactName ? "bulk-contact-error" : undefined}
            {...register("contactName")}
          />
          {errors.contactName ? (
            <p id="bulk-contact-error" className="field-error">
              {errors.contactName.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="bulk-email" className="field-label">
            Email address
          </label>
          <input
            id="bulk-email"
            type="email"
            autoComplete="email"
            placeholder="buyer@example.com"
            className="input"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "bulk-email-error" : undefined}
            {...register("email")}
          />
          {errors.email ? (
            <p id="bulk-email-error" className="field-error">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="bulk-phone" className="field-label">
            Phone (Indian mobile)
          </label>
          <input
            id="bulk-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="98765 43210"
            className="input"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "bulk-phone-error" : "bulk-phone-hint"}
            {...register("phone")}
          />
          {errors.phone ? (
            <p id="bulk-phone-error" className="field-error">
              {errors.phone.message}
            </p>
          ) : (
            <p id="bulk-phone-hint" className="field-hint">
              10 digits, starting 6–9 — we call this number to confirm.
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="bulk-volume" className="field-label">
          Estimated volume
        </label>
        <select
          id="bulk-volume"
          className="input cursor-pointer"
          aria-invalid={Boolean(errors.volume)}
          aria-describedby={errors.volume ? "bulk-volume-error" : undefined}
          {...register("volume")}
        >
          <option value="">Select a range…</option>
          {VOLUMES.map((volume) => (
            <option key={volume} value={volume}>
              {volume}
            </option>
          ))}
        </select>
        {errors.volume ? (
          <p id="bulk-volume-error" className="field-error">
            {errors.volume.message}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="bulk-requirements" className="field-label">
          Order requirements
        </label>
        <textarea
          id="bulk-requirements"
          rows={5}
          placeholder="Which blends, pack sizes, delivery city, target dates — anything that helps us quote accurately."
          className="input min-h-32 resize-y"
          aria-invalid={Boolean(errors.requirements)}
          aria-describedby={errors.requirements ? "bulk-requirements-error" : undefined}
          {...register("requirements")}
        />
        {errors.requirements ? (
          <p id="bulk-requirements-error" className="field-error">
            {errors.requirements.message}
          </p>
        ) : null}
      </div>

      {submitError ? (
        <p role="alert" className="field-error">
          {submitError}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
        {isSubmitting ? "Sending enquiry…" : "Submit enquiry"}
        {isSubmitting ? null : <ArrowRightIcon className="size-4" />}
      </button>

      <p className="field-hint">
        We review every enquiry offline before quoting — no automated pricing, no obligation.
      </p>
    </form>
  );
}
