import type { Category, Product } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type AdminProduct = Product & {
  variants: (Product["variants"][number] & { batch_no?: string | null })[];
};

export type AdminOrderItem = {
  product_id: number;
  variant_id?: number | null;
  name: string;
  pack_size?: string;
  qty: number;
  price: number;
  line_total?: number;
};

export type AdminOrder = {
  id: number;
  order_number: string;
  customer_name: string;
  phone: string;
  email?: string | null;
  status: string;
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
  id?: number;
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
  id: number;
  product_id: number;
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

export type ProductInput = Omit<AdminProduct, "id" | "variants"> & {
  variants: Omit<AdminProduct["variants"][number], "id">[];
};

export type AdminRegistrationStatus = {
  admins_exist: boolean;
  bootstrap_enabled: boolean;
};

export type AdminAccount = {
  id: number;
  email: string;
  is_active: boolean;
  created_at: string;
};

export type AdminRegistrationResult = {
  id: number;
  email: string;
  role: "admin";
  access_token?: string;
  token_type?: string;
};

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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const error = (await response.json()) as { detail?: string; message?: string };
      message = error.detail ?? error.message ?? message;
    } catch {
      // Keep the HTTP status message when the server did not return JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function adminLogin(email: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  if (!response.ok) {
    let message = "Unable to sign in. Check your credentials and try again.";
    try {
      const error = (await response.json()) as { detail?: string };
      message = error.detail ?? message;
    } catch {
      // Keep the sign-in message when the server did not return JSON.
    }
    throw new Error(message);
  }

  const result = (await response.json()) as { access_token?: string };
  if (!result.access_token) throw new Error("The server did not return an admin session.");
  return result.access_token;
}

export async function getAdminRegistrationStatus(): Promise<AdminRegistrationStatus> {
  const response = await fetch(`${API_BASE_URL}/api/admin/registration-status`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Admin setup status is unavailable. Check the backend connection.");
  }
  return (await response.json()) as AdminRegistrationStatus;
}

export async function registerAdmin(
  email: string,
  password: string,
  options: { token?: string; bootstrapSecret?: string } = {},
): Promise<AdminRegistrationResult> {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);
  const response = await fetch(`${API_BASE_URL}/api/admin/register`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      password,
      ...(options.bootstrapSecret ? { bootstrap_secret: options.bootstrapSecret } : {}),
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    let message = `Admin account could not be registered (${response.status}).`;
    try {
      const error = (await response.json()) as { detail?: string };
      message = error.detail ?? message;
    } catch {
      // Keep the response status message when the server did not return JSON.
    }
    throw new Error(message);
  }
  return (await response.json()) as AdminRegistrationResult;
}

export function asItems<T>(payload: T[] | { items?: T[] }): T[] {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload.items) ? payload.items : [];
}

export type AdminCategory = Category;
