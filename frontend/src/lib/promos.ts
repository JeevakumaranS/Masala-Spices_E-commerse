import type { CartLine } from "@/store/cart";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type PromoRule = {
  kind: "percent" | "seasonal" | "biryani-bundle";
  percentage?: number;
  maximumDiscount?: number;
  minimumOrder?: number;
  activeFrom?: string;
  activeUntil?: string;
  blurb: string;
};

/** Client estimates only. The backend remains authoritative at order placement. */
export const PROMO_RULES: Record<string, PromoRule> = {
  FIRST10: {
    kind: "percent",
    percentage: 10,
    maximumDiscount: 100,
    minimumOrder: 349,
    blurb: "10% off your first order (up to ₹100)",
  },
  WELCOME10: {
    kind: "percent",
    percentage: 10,
    maximumDiscount: 100,
    minimumOrder: 349,
    blurb: "10% off your first order (up to ₹100)",
  },
  FESTIVE20: {
    kind: "seasonal",
    percentage: 20,
    maximumDiscount: 250,
    minimumOrder: 999,
    activeFrom: "2026-09-15",
    activeUntil: "2026-10-15",
    blurb: "20% festive discount on orders above ₹999 (up to ₹250)",
  },
  BIRYANI3: {
    kind: "biryani-bundle",
    blurb: "Buy 2 Biryani blends, get the 3rd free",
  },
};

export type PromoValidation = {
  valid: boolean;
  code: string;
  kind?: string;
  label?: string;
  message?: string;
  discount: number;
  first_order_only: boolean;
};

function isBiryaniLine(line: CartLine): boolean {
  const terms = [line.name, line.dishType, line.category, ...(line.categories ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return terms.includes("biryani") || terms.includes("biriyani");
}

export function calculatePromo(
  code: string | null,
  lines: CartLine[],
  subtotal: number,
  verifiedDiscount: number | null = null,
): number {
  if (!code) return 0;
  if (verifiedDiscount !== null) {
    return Math.min(subtotal, Math.max(0, verifiedDiscount));
  }
  const rule = PROMO_RULES[code];
  if (!rule || (rule.minimumOrder && subtotal < rule.minimumOrder)) return 0;

  const today = new Date();
  if (
    rule.activeFrom &&
    today < new Date(`${rule.activeFrom}T00:00:00`)
  ) {
    return 0;
  }
  if (
    rule.activeUntil &&
    today > new Date(`${rule.activeUntil}T23:59:59`)
  ) {
    return 0;
  }

  if (rule.kind === "biryani-bundle") {
    const eligiblePrices = lines
      .filter(isBiryaniLine)
      .flatMap((line) => Array.from({ length: line.qty }, () => line.price))
      .sort((left, right) => left - right);
    if (eligiblePrices.length < 3) return 0;
    return eligiblePrices
      .filter((_, index) => index % 3 === 0)
      .reduce((total, price) => total + price, 0);
  }

  const rawDiscount = (subtotal * (rule.percentage ?? 0)) / 100;
  return Math.round(Math.min(rawDiscount, rule.maximumDiscount ?? rawDiscount));
}

export async function validatePromoCode(
  code: string,
  lines: CartLine[],
): Promise<PromoValidation> {
  const normalized = code.trim().toUpperCase();
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/coupons/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: normalized,
        items: lines.map((line) => ({
          product_id: line.id,
          variant_id: line.variantId ?? 0,
          qty: line.qty,
        })),
      }),
    });
  } catch {
    throw new Error("We couldn't check that code right now. Please try again in a moment.");
  }

  const payload = (await response.json().catch(() => null)) as
    | (Partial<PromoValidation> & { detail?: string })
    | null;
  if (!response.ok || !payload) {
    throw new Error(payload?.detail ?? "We couldn't validate that promo code.");
  }

  return {
    valid: Boolean(payload.valid),
    code: typeof payload.code === "string" ? payload.code : normalized,
    kind: typeof payload.kind === "string" ? payload.kind : undefined,
    label: typeof payload.label === "string" ? payload.label : undefined,
    message: typeof payload.message === "string" ? payload.message : undefined,
    discount: typeof payload.discount === "number" ? payload.discount : 0,
    first_order_only: Boolean(payload.first_order_only),
  };
}
