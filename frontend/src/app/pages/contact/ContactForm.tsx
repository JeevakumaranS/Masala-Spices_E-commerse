"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiClient } from "@/lib/http";
import { ArrowRightIcon, CheckCircleIcon } from "@/components/ui/icons";

const SUBJECTS = ["General", "Order issue", "Bulk orders", "Others"] as const;

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name."),
  email: z.email("Enter a valid email address so we can reply."),
  phone: z.string().trim().min(7, "Enter a valid phone number.").max(24, "Keep the phone number under 24 characters."),
  subject: z.enum(SUBJECTS, { error: "Choose a subject." }),
  customSubject: z.string().trim().max(80, "Keep the subject under 80 characters."),
  message: z
    .string()
    .trim()
    .min(10, "Tell us a little more — at least 10 characters.")
    .max(2000, "Keep your message under 2000 characters."),
}).refine(
  (values) => values.subject !== "Others" || values.customSubject.length > 0,
  { message: "Enter a subject.", path: ["customSubject"] },
);

type ContactValues = z.infer<typeof contactSchema>;

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", phone: "", subject: undefined, customSubject: "", message: "" },
    mode: "onTouched",
  });
  const subject = useWatch({ control, name: "subject" });

  const onSubmit = async (values: ContactValues) => {
    setSubmitError(null);
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("offline");
      }
      await apiClient.post("/api/enquiries", {
        name: values.name,
        email: values.email,
        phone: values.phone,
        subject: values.subject === "Others" ? values.customSubject.trim() : values.subject,
        message: values.message,
      });
      reset();
      setSent(true);
    } catch {
      setSubmitError(
        "We could not send that just now. Check your connection and try again, or email hello@masalahouse.in.",
      );
    }
  };

  if (sent) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-cardamom-200 bg-cardamom-50 p-6 text-sm leading-relaxed text-ink-700"
      >
        <span className="grid size-10 place-items-center rounded-full bg-cardamom-500 text-white">
          <CheckCircleIcon className="size-5" />
        </span>
        <h3 className="mt-4 font-display text-xl font-semibold text-ink-950">Message sent</h3>
        <p className="mt-2">
          Thanks — we have it. The team replies within one working day, Monday to Saturday. If it is
          urgent, call +91 98765 43210 during shop hours.
        </p>
        <button
          type="button"
          className="btn btn-secondary mt-5"
          onClick={() => setSent(false)}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div>
        <label htmlFor="contact-name" className="field-label">
          Your name
        </label>
        <input
          id="contact-name"
          type="text"
          autoComplete="name"
          placeholder="Anita Rao"
          className="input"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "contact-name-error" : undefined}
          {...register("name")}
        />
        {errors.name ? (
          <p id="contact-name-error" className="field-error">
            {errors.name.message}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="contact-email" className="field-label">
          Email address
        </label>
        <input
          id="contact-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className="input"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "contact-email-error" : undefined}
          {...register("email")}
        />
        {errors.email ? (
          <p id="contact-email-error" className="field-error">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="contact-phone" className="field-label">
          Phone number
        </label>
        <input
          id="contact-phone"
          type="tel"
          autoComplete="tel"
          placeholder="+91 98765 43210"
          className="input"
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? "contact-phone-error" : undefined}
          {...register("phone")}
        />
        {errors.phone ? (
          <p id="contact-phone-error" className="field-error">
            {errors.phone.message}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="contact-subject" className="field-label">
          Subject
        </label>
        <select
          id="contact-subject"
          className="input cursor-pointer"
          aria-invalid={Boolean(errors.subject)}
          aria-describedby={errors.subject ? "contact-subject-error" : undefined}
          {...register("subject")}
        >
          <option value="">Choose a subject…</option>
          {SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>
              {subject === "Bulk orders" ? "Bulk Orders" : subject}
            </option>
          ))}
        </select>
        {errors.subject ? (
          <p id="contact-subject-error" className="field-error">
            {errors.subject.message}
          </p>
        ) : null}
      </div>

      {subject === "Others" ? (
        <div>
          <label htmlFor="contact-custom-subject" className="field-label">
            Your subject
          </label>
          <input
            id="contact-custom-subject"
            type="text"
            maxLength={80}
            placeholder="Enter your subject"
            className="input"
            aria-invalid={Boolean(errors.customSubject)}
            aria-describedby={errors.customSubject ? "contact-custom-subject-error" : undefined}
            {...register("customSubject")}
          />
          {errors.customSubject ? (
            <p id="contact-custom-subject-error" className="field-error">
              {errors.customSubject.message}
            </p>
          ) : null}
        </div>
      ) : null}

      <div>
        <label htmlFor="contact-message" className="field-label">
          Message
        </label>
        <textarea
          id="contact-message"
          rows={5}
          placeholder="Tell us what you need — order number, blends, volumes, anything useful."
          className="input min-h-32 resize-y"
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "contact-message-error" : undefined}
          {...register("message")}
        />
        {errors.message ? (
          <p id="contact-message-error" className="field-error">
            {errors.message.message}
          </p>
        ) : null}
      </div>

      {submitError ? (
        <p role="alert" className="field-error">
          {submitError}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Send message"}
        {isSubmitting ? null : <ArrowRightIcon className="size-4" />}
      </button>

      <p className="field-hint">
        Prefer the phone? Call +91 98765 43210, Mon–Sat 9am–6pm IST.
      </p>
    </form>
  );
}
