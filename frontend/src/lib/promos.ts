import type { CartLine } from "@/store/cart";
import { apiClient, getApiErrorMessage } from "@/lib/http";

export type PromoValidation = {
  valid: boolean;
  code: string;
  kind?: string;
  label?: string;
  message?: string;
  discount: number;
  first_order_only: boolean;
};

export function calculatePromo(
  code: string | null,
  verifiedDiscount: number | null = null,
): number {
  return code && verifiedDiscount !== null ? Math.max(0, verifiedDiscount) : 0;
}

export async function validatePromoCode(
  code: string,
  lines: CartLine[],
): Promise<PromoValidation> {
  const normalized = code.trim().toUpperCase();
  let payload: Partial<PromoValidation> & { detail?: string };
  try {
    const response = await apiClient.post<Partial<PromoValidation> & { detail?: string }>(
      "/api/coupons/validate",
      {
        code: normalized,
        items: lines.map((line) => ({
          product_id: line.id,
          variant_id: line.variantId,
          qty: line.qty,
        })),
      },
    );
    payload = response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(
        error,
        "We couldn't check that code right now. Please try again in a moment.",
      ),
    );
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
