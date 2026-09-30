import type { Category, Product } from "@/lib/types";

import { apiClient, getApiErrorMessage } from "@/lib/http";

export type AdminProduct = Product & {
  variants: (Product["variants"][number] & { batch_no?: string | null })[];
};

export type AdminHeroImage = {
  id: string;
  object_key: string;
  url: string;
  alt_text: string;
  sort_order: number;
  created_at: string;
};

export type AdminOrderItem = {
  product_id: string;
  variant_id?: string | null;
  name: string;
  pack_size?: string;
  qty: number;
  price: number;
  line_total?: number;
};

export type AdminOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  email?: string | null;
  status: "placed" | "processing" | "shipped" | "delivered";
  tracking_id?: string | null;
  courier_partner?: string | null;
  payment_status?: string;
  subtotal: number;
  total: number;
  created_at: string;
  item_count: number;
  items: AdminOrderItem[];
  address_line?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  admin_note?: string | null;
  payment_note?: string | null;
};

export type AdminCoupon = {
  id?: string;
  code: string;
  kind: "percentage" | "fixed" | "buy_x_get_y" | "combo";
  label: string;
  minimum_order: number;
  percentage?: number | null;
  fixed_amount?: number | null;
  max_discount?: number | null;
  first_order_only: boolean;
  active_from?: string | null;
  active_until?: string | null;
  eligible_terms?: string[];
  buy_quantity?: number;
  free_quantity?: number;
  is_active: boolean;
};

export type AdminReview = {
  id: string;
  product_id: string;
  product_name?: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  status: "pending" | "approved" | "rejected";
  created_at?: string;
};

export type AnalyticsReport = {
  total_revenue: number;
  orders_count: number;
  avg_order_value: number;
  repeat_purchase_rate: number;
  top_items: { name: string; quantity: number; revenue: number }[];
  top_skus: { sku: string; quantity: number; revenue: number }[];
  sales_by_category: { name: string; revenue: number }[];
  sales_by_region: { name: string; revenue: number }[];
  sales_by_dish_type: { name: string; revenue: number }[];
};

export type AdminOverviewResponse = {
  data: {
    products: AdminProduct[] | null;
    categories: AdminCategory[] | null;
    orders: AdminOrder[] | null;
    coupons: AdminCoupon[] | null;
    reviews: AdminReview[] | null;
    hero_images: AdminHeroImage[] | null;
    analytics: AnalyticsReport | null;
  };
  errors: Record<string, string>;
};

export type ProductInput = Omit<AdminProduct, "id" | "variants"> & {
  variants: Omit<AdminProduct["variants"][number], "id">[];
};

export type AdminRegistrationStatus = {
  admins_exist: boolean;
};

export type AdminAccount = {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
};

export type AdminRegistrationResult = {
  id: string;
  email: string;
  role: "admin";
  access_token?: string;
  token_type?: string;
};

export type AdminIntegrationSettings = {
  sms_enabled: boolean;
  email_enabled: boolean;
  sms_api_key_configured: boolean;
  email_api_key_configured: boolean;
  email_sender_name: string;
  email_sender_email: string;
  sms_sender_phone: string;
};

export type AdminTwilioCredentials = {
  account_sid: string;
  auth_token: string;
  sender_phone: string;
};

export async function uploadAdminHeroImage(
  file: File,
  altText: string,
  token: string,
): Promise<AdminHeroImage> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("alt_text", altText);

  try {
    const response = await apiClient.post<AdminHeroImage>(
      "/api/admin/hero-images",
      formData,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Hero image upload failed."));
  }
}

export async function revealAdminTwilioCredentials(
  token: string,
): Promise<AdminTwilioCredentials> {
  const result = await adminRequest<AdminTwilioCredentials>(
    "/api/admin/integration-settings/reveal",
    token,
    { method: "POST", body: JSON.stringify({ channel: "sms" }) },
  );
  if (!result.account_sid || !result.auth_token || !result.sender_phone) {
    throw new Error("The server did not return complete Twilio credentials.");
  }
  return result;
}

export async function revealAdminIntegrationApiKey(
  channel: "sms" | "email",
  token: string,
): Promise<string> {
  const result = await adminRequest<{ api_key: string }>(
    "/api/admin/integration-settings/reveal",
    token,
    { method: "POST", body: JSON.stringify({ channel }) },
  );
  if (!result.api_key) throw new Error("The server did not return the saved API key.");
  return result.api_key;
}

export async function adminRequest<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await apiClient.request<T>({
      url: path,
      method: init.method ?? "GET",
      headers: Object.fromEntries(headers.entries()),
      data: typeof init.body === "string" ? JSON.parse(init.body) : init.body,
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Admin request failed."));
  }
}

export function getAdminOverview(
  token: string,
  forceRefresh = false,
): Promise<AdminOverviewResponse> {
  const query = forceRefresh ? "?force_refresh=true" : "";
  return adminRequest<AdminOverviewResponse>(`/api/admin/overview${query}`, token);
}

export async function adminLogin(email: string, password: string): Promise<string> {
  let result: { access_token?: string };
  try {
    const response = await apiClient.post<{ access_token?: string }>(
      "/api/admin/login",
      { email, password },
    );
    result = response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Unable to sign in. Check your credentials and try again."),
    );
  }
  if (!result.access_token) throw new Error("The server did not return an admin session.");
  return result.access_token;
}

export async function getAdminRegistrationStatus(): Promise<AdminRegistrationStatus> {
  try {
    const response = await apiClient.get<AdminRegistrationStatus>(
      "/api/admin/registration-status",
    );
    return response.data;
  } catch {
    throw new Error("Admin setup status is unavailable. Check the backend connection.");
  }
}

export async function registerAdmin(
  email: string,
  password: string,
  options: { token?: string } = {},
): Promise<AdminRegistrationResult> {
  try {
    const response = await apiClient.post<AdminRegistrationResult>(
      "/api/admin/register",
      { email, password },
      {
        headers: options.token
          ? { Authorization: `Bearer ${options.token}` }
          : undefined,
      },
    );
    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Admin account could not be registered."),
    );
  }
}

export function asItems<T>(payload: T[] | { items?: T[] }): T[] {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload.items) ? payload.items : [];
}

export type AdminCategory = Category;
