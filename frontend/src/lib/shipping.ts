export type DeliveryMode = "domestic" | "international";

export type ShippingDestination = {
  code: string;
  name: string;
  callingCode: string;
  shippingAmount: number;
  deliveryEstimate: string;
  restricted: boolean;
  restriction: string;
};

export const FREE_SHIPPING_THRESHOLD = 349;
export const DOMESTIC_SHIPPING_FEE = 40;
export const INTERNATIONAL_PACKAGING_NOTE =
  "Sealed, food-safe packaging with product and batch details. Carton design, commercial invoices and destination paperwork are confirmed by the admin before dispatch.";
export const INTERNATIONAL_CUSTOMS_NOTE =
  "Duties, customs clearance and destination taxes are not collected online. The admin confirms what applies to your destination before dispatch.";
export const OFFLINE_PAYMENT_NOTE =
  "No payment is collected on this website. After reviewing your order, the admin will contact you on the required phone number to arrange payment and dispatch.";
export const INTERNATIONAL_PAYMENT_NOTE =
  "Shipping is quoted in INR and arranged offline. Any duty or customs charge is confirmed with the customer before dispatch.";

/** Starter data mirrored from the backend shipping policy for instant checkout estimates. */
export const INTERNATIONAL_DESTINATIONS: ShippingDestination[] = [
  { code: "AE", name: "United Arab Emirates", callingCode: "+971", shippingAmount: 1299, deliveryEstimate: "5–8 working days", restricted: false, restriction: INTERNATIONAL_CUSTOMS_NOTE },
  { code: "SA", name: "Saudi Arabia", callingCode: "+966", shippingAmount: 1299, deliveryEstimate: "5–8 working days", restricted: false, restriction: INTERNATIONAL_CUSTOMS_NOTE },
  { code: "QA", name: "Qatar", callingCode: "+974", shippingAmount: 1299, deliveryEstimate: "5–8 working days", restricted: false, restriction: INTERNATIONAL_CUSTOMS_NOTE },
  { code: "KW", name: "Kuwait", callingCode: "+965", shippingAmount: 1299, deliveryEstimate: "5–8 working days", restricted: false, restriction: INTERNATIONAL_CUSTOMS_NOTE },
  { code: "OM", name: "Oman", callingCode: "+968", shippingAmount: 1299, deliveryEstimate: "5–8 working days", restricted: false, restriction: INTERNATIONAL_CUSTOMS_NOTE },
  { code: "BH", name: "Bahrain", callingCode: "+973", shippingAmount: 1299, deliveryEstimate: "5–8 working days", restricted: false, restriction: INTERNATIONAL_CUSTOMS_NOTE },
  { code: "SG", name: "Singapore", callingCode: "+65", shippingAmount: 1499, deliveryEstimate: "5–8 working days", restricted: false, restriction: INTERNATIONAL_CUSTOMS_NOTE },
  { code: "MY", name: "Malaysia", callingCode: "+60", shippingAmount: 1499, deliveryEstimate: "5–8 working days", restricted: false, restriction: INTERNATIONAL_CUSTOMS_NOTE },
  { code: "TH", name: "Thailand", callingCode: "+66", shippingAmount: 1499, deliveryEstimate: "5–8 working days", restricted: false, restriction: INTERNATIONAL_CUSTOMS_NOTE },
  { code: "GB", name: "United Kingdom", callingCode: "+44", shippingAmount: 1699, deliveryEstimate: "6–10 working days", restricted: false, restriction: INTERNATIONAL_CUSTOMS_NOTE },
  { code: "DE", name: "Germany", callingCode: "+49", shippingAmount: 1699, deliveryEstimate: "6–10 working days", restricted: false, restriction: INTERNATIONAL_CUSTOMS_NOTE },
  { code: "FR", name: "France", callingCode: "+33", shippingAmount: 1699, deliveryEstimate: "6–10 working days", restricted: false, restriction: INTERNATIONAL_CUSTOMS_NOTE },
  { code: "NL", name: "Netherlands", callingCode: "+31", shippingAmount: 1699, deliveryEstimate: "6–10 working days", restricted: false, restriction: INTERNATIONAL_CUSTOMS_NOTE },
  { code: "IE", name: "Ireland", callingCode: "+353", shippingAmount: 1699, deliveryEstimate: "6–10 working days", restricted: false, restriction: INTERNATIONAL_CUSTOMS_NOTE },
  { code: "ES", name: "Spain", callingCode: "+34", shippingAmount: 1699, deliveryEstimate: "6–10 working days", restricted: false, restriction: INTERNATIONAL_CUSTOMS_NOTE },
  { code: "IT", name: "Italy", callingCode: "+39", shippingAmount: 1699, deliveryEstimate: "6–10 working days", restricted: false, restriction: INTERNATIONAL_CUSTOMS_NOTE },
  { code: "US", name: "United States", callingCode: "+1", shippingAmount: 1899, deliveryEstimate: "7–12 working days", restricted: false, restriction: INTERNATIONAL_CUSTOMS_NOTE },
  { code: "CA", name: "Canada", callingCode: "+1", shippingAmount: 1899, deliveryEstimate: "7–12 working days", restricted: false, restriction: INTERNATIONAL_CUSTOMS_NOTE },
  { code: "AU", name: "Australia", callingCode: "+61", shippingAmount: 1999, deliveryEstimate: "7–12 working days", restricted: false, restriction: INTERNATIONAL_CUSTOMS_NOTE },
  { code: "NZ", name: "New Zealand", callingCode: "+64", shippingAmount: 1999, deliveryEstimate: "7–12 working days", restricted: false, restriction: INTERNATIONAL_CUSTOMS_NOTE },
  { code: "JP", name: "Japan", callingCode: "+81", shippingAmount: 1799, deliveryEstimate: "6–10 working days", restricted: false, restriction: INTERNATIONAL_CUSTOMS_NOTE },
  { code: "KR", name: "South Korea", callingCode: "+82", shippingAmount: 1799, deliveryEstimate: "6–10 working days", restricted: false, restriction: INTERNATIONAL_CUSTOMS_NOTE },
];

export const DESTINATIONS_BY_CODE = Object.fromEntries(
  INTERNATIONAL_DESTINATIONS.map((destination) => [destination.code, destination]),
) as Record<string, ShippingDestination>;

export function getShippingDestination(code: string): ShippingDestination {
  return DESTINATIONS_BY_CODE[code] ?? INTERNATIONAL_DESTINATIONS[0];
}
