"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  AdminCategory,
  AdminAccount,
  AdminCoupon,
  AdminOrder,
  AdminProduct,
  AdminReview,
  AdminIntegrationSettings,
  AdminRegistrationStatus,
  AnalyticsReport,
  getAdminRegistrationStatus,
  adminLogin,
  adminRequest,
  asItems,
  revealAdminIntegrationApiKey,
  revealAdminTwilioCredentials,
  registerAdmin,
} from "@/lib/admin";
import {
  ArrowRightIcon,
  BagIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeOffIcon,
  FlameIcon,
  HomeIcon,
  PackageIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  ShieldIcon,
  StarIcon,
  TagIcon,
  TrashIcon,
  TruckIcon,
  UtensilsIcon,
} from "@/components/ui/icons";
import { formatINR, formatShortINR } from "@/lib/format";

type Section = "overview" | "orders" | "products" | "categories" | "campaigns" | "coupons" | "reviews" | "analytics" | "api";
type OrderFilter = "all" | "placed" | "processing" | "shipped";
type VariantDraft = {
  pack_size: string;
  price: string;
  mrp: string;
  sku: string;
  stock_qty: string;
  batch_no: string;
  expiry_date: string;
};
type ProductDraft = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  ingredients: string;
  categories: string;
  dish_type: string;
  status: string;
  price: string;
  mrp: string;
  spice_level: string;
  image_url: string;
  variants: VariantDraft[];
};
type CouponDraft = {
  code: string;
  label: string;
  kind: AdminCoupon["kind"];
  minimum_order: string;
  discount: string;
  max_discount: string;
  buy_quantity: string;
  free_quantity: string;
  eligible_terms: string;
  active_from: string;
  active_until: string;
  is_active: boolean;
  first_order_only: boolean;
};

const NAV: { id: Section; label: string; Icon: typeof HomeIcon }[] = [
  { id: "overview", label: "Overview", Icon: HomeIcon },
  { id: "orders", label: "Orders", Icon: BagIcon },
  { id: "products", label: "Products", Icon: PackageIcon },
  { id: "categories", label: "Categories", Icon: TagIcon },
  { id: "campaigns", label: "Combos & offers", Icon: FlameIcon },
  { id: "coupons", label: "Promotions", Icon: FlameIcon },
  { id: "reviews", label: "Reviews", Icon: StarIcon },
  { id: "analytics", label: "Analytics", Icon: UtensilsIcon },
  { id: "api", label: "API & notifications", Icon: ShieldIcon },
];

const ORDER_STAGES: AdminOrder["status"][] = ["placed", "processing", "shipped", "delivered"];
const ORDER_FILTERS: { id: OrderFilter; label: string }[] = [
  { id: "all", label: "All orders" },
  { id: "placed", label: "New orders" },
  { id: "processing", label: "Processing" },
  { id: "shipped", label: "Shipped" },
];
const NEXT_ORDER_STAGE: Partial<Record<AdminOrder["status"], AdminOrder["status"]>> = {
  placed: "processing",
  processing: "shipped",
  shipped: "delivered",
};
const EMPTY_ANALYTICS: AnalyticsReport = {
  total_revenue: 0,
  orders_count: 0,
  avg_order_value: 0,
  repeat_purchase_rate: 0,
  top_items: [],
  top_skus: [],
  sales_by_category: [],
  sales_by_region: [],
  sales_by_dish_type: [],
};

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-paper-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none transition focus:border-masala-500 focus:ring-2 focus:ring-masala-500/15";
const labelClass = "block text-xs font-semibold tracking-wide text-ink-600";
const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-masala-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-masala-800 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-paper-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:border-masala-300 hover:text-masala-800 disabled:opacity-50";

function displayStatus(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function amount(value: number | undefined) {
  return formatINR(value ?? 0);
}

function unwrap<T>(payload: T[] | { items?: T[] }) {
  return asItems(payload);
}

function subscribeAdminSession(onChange: () => void) {
  window.addEventListener("masala-admin-session", onChange);
  return () => window.removeEventListener("masala-admin-session", onChange);
}

function getAdminSession() {
  return window.sessionStorage.getItem("masala-admin-token") ?? "";
}

async function fetchAllOrders(token: string) {
  const orders: AdminOrder[] = [];
  let offset = 0;
  const pageSize = 500;
  for (;;) {
    const page = await adminRequest<AdminOrder[]>(`/api/admin/orders?limit=${pageSize}&offset=${offset}`, token);
    orders.push(...page);
    if (page.length < pageSize) return orders;
    offset += page.length;
  }
}

function EmptyPanel({ children }: { children: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-paper-300 bg-white/70 px-5 py-12 text-center">
      <p className="font-display text-xl font-semibold text-ink-800">{children}</p>
      <p className="mt-1 text-sm text-ink-500">Nothing to show yet.</p>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-paper-50 p-5 shadow-2xl sm:rounded-3xl sm:p-7 ${wide ? "max-w-3xl" : "max-w-xl"}`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Admin workspace</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-ink-950">{title}</h2>
          </div>
          <button
            type="button"
            className="rounded-xl p-2 text-ink-500 hover:bg-paper-100 hover:text-ink-900"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export default function AdminDashboard() {
  const token = useSyncExternalStore(subscribeAdminSession, getAdminSession, () => "");
  const [section, setSection] = useState<Section>("overview");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsReport>(EMPTY_ANALYTICS);
  const [integrationSettings, setIntegrationSettings] = useState<AdminIntegrationSettings | null>(null);
  const [smsApiKey, setSmsApiKey] = useState("");
  const [smsAccountSid, setSmsAccountSid] = useState("");
  const [smsSenderPhone, setSmsSenderPhone] = useState("");
  const [emailApiKey, setEmailApiKey] = useState("");
  const [smsApiKeyVisible, setSmsApiKeyVisible] = useState(false);
  const [emailApiKeyVisible, setEmailApiKeyVisible] = useState(false);
  const [smsApiKeyDirty, setSmsApiKeyDirty] = useState(false);
  const [smsAccountSidDirty, setSmsAccountSidDirty] = useState(false);
  const [emailApiKeyDirty, setEmailApiKeyDirty] = useState(false);
  const [clearSmsApiKey, setClearSmsApiKey] = useState(false);
  const [clearEmailApiKey, setClearEmailApiKey] = useState(false);
  const [integrationSettingsError, setIntegrationSettingsError] = useState("");
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [registrationStatus, setRegistrationStatus] = useState<AdminRegistrationStatus | null>(null);
  const [registrationStatusError, setRegistrationStatusError] = useState("");
  const [setupEmail, setSetupEmail] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupError, setSetupError] = useState("");
  const [adminManagerOpen, setAdminManagerOpen] = useState(false);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [adminRegistrationError, setAdminRegistrationError] = useState("");
  const [adminRegistrationNotice, setAdminRegistrationNotice] = useState("");
  const [productEditor, setProductEditor] = useState<ProductDraft | null>(null);
  const [categoryEditor, setCategoryEditor] = useState<AdminCategory | null | "new">(null);
  const [couponEditor, setCouponEditor] = useState<AdminCoupon | null | "new">(null);
  const [couponKind, setCouponKind] = useState<AdminCoupon["kind"]>("percentage");
  const [activeOrder, setActiveOrder] = useState<AdminOrder | null>(null);
  const [originalOrderStatus, setOriginalOrderStatus] = useState("");
  const [productToAdd, setProductToAdd] = useState("");

  const navigateToSection = (nextSection: Section) => {
    setNotice("");
    setSection(nextSection);
  };

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void getAdminRegistrationStatus()
        .then((status) => {
          if (cancelled) return;
          setRegistrationStatus(status);
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setRegistrationStatusError(error instanceof Error ? error.message : "Admin setup status is unavailable.");
          }
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    const tasks = await Promise.allSettled([
      adminRequest<AdminProduct[] | { items?: AdminProduct[] }>("/api/admin/products", token),
      adminRequest<AdminCategory[] | { items?: AdminCategory[] }>("/api/admin/categories", token),
      fetchAllOrders(token),
      adminRequest<AdminCoupon[] | { items?: AdminCoupon[] }>("/api/admin/coupons", token),
      adminRequest<AdminReview[] | { items?: AdminReview[] }>("/api/admin/reviews", token),
      adminRequest<AnalyticsReport>("/api/admin/analytics/summary", token),
    ]);

    const errors: string[] = [];
    const setResult = <T,>(
      result: PromiseSettledResult<T>,
      setter: (value: T) => void,
      label: string,
    ) => {
      if (result.status === "fulfilled") setter(result.value);
      else errors.push(`${label}: ${result.reason instanceof Error ? result.reason.message : "Unable to load data"}`);
    };

    setResult(tasks[0], (payload) => setProducts(unwrap(payload)), "Products");
    setResult(tasks[1], (payload) => setCategories(unwrap(payload)), "Categories");
    setResult(tasks[2], setOrders, "Orders");
    setResult(tasks[3], (payload) => setCoupons(unwrap(payload)), "Promotions");
    setResult(tasks[4], (payload) => setReviews(unwrap(payload)), "Reviews");
    setResult(tasks[5], setAnalytics, "Analytics");
    setLoadErrors(errors);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [token, refresh]);

  useEffect(() => {
    if (!token || section !== "api") return;
    let cancelled = false;
    void (async () => {
      try {
        const settings = await adminRequest<AdminIntegrationSettings>(
          "/api/admin/integration-settings",
          token,
        );
        const [savedSmsCredentials, savedEmailApiKey] = await Promise.all([
          settings.sms_api_key_configured
            ? revealAdminTwilioCredentials(token)
            : Promise.resolve({
                account_sid: "",
                auth_token: "",
                sender_phone: settings.sms_sender_phone,
              }),
          settings.email_api_key_configured
            ? revealAdminIntegrationApiKey("email", token)
            : Promise.resolve(""),
        ]);
        if (cancelled) return;
        setIntegrationSettings(settings);
        setIntegrationSettingsError("");
        setSmsApiKey(savedSmsCredentials.auth_token);
        setSmsAccountSid(savedSmsCredentials.account_sid);
        setSmsSenderPhone(savedSmsCredentials.sender_phone);
        setEmailApiKey(savedEmailApiKey);
        setSmsApiKeyVisible(false);
        setEmailApiKeyVisible(false);
        setSmsApiKeyDirty(false);
        setSmsAccountSidDirty(false);
        setEmailApiKeyDirty(false);
        setClearSmsApiKey(false);
        setClearEmailApiKey(false);
      } catch (error: unknown) {
        if (!cancelled) {
          setIntegrationSettingsError(error instanceof Error ? error.message : "Integration settings could not be loaded.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, section]);

  const runAction = async (action: () => Promise<unknown>, successMessage: string) => {
    setBusy(true);
    setNotice("");
    try {
      await action();
      setNotice(successMessage);
      await refresh();
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The action could not be completed.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setLoginError("");
    try {
      const accessToken = await adminLogin(loginEmail.trim(), loginPassword);
      window.sessionStorage.setItem("masala-admin-token", accessToken);
      window.dispatchEvent(new Event("masala-admin-session"));
      setLoginPassword("");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  };

  const saveIntegrationSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setIntegrationSettingsError("");
    setNotice("");
    try {
      const payload: {
        sms_enabled: boolean;
        email_enabled: boolean;
        sms_api_key?: string;
        sms_account_sid?: string;
        sms_sender_phone: string;
        email_api_key?: string;
        email_sender_name: string;
        email_sender_email: string;
        clear_sms_api_key: boolean;
        clear_email_api_key: boolean;
      } = {
        sms_enabled: integrationSettings?.sms_enabled ?? false,
        email_enabled: integrationSettings?.email_enabled ?? false,
        sms_sender_phone: smsSenderPhone,
        email_sender_name: integrationSettings?.email_sender_name ?? "",
        email_sender_email: integrationSettings?.email_sender_email ?? "",
        clear_sms_api_key: clearSmsApiKey,
        clear_email_api_key: clearEmailApiKey,
      };
      if (smsApiKeyDirty && smsApiKey.trim()) payload.sms_api_key = smsApiKey.trim();
      if (smsAccountSidDirty && smsAccountSid.trim()) payload.sms_account_sid = smsAccountSid.trim();
      if (emailApiKeyDirty && emailApiKey.trim()) payload.email_api_key = emailApiKey.trim();
      const updated = await adminRequest<AdminIntegrationSettings>(
        "/api/admin/integration-settings",
        token,
        { method: "PUT", body: JSON.stringify(payload) },
      );
      setIntegrationSettings(updated);
      if (!updated.sms_api_key_configured) setSmsApiKey("");
      if (!updated.sms_api_key_configured) setSmsAccountSid("");
      setSmsSenderPhone(updated.sms_sender_phone);
      if (!updated.email_api_key_configured) setEmailApiKey("");
      setSmsApiKeyVisible(false);
      setEmailApiKeyVisible(false);
      setSmsApiKeyDirty(false);
      setSmsAccountSidDirty(false);
      setEmailApiKeyDirty(false);
      setClearSmsApiKey(false);
      setClearEmailApiKey(false);
      setNotice("API settings saved.");
    } catch (error) {
      setIntegrationSettingsError(error instanceof Error ? error.message : "API settings could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const toggleIntegrationApiKeyVisibility = (channel: "sms" | "email") => {
    const isVisible = channel === "sms" ? smsApiKeyVisible : emailApiKeyVisible;
    if (channel === "sms") {
      setSmsApiKeyVisible(!isVisible);
    } else {
      setEmailApiKeyVisible(!isVisible);
    }
  };

  const signOut = () => {
    window.sessionStorage.removeItem("masala-admin-token");
    window.dispatchEvent(new Event("masala-admin-session"));
    setProducts([]);
    setOrders([]);
    setCategories([]);
    setCoupons([]);
    setReviews([]);
    setLoadErrors([]);
  };

  const setupFirstAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setSetupError("");
    try {
      const created = await registerAdmin(setupEmail.trim(), setupPassword);
      if (!created.access_token) {
        throw new Error("The initial admin was registered, but the server did not return a session. Sign in to continue.");
      }
      window.sessionStorage.setItem("masala-admin-token", created.access_token);
      window.dispatchEvent(new Event("masala-admin-session"));
      setSetupPassword("");
      setRegistrationStatus({ admins_exist: true });
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "Admin account could not be registered.");
    } finally {
      setBusy(false);
    }
  };

  const openAdminManager = async () => {
    setAdminRegistrationError("");
    setAdminRegistrationNotice("");
    try {
      const result = await adminRequest<AdminAccount[]>("/api/admin/admins", token);
      setAdminAccounts(result);
      setAdminManagerOpen(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Admin accounts could not be loaded.");
    }
  };

  const addAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setAdminRegistrationError("");
    setAdminRegistrationNotice("");
    try {
      await registerAdmin(newAdminEmail.trim(), newAdminPassword, { token });
      const updatedAdmins = await adminRequest<AdminAccount[]>("/api/admin/admins", token);
      setAdminAccounts(updatedAdmins);
      setNewAdminEmail("");
      setNewAdminPassword("");
      setAdminRegistrationNotice("Administrator account created. They can now sign in with their email and password.");
    } catch (error) {
      setAdminRegistrationError(error instanceof Error ? error.message : "Admin account could not be registered.");
    } finally {
      setBusy(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((product) =>
      [product.name, product.slug, ...product.categories].join(" ").toLowerCase().includes(needle),
    );
  }, [products, search]);
  const comboProducts = filteredProducts.filter((product) =>
    product.categories.some((category) => /combo|pack/i.test(category)),
  );

  if (!token) {
    const firstAdminSetup = registrationStatus !== null && !registrationStatus.admins_exist;
    return (
      <div className="grid min-h-[80vh] place-items-center bg-[radial-gradient(circle_at_top_right,#fbe8bf,transparent_45%),linear-gradient(140deg,#fff8ee,#f3e9dc)] px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-paper-200 bg-white p-7 shadow-xl sm:p-9">
          <div className="grid size-12 place-items-center rounded-2xl bg-masala-700 text-white">
            <ShieldIcon className="size-6" />
          </div>
          <p className="eyebrow mt-6">Masala House · Back office</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink-950">
            {firstAdminSetup ? "Set up the first admin" : "Admin sign in"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            {firstAdminSetup
              ? "Create the first administrator account with an email address and password."
              : "Sign in with an administrator account to manage orders, products and promotions."}
          </p>
          {firstAdminSetup ? (
            <form onSubmit={setupFirstAdmin} className="mt-7 space-y-4">
              <label className={labelClass} htmlFor="setup-email">
                Admin email
                <input id="setup-email" type="email" autoComplete="email" required className={fieldClass} value={setupEmail} onChange={(event) => setSetupEmail(event.target.value)} />
              </label>
              <label className={labelClass} htmlFor="setup-password">
                Password
                <input id="setup-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required className={fieldClass} value={setupPassword} onChange={(event) => setSetupPassword(event.target.value)} />
              </label>
              {setupError ? <p role="alert" className="text-sm font-medium text-chili-700">{setupError}</p> : null}
              <button className={`${primaryButton} w-full`} disabled={busy}>
                {busy ? "Creating account…" : "Create first admin"}
                <ArrowRightIcon className="size-4" />
              </button>
            </form>
          ) : (
          <form onSubmit={signIn} className="mt-7 space-y-4">
            <label className={labelClass} htmlFor="admin-email">
              Email address
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                required
                className={fieldClass}
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
              />
            </label>
            <label className={labelClass} htmlFor="admin-password">
              Password
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                className={fieldClass}
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
              />
            </label>
            {loginError ? <p role="alert" className="text-sm font-medium text-chili-700">{loginError}</p> : null}
            <button className={`${primaryButton} w-full`} disabled={busy}>
              {busy ? "Signing in…" : "Sign in to admin"}
              <ArrowRightIcon className="size-4" />
            </button>
          </form>
          )}
          {registrationStatusError ? <p role="alert" className="mt-4 text-center text-xs text-chili-700">{registrationStatusError}</p> : null}
          <p className="mt-5 text-center text-xs text-ink-400">
            {firstAdminSetup ? "First-admin setup closes after the account is created." : "Admin access only · session ends when this browser tab closes"}
          </p>
        </div>
      </div>
    );
  }

  const openProduct = (product?: AdminProduct, combo = false) => {
    setProductEditor(
      product
        ? {
            id: product.id,
            name: product.name,
            slug: product.slug,
            description: product.description,
            ingredients: product.ingredients.join(", "),
            categories: product.categories.join(", "),
            dish_type: product.dish_type ?? "",
            status: product.status,
            price: String(product.price),
            mrp: String(product.mrp),
            spice_level: product.spice_level,
            image_url: product.images.map((image) => image.url).join("\n"),
            variants: product.variants.map((variant) => ({
              pack_size: variant.pack_size,
              price: String(variant.price),
              mrp: String(variant.mrp),
              sku: variant.sku,
              stock_qty: String(variant.stock_qty),
              batch_no: variant.batch_no ?? "",
              expiry_date: variant.expiry_date ?? "",
            })),
          }
        : {
            name: "",
            slug: "",
            description: "",
            ingredients: "",
            categories: combo
              ? categories.find((category) => /combo|pack/i.test(`${category.slug} ${category.name}`))?.slug ?? "combos-packs"
              : "",
            dish_type: "",
            status: "active",
            price: "",
            mrp: "",
            spice_level: "mild",
            image_url: "",
            variants: [{ pack_size: "", price: "", mrp: "", sku: "", stock_qty: "0", batch_no: "", expiry_date: "" }],
          },
    );
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!productEditor) return;
    const editor = productEditor;
    const payload = {
      name: editor.name.trim(),
      slug: editor.slug.trim(),
      description: editor.description.trim(),
      ingredients: editor.ingredients.split(",").map((value) => value.trim()).filter(Boolean),
      categories: editor.categories.split(",").map((value) => value.trim()).filter(Boolean),
      dish_type: editor.dish_type.trim() || null,
      status: editor.status,
      spice_level: editor.spice_level,
      price: Number(editor.price),
      mrp: Number(editor.mrp),
      images: editor.image_url.split(/\r?\n/).map((url) => url.trim()).filter(Boolean),
      variants: editor.variants.filter((variant) => variant.pack_size.trim()).map((variant) => ({
        pack_size: variant.pack_size.trim(),
        price: Number(variant.price),
        mrp: Number(variant.mrp),
        sku: variant.sku.trim(),
        stock_qty: Number(variant.stock_qty),
        batch_no: variant.batch_no.trim() || null,
        expiry_date: variant.expiry_date || null,
      })),
    };
    const method = editor.id ? "PUT" : "POST";
    const url = editor.id ? `/api/admin/products/${editor.id}` : "/api/admin/products";
    const saved = await runAction(
      () => adminRequest(url, token, { method, body: JSON.stringify(payload) }),
      editor.id ? "Product updated." : "Product created.",
    );
    if (saved) setProductEditor(null);
  };

  const saveCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = categoryEditor && categoryEditor !== "new" ? categoryEditor.id : undefined;
    const body = {
      name: String(form.get("name") ?? "").trim(),
      slug: String(form.get("slug") ?? "").trim(),
      type: String(form.get("type") ?? "product_type"),
      description: String(form.get("description") ?? "").trim() || null,
    };
    const saved = await runAction(
      () => adminRequest(id ? `/api/admin/categories/${id}` : "/api/admin/categories", token, {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(body),
      }),
      id ? "Category updated." : "Category created.",
    );
    if (saved) setCategoryEditor(null);
  };

  const removeCategory = async (category: AdminCategory) => {
    if (!window.confirm(`Remove ${category.name}? Products will keep their current category labels.`)) return;
    await runAction(
      () => adminRequest(`/api/admin/categories/${category.id}`, token, { method: "DELETE" }),
      "Category removed.",
    );
  };

  const saveCoupon = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!couponEditor) return;
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") ?? "").trim().toUpperCase();
    const label = String(form.get("label") ?? "").trim() || code;
    const kind = String(form.get("kind") ?? "percentage") as AdminCoupon["kind"];
    const amountValue = Number(form.get("discount") ?? 0);
    const minimumOrder = Number(form.get("minimum_order") ?? 0);
    const maxDiscountValue = String(form.get("max_discount") ?? "").trim();
    const buyQuantity = Number(form.get("buy_quantity") ?? 0);
    const freeQuantity = Number(form.get("free_quantity") ?? 0);
    const isActive = form.get("is_active") === "on";
    const firstOrderOnly = form.get("first_order_only") === "on";
    const activeFrom = String(form.get("active_from") ?? "");
    const activeUntil = String(form.get("active_until") ?? "");
    const body = {
      code,
      label,
      kind,
      discount_value: kind === "percentage" || kind === "fixed" ? amountValue : 0,
      minimum_order: minimumOrder,
      active: isActive,
      starts_at: activeFrom || null,
      ends_at: activeUntil || null,
      first_order_only: kind === "percentage" && firstOrderOnly,
      max_discount: maxDiscountValue ? Number(maxDiscountValue) : null,
      buy_quantity: kind === "buy_x_get_y" || kind === "combo" ? buyQuantity : 0,
      free_quantity: kind === "buy_x_get_y" || kind === "combo" ? freeQuantity : 0,
      eligible_terms: (kind === "buy_x_get_y" || kind === "combo")
        ? String(form.get("eligible_terms") ?? "").split(",").map((term) => term.trim()).filter(Boolean)
        : [],
    };
    const id = couponEditor === "new" ? undefined : couponEditor.id;
    const saved = await runAction(
      () => adminRequest(id ? `/api/admin/coupons/${id}` : "/api/admin/coupons", token, {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(body),
      }),
      id ? "Promotion updated." : "Promotion created.",
    );
    if (saved) setCouponEditor(null);
  };

  const updateOrder = async () => {
    if (!activeOrder) return;
    const shippingTransition =
      originalOrderStatus === "processing" && activeOrder.status === "shipped";
    if (shippingTransition && !activeOrder.tracking_id?.trim()) {
      setNotice("Enter the tracking ID before marking this order as shipped.");
      return;
    }
    if (shippingTransition && !activeOrder.courier_partner?.trim()) {
      setNotice("Enter the courier partner before marking this order as shipped.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const updated = await adminRequest<{ email_notification_status?: "sent" | "failed" | "disabled" | null }>(
        `/api/admin/orders/${activeOrder.id}`,
        token,
        {
        method: "PUT",
        body: JSON.stringify({
          items: activeOrder.items.map((item) => ({ ...item, qty: Math.max(1, Number(item.qty)) })),
          status: activeOrder.status,
          tracking_id: activeOrder.tracking_id ?? null,
          courier_partner: activeOrder.courier_partner ?? null,
          admin_note: activeOrder.admin_note ?? "",
          payment_note: activeOrder.payment_note ?? "",
        }),
        },
      );
      const mailNotice = updated.email_notification_status === "failed"
        ? " The status was saved, but the notification email failed to send."
        : updated.email_notification_status === "disabled"
          ? " The status was saved; email notifications are disabled."
          : updated.email_notification_status === "sent"
            ? " A status update email was sent to the customer."
            : "";
      setNotice(`Order changes saved.${mailNotice}`);
      setActiveOrder(null);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Order changes could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const moderateReview = async (review: AdminReview, status: AdminReview["status"]) => {
    await runAction(
      () => adminRequest(`/api/admin/reviews/${review.id}`, token, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
      `Review ${status}.`,
    );
  };

  const removeCoupon = async (coupon: AdminCoupon) => {
    if (!window.confirm(`Delete promotion ${coupon.code}?`)) return;
    await runAction(
      () => adminRequest(`/api/admin/coupons/${coupon.id ?? coupon.code}`, token, { method: "DELETE" }),
      "Promotion removed.",
    );
  };

  const pageTitle = NAV.find((item) => item.id === section)?.label ?? "Overview";
  const openOrder = (order: AdminOrder) => {
    setActiveOrder(order);
    setOriginalOrderStatus(order.status);
  };
  const openCouponEditor = (coupon: AdminCoupon | null | "new") => {
    setCouponEditor(coupon);
    setCouponKind(coupon === "new" || coupon === null ? "percentage" : coupon.kind === "combo" ? "buy_x_get_y" : coupon.kind);
  };

  const newCoupon = (): CouponDraft => ({
    code: "",
    label: "",
    kind: "percentage",
    minimum_order: "0",
    discount: "",
    max_discount: "",
    buy_quantity: "2",
    free_quantity: "1",
    eligible_terms: "",
    active_from: "",
    active_until: "",
    is_active: true,
    first_order_only: false,
  });

  return (
    <div className="min-h-[80vh] bg-[#f7f3ec] text-ink-900 md:grid md:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="border-b border-paper-200 bg-[#302016] text-paper-100 md:min-h-[calc(100vh-1rem)] md:border-b-0 md:border-r md:px-4 md:py-6">
        <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-2 md:py-1">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-saffron-400/15 text-saffron-300">
              <FlameIcon className="size-5" />
            </span>
            <span>
              <span className="block font-display text-lg font-semibold text-white">Masala House</span>
              <span className="block text-[0.65rem] font-bold tracking-[0.16em] text-paper-400 uppercase">Back office</span>
            </span>
          </div>
          <button type="button" onClick={signOut} className="text-xs font-semibold text-paper-300 hover:text-white md:hidden">
            Sign out
          </button>
        </div>
        <nav aria-label="Admin sections" className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 md:mt-9 md:block md:space-y-1 md:overflow-visible md:px-0">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => navigateToSection(id)}
              aria-current={section === id ? "page" : undefined}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition md:w-full ${section === id ? "bg-saffron-400 text-ink-950 shadow-md" : "text-paper-300 hover:bg-white/10 hover:text-white"}`}
            >
              <Icon className="size-[1.05rem]" />
              {label}
            </button>
          ))}
        </nav>
        <div className="mx-2 mt-8 hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:block">
          <div className="flex items-center gap-2 text-xs font-semibold text-cardamom-200">
            <CheckCircleIcon className="size-4" />
            Single administrator
          </div>
          <p className="mt-2 text-xs leading-relaxed text-paper-400">Full access to the catalog, orders, promotions, reviews and reports.</p>
        </div>
        <button type="button" onClick={signOut} className="mt-7 hidden w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-paper-400 transition hover:bg-white/10 hover:text-white md:flex">
          <ShieldIcon className="size-4" />
          Sign out
        </button>
      </aside>

      <div className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">{section === "overview" ? "Store pulse" : "Management"}</p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-ink-950 sm:text-4xl">{pageTitle}</h1>
            <p className="mt-1 text-sm text-ink-500">
              {section === "overview" ? "A live view of orders, catalog and customer activity." : `Manage your store ${pageTitle.toLowerCase()} in one place.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void refresh()} className={secondaryButton} disabled={busy}>
              <RefreshIcon className="size-4" />
              Refresh
            </button>
            <button type="button" className={secondaryButton} onClick={() => void openAdminManager()}>Manage admins</button>
            <Link href="/" className={secondaryButton}>View storefront</Link>
          </div>
        </header>

        {loadErrors.length > 0 ? (
          <div role="alert" className="mt-6 rounded-2xl border border-chili-100 bg-chili-50 p-4 text-sm text-chili-700">
            <p className="font-semibold">Some admin data could not be loaded.</p>
            <ul className="mt-1 list-inside list-disc">{loadErrors.map((error) => <li key={error}>{error}</li>)}</ul>
          </div>
        ) : null}
        {notice ? (
          <p role="status" className={`mt-5 rounded-xl border px-4 py-3 text-sm font-medium ${notice.includes("updated") || notice.includes("created") || notice.includes("saved") || notice.includes("removed") || notice.includes("approved") || notice.includes("rejected") ? "border-cardamom-200 bg-cardamom-50 text-cardamom-700" : "border-chili-100 bg-chili-50 text-chili-700"}`}>
            {notice}
          </p>
        ) : null}

        {section === "overview" ? (
          <Overview
            analytics={analytics}
            orders={orders}
            products={products}
            reviews={reviews}
            onOpenOrders={() => navigateToSection("orders")}
            onSelectOrder={openOrder}
          />
        ) : null}

        {section === "orders" ? (
          <section className="mt-7">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold text-ink-950">Orders</h2>
                <p className="text-sm text-ink-500">Filter orders by their current status and review their details.</p>
              </div>
              <label className="relative block w-full sm:max-w-xs">
                <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" />
                <input className={`${fieldClass} mt-0 pl-9`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order or customer" aria-label="Search orders" />
              </label>
            </div>
            <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter orders by status">
              {ORDER_FILTERS.map(({ id, label }) => {
                const count = id === "all"
                  ? orders.length
                  : orders.filter((order) => order.status === id).length;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setOrderFilter(id)}
                    aria-pressed={orderFilter === id}
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                      orderFilter === id
                        ? "border-masala-700 bg-masala-700 text-white"
                        : "border-paper-200 bg-white text-ink-700 hover:border-masala-300 hover:text-masala-800"
                    }`}
                  >
                    {label}
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      orderFilter === id ? "bg-white/15 text-white" : "bg-paper-100 text-ink-500"
                    }`}>{count}</span>
                  </button>
                );
              })}
            </div>
            <OrdersTable
              orders={orders.filter((order) => {
                const matchesFilter = orderFilter === "all" || order.status === orderFilter;
                const matchesSearch = `${order.order_number} ${order.customer_name} ${order.phone} ${order.status}`
                  .toLowerCase()
                  .includes(search.toLowerCase());
                return matchesFilter && matchesSearch;
              })}
              onSelect={openOrder}
            />
          </section>
        ) : null}

        {section === "products" || section === "campaigns" ? (
          <section className="mt-7">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink-500">
                {section === "campaigns"
                  ? `${comboProducts.length} combos · manage bundle pricing, images and inventory here.`
                  : `${products.length} products in catalog · stock and batch details are managed per pack size.`}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="relative block">
                  <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" />
                  <input className={`${fieldClass} mt-0 pl-9`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={section === "campaigns" ? "Search combos" : "Search products"} aria-label={section === "campaigns" ? "Search combos" : "Search products"} />
                </label>
                <button type="button" onClick={() => openProduct(undefined, section === "campaigns")} className={primaryButton}><PlusIcon className="size-4" />{section === "campaigns" ? "Create combo" : "Add product"}</button>
              </div>
            </div>
            <ProductsTable products={section === "campaigns" ? comboProducts : filteredProducts} onEdit={openProduct} onDelete={async (product) => {
              if (!window.confirm(`Delete ${product.name}? This also removes its variants.`)) return;
              await runAction(() => adminRequest(`/api/admin/products/${product.id}`, token, { method: "DELETE" }), section === "campaigns" ? "Combo removed." : "Product removed.");
            }} />
          </section>
        ) : null}

        {section === "categories" ? (
          <section className="mt-7">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-ink-500">Organize product types, regions, dishes and collections.</p>
              <button type="button" className={primaryButton} onClick={() => setCategoryEditor("new")}><PlusIcon className="size-4" />Add category</button>
            </div>
            {categories.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {categories.map((category) => (
                  <article key={category.id} className="rounded-2xl border border-paper-200 bg-white p-5 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-lg font-semibold text-ink-950">{category.name}</h2>
                        <p className="mt-1 text-xs text-ink-400">/{category.slug}</p>
                      </div>
                      <span className="chip">{displayStatus(category.type)}</span>
                    </div>
                    {category.description ? <p className="mt-3 text-sm text-ink-600">{category.description}</p> : null}
                    <div className="mt-4 flex gap-2">
                      <button type="button" className={secondaryButton} onClick={() => setCategoryEditor(category)}>Edit</button>
                      <button type="button" className="rounded-xl p-2.5 text-chili-600 hover:bg-chili-50" aria-label={`Delete ${category.name}`} onClick={() => void removeCategory(category)}><TrashIcon className="size-4" /></button>
                    </div>
                  </article>
                ))}
              </div>
            ) : <EmptyPanel>No categories loaded</EmptyPanel>}
          </section>
        ) : null}

        {section === "coupons" || section === "campaigns" ? (
          <section className="mt-7">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-ink-500">
                {section === "campaigns" ? "Create and manage coupon offers shown on the storefront." : "Manage coupon rules and combo offers shown at checkout."}
              </p>
              <button type="button" className={primaryButton} onClick={() => openCouponEditor("new")}><PlusIcon className="size-4" />{section === "campaigns" ? "Create offer" : "Create promotion"}</button>
            </div>
            {coupons.length ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {coupons.map((coupon) => (
                  <article key={coupon.id ?? coupon.code} className="rounded-2xl border border-paper-200 bg-white p-5 shadow-xs">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span className="inline-flex rounded-lg bg-saffron-100 px-2.5 py-1 font-mono text-sm font-bold tracking-wider text-ink-900">{coupon.code}</span>
                        <p className="mt-3 font-semibold text-ink-900">{coupon.label}</p>
                        <p className="mt-1 text-xs text-ink-500">{displayStatus(coupon.kind)} · Minimum order {amount(coupon.minimum_order)}</p>
                      </div>
                      <span className={`chip ${coupon.is_active ? "border-cardamom-200 bg-cardamom-50 text-cardamom-700" : ""}`}>{coupon.is_active ? "Active" : "Paused"}</span>
                    </div>
                    {(coupon.active_from || coupon.active_until) ? <p className="mt-3 text-xs text-ink-400">{coupon.active_from || "Any date"} — {coupon.active_until || "No expiry"}</p> : null}
                    <div className="mt-4 flex gap-2">
                      <button type="button" className={secondaryButton} onClick={() => openCouponEditor(coupon)}>Edit</button>
                      <button type="button" className="rounded-xl p-2.5 text-chili-600 hover:bg-chili-50" aria-label={`Delete ${coupon.code}`} onClick={() => void removeCoupon(coupon)}><TrashIcon className="size-4" /></button>
                    </div>
                  </article>
                ))}
              </div>
            ) : <EmptyPanel>No promotions loaded</EmptyPanel>}
          </section>
        ) : null}

        {section === "reviews" ? (
          <section className="mt-7">
            <p className="mb-4 text-sm text-ink-500">Moderate customer feedback before it appears on product pages.</p>
            {reviews.length ? (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <article key={review.id} className="rounded-2xl border border-paper-200 bg-white p-5 shadow-xs">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold text-ink-950">{review.reviewer_name}</h2>
                          <span className="text-saffron-600" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(Math.max(0, Math.min(review.rating, 5)))}</span>
                          <span className="chip">{displayStatus(review.status)}</span>
                        </div>
                        <p className="mt-1 text-xs text-ink-400">{review.product_name ?? `Product #${review.product_id}`}{review.created_at ? ` · ${new Date(review.created_at).toLocaleDateString()}` : ""}</p>
                        <p className="mt-3 text-sm leading-relaxed text-ink-700">{review.comment}</p>
                      </div>
                      {review.status === "pending" ? (
                        <div className="flex shrink-0 gap-2">
                          <button type="button" className={primaryButton} disabled={busy} onClick={() => void moderateReview(review, "approved")}><CheckCircleIcon className="size-4" />Approve</button>
                          <button type="button" className={secondaryButton} disabled={busy} onClick={() => void moderateReview(review, "rejected")}>Reject</button>
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : <EmptyPanel>No reviews in the moderation queue</EmptyPanel>}
          </section>
        ) : null}

        {section === "analytics" ? <Analytics analytics={analytics} /> : null}
        {section === "api" ? (
          <form onSubmit={saveIntegrationSettings} className="mt-7 max-w-4xl space-y-5">
            <div className="rounded-2xl border border-saffron-200 bg-saffron-50 p-4 text-sm leading-relaxed text-ink-700">
              Saved provider credentials remain in their fields as masked dots after refresh. Use the eye button to reveal or hide a secret. Keep your screen private while it is visible.
              Order confirmation emails use Brevo transactional email. Add a Brevo API v3 key and a verified sender identity before enabling email.
            </div>
            {integrationSettingsError ? (
              <p role="alert" className="rounded-xl border border-chili-100 bg-chili-50 px-4 py-3 text-sm text-chili-700">{integrationSettingsError}</p>
            ) : null}
            {!integrationSettings && !integrationSettingsError ? (
              <p role="status" className="text-sm text-ink-500">Loading integration settings…</p>
            ) : null}
            {integrationSettings ? (
              <>
                <section className="rounded-2xl border border-paper-200 bg-white p-5 shadow-xs sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="font-display text-xl font-semibold text-ink-950">SMS</h2>
                      <p className="mt-1 text-sm text-ink-500">Send order confirmations through Twilio Programmable Messaging.</p>
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-ink-700">
                      <input
                        type="checkbox"
                        checked={integrationSettings.sms_enabled}
                        onChange={(event) => setIntegrationSettings({ ...integrationSettings, sms_enabled: event.target.checked })}
                        className="size-4 accent-[#bd4b16]"
                      />
                      Enabled
                    </label>
                  </div>
                  <div className="mt-5">
                    <label className={labelClass} htmlFor="twilio-account-sid">Twilio Account SID</label>
                    <input
                      id="twilio-account-sid"
                      type="text"
                      autoComplete="off"
                      className={fieldClass}
                      placeholder="AC followed by 32 characters"
                      value={smsAccountSid}
                      onChange={(event) => {
                        setSmsAccountSid(event.target.value);
                        setSmsAccountSidDirty(true);
                        setClearSmsApiKey(false);
                      }}
                    />
                  </div>
                  <div className="mt-4">
                    <label className={labelClass} htmlFor="sms-api-key">Twilio Auth Token</label>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        id="sms-api-key"
                        type={smsApiKeyVisible ? "text" : "password"}
                        autoComplete="new-password"
                        className={`${fieldClass} mt-0 min-w-0 flex-1`}
                        placeholder={integrationSettings.sms_api_key_configured ? "" : "Enter Twilio Auth Token"}
                        value={smsApiKey}
                        onChange={(event) => {
                          setSmsApiKey(event.target.value);
                          setSmsApiKeyDirty(true);
                          setClearSmsApiKey(false);
                        }}
                      />
                      {integrationSettings.sms_api_key_configured ? (
                        <button
                          type="button"
                          className={secondaryButton}
                          onClick={() => toggleIntegrationApiKeyVisibility("sms")}
                          aria-label={smsApiKeyVisible ? "Hide Twilio Auth Token" : "Show Twilio Auth Token"}
                          title={smsApiKeyVisible ? "Hide Auth Token" : "Show Auth Token"}
                        >
                          {smsApiKeyVisible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <label className={`${labelClass} mt-4 block`}>
                    Twilio sender phone number (E.164)
                    <input
                      type="tel"
                      autoComplete="off"
                      className={fieldClass}
                      placeholder="+14155550123"
                      value={smsSenderPhone}
                      onChange={(event) => {
                        setSmsSenderPhone(event.target.value);
                        setClearSmsApiKey(false);
                      }}
                    />
                  </label>
                  <p className="mt-2 text-xs leading-relaxed text-ink-500">
                    Use a Twilio number enabled for SMS on your account. Confirm Twilio supports messaging to your customers&apos; destinations.
                  </p>
                  {integrationSettings.sms_api_key_configured ? (
                    <label className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-chili-700">
                      <input type="checkbox" checked={clearSmsApiKey} onChange={(event) => setClearSmsApiKey(event.target.checked)} className="size-4 accent-[#bd4b16]" />
                      Remove saved Twilio credentials
                    </label>
                  ) : null}
                </section>
                <section className="rounded-2xl border border-paper-200 bg-white p-5 shadow-xs sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="font-display text-xl font-semibold text-ink-950">Email</h2>
                      <p className="mt-1 text-sm text-ink-500">Send order confirmations through the Brevo transactional email API.</p>
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-ink-700">
                      <input
                        type="checkbox"
                        checked={integrationSettings.email_enabled}
                        onChange={(event) => setIntegrationSettings({ ...integrationSettings, email_enabled: event.target.checked })}
                        className="size-4 accent-[#bd4b16]"
                      />
                      Enabled
                    </label>
                  </div>
                  <div className="mt-5">
                    <label className={labelClass} htmlFor="email-api-key">Brevo API v3 key</label>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        id="email-api-key"
                        type={emailApiKeyVisible ? "text" : "password"}
                        autoComplete="new-password"
                        className={`${fieldClass} mt-0 min-w-0 flex-1`}
                        placeholder={integrationSettings.email_api_key_configured ? "" : "Enter API key"}
                        value={emailApiKey}
                        onChange={(event) => {
                          setEmailApiKey(event.target.value);
                          setEmailApiKeyDirty(true);
                          setClearEmailApiKey(false);
                        }}
                      />
                      {integrationSettings.email_api_key_configured ? (
                        <button
                          type="button"
                          className={secondaryButton}
                          onClick={() => toggleIntegrationApiKeyVisibility("email")}
                          aria-label={emailApiKeyVisible ? "Hide email API key" : "Show email API key"}
                          title={emailApiKeyVisible ? "Hide API key" : "Show API key"}
                        >
                          {emailApiKeyVisible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className={labelClass}>
                      Verified sender name
                      <input
                        type="text"
                        autoComplete="organization"
                        maxLength={120}
                        required={integrationSettings.email_enabled}
                        className={fieldClass}
                        placeholder="Masala House"
                        value={integrationSettings.email_sender_name ?? ""}
                        onChange={(event) => setIntegrationSettings({ ...integrationSettings, email_sender_name: event.target.value })}
                      />
                    </label>
                    <label className={labelClass}>
                      Verified sender email
                      <input
                        type="email"
                        autoComplete="email"
                        maxLength={254}
                        required={integrationSettings.email_enabled}
                        className={fieldClass}
                        placeholder="orders@example.com"
                        value={integrationSettings.email_sender_email ?? ""}
                        onChange={(event) => setIntegrationSettings({ ...integrationSettings, email_sender_email: event.target.value })}
                      />
                    </label>
                  </div>
                  {integrationSettings.email_api_key_configured ? (
                    <label className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-chili-700">
                      <input type="checkbox" checked={clearEmailApiKey} onChange={(event) => setClearEmailApiKey(event.target.checked)} className="size-4 accent-[#bd4b16]" />
                      Remove saved email API key
                    </label>
                  ) : null}
                </section>
                <div className="flex justify-end">
                  <button type="submit" className={primaryButton} disabled={busy}>
                    {busy ? "Saving…" : "Save API settings"}
                  </button>
                </div>
              </>
            ) : null}
          </form>
        ) : null}
      </div>

      {productEditor ? (
        <Modal title={productEditor.id ? "Edit product" : "Add product"} onClose={() => setProductEditor(null)} wide>
          <form onSubmit={saveProduct} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>Product name<input required className={fieldClass} value={productEditor.name} onChange={(event) => setProductEditor({ ...productEditor, name: event.target.value })} /></label>
              <label className={labelClass}>URL slug<input required className={fieldClass} value={productEditor.slug} onChange={(event) => setProductEditor({ ...productEditor, slug: event.target.value })} /></label>
              <label className={labelClass}>Price (₹)<input required type="number" min="0" step="0.01" className={fieldClass} value={productEditor.price} onChange={(event) => setProductEditor({ ...productEditor, price: event.target.value })} /></label>
              <label className={labelClass}>MRP (₹)<input required type="number" min="0" step="0.01" className={fieldClass} value={productEditor.mrp} onChange={(event) => setProductEditor({ ...productEditor, mrp: event.target.value })} /></label>
              <label className={labelClass}>Categories<input className={fieldClass} placeholder="Whole Spices, Breakfast Masalas" value={productEditor.categories} onChange={(event) => setProductEditor({ ...productEditor, categories: event.target.value })} /></label>
              <label className={labelClass}>Dish type<input className={fieldClass} placeholder="Sambar, biryani…" value={productEditor.dish_type} onChange={(event) => setProductEditor({ ...productEditor, dish_type: event.target.value })} /></label>
              <label className={labelClass}>Spice level<select className={fieldClass} value={productEditor.spice_level} onChange={(event) => setProductEditor({ ...productEditor, spice_level: event.target.value })}><option value="mild">Mild</option><option value="medium">Medium</option><option value="hot">Hot</option></select></label>
              <label className={labelClass}>Status<select className={fieldClass} value={productEditor.status} onChange={(event) => setProductEditor({ ...productEditor, status: event.target.value })}><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></select></label>
              <label className={`${labelClass} sm:col-span-2`}>Product image URLs (one per line)<textarea rows={2} className={fieldClass} placeholder={"https://…/front.webp\nhttps://…/back.webp"} value={productEditor.image_url} onChange={(event) => setProductEditor({ ...productEditor, image_url: event.target.value })} /></label>
              <label className={`${labelClass} sm:col-span-2`}>Description<textarea required rows={3} className={fieldClass} value={productEditor.description} onChange={(event) => setProductEditor({ ...productEditor, description: event.target.value })} /></label>
              <label className={`${labelClass} sm:col-span-2`}>Ingredients (comma-separated)<input className={fieldClass} value={productEditor.ingredients} onChange={(event) => setProductEditor({ ...productEditor, ingredients: event.target.value })} /></label>
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div><h3 className="font-semibold text-ink-900">Pack sizes, inventory & batch</h3><p className="text-xs text-ink-500">Add SKU, stock quantity, batch number and expiry date per variant.</p></div>
                <button type="button" className={secondaryButton} onClick={() => setProductEditor({ ...productEditor, variants: [...productEditor.variants, { pack_size: "", price: productEditor.price, mrp: productEditor.mrp, sku: "", stock_qty: "0", batch_no: "", expiry_date: "" }] })}><PlusIcon className="size-4" />Add pack</button>
              </div>
              <div className="space-y-3">
                {productEditor.variants.map((variant, index) => (
                  <div key={index} className="grid gap-3 rounded-2xl bg-paper-100 p-3 sm:grid-cols-2 lg:grid-cols-4">
                    {([
                      ["pack_size", "Pack size", "100 g"],
                      ["sku", "SKU", "MAS-100"],
                      ["price", "Price", "0"],
                      ["mrp", "MRP", "0"],
                      ["stock_qty", "Stock quantity", "0"],
                      ["batch_no", "Batch number", "BATCH-001"],
                      ["expiry_date", "Expiry date", ""],
                    ] as const).map(([key, label, placeholder]) => (
                      <label className={labelClass} key={key}>{label}<input required={key !== "expiry_date" && key !== "batch_no"} type={key === "expiry_date" ? "date" : key === "price" || key === "mrp" || key === "stock_qty" ? "number" : "text"} min={key === "price" || key === "mrp" || key === "stock_qty" ? "0" : undefined} step={key === "price" || key === "mrp" ? "0.01" : undefined} className={fieldClass} placeholder={placeholder} value={variant[key]} onChange={(event) => setProductEditor({ ...productEditor, variants: productEditor.variants.map((item, row) => row === index ? { ...item, [key]: event.target.value } : item) })} /></label>
                    ))}
                    <button type="button" aria-label={`Remove pack ${index + 1}`} className="self-end rounded-xl p-2.5 text-chili-600 hover:bg-chili-50" onClick={() => setProductEditor({ ...productEditor, variants: productEditor.variants.filter((_, row) => row !== index) })}><TrashIcon className="size-4" /></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-paper-200 pt-4 sm:flex-row sm:justify-end">
              <button type="button" className={secondaryButton} onClick={() => setProductEditor(null)}>Cancel</button>
              <button type="submit" className={primaryButton} disabled={busy}>{busy ? "Saving…" : "Save product"}</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {categoryEditor ? (
        <Modal title={categoryEditor === "new" ? "Add category" : "Edit category"} onClose={() => setCategoryEditor(null)}>
          <form onSubmit={saveCategory} className="space-y-4">
            <label className={labelClass}>Name<input name="name" required defaultValue={categoryEditor === "new" ? "" : categoryEditor.name} className={fieldClass} /></label>
            <label className={labelClass}>Slug<input name="slug" required defaultValue={categoryEditor === "new" ? "" : categoryEditor.slug} className={fieldClass} /></label>
            <label className={labelClass}>Category type<select name="type" defaultValue={categoryEditor === "new" ? "product_type" : categoryEditor.type} className={fieldClass}><option value="product_type">Product type</option><option value="region">Region</option><option value="dish">Dish</option><option value="collection">Collection</option></select></label>
            <label className={labelClass}>Description<textarea name="description" rows={3} defaultValue={categoryEditor === "new" ? "" : categoryEditor.description ?? ""} className={fieldClass} /></label>
            <div className="flex justify-end gap-2"><button type="button" className={secondaryButton} onClick={() => setCategoryEditor(null)}>Cancel</button><button type="submit" className={primaryButton} disabled={busy}>Save category</button></div>
          </form>
        </Modal>
      ) : null}

      {couponEditor ? (
        <Modal title={couponEditor === "new" ? "Create promotion" : "Edit promotion"} onClose={() => setCouponEditor(null)}>
          <form onSubmit={saveCoupon} className="space-y-4">
            {(() => {
              const draft = couponEditor === "new" ? newCoupon() : {
                code: couponEditor.code,
                label: couponEditor.label,
                kind: couponEditor.kind === "combo" ? "buy_x_get_y" as const : couponEditor.kind,
                minimum_order: String(couponEditor.minimum_order),
                discount: String(couponEditor.percentage ?? couponEditor.fixed_amount ?? couponEditor.buy_quantity ?? ""),
                max_discount: couponEditor.max_discount == null ? "" : String(couponEditor.max_discount),
                buy_quantity: String(couponEditor.buy_quantity ?? 2),
                free_quantity: String(couponEditor.free_quantity ?? 1),
                eligible_terms: couponEditor.eligible_terms?.join(", ") ?? "",
                active_from: couponEditor.active_from ?? "",
                active_until: couponEditor.active_until ?? "",
                is_active: couponEditor.is_active,
                first_order_only: couponEditor.first_order_only,
              };
              return (
                <>
                  <label className={labelClass}>Code<input name="code" required defaultValue={draft.code} className={fieldClass} /></label>
                  <label className={labelClass}>Offer title (optional)<input name="label" defaultValue={draft.label} className={fieldClass} placeholder="e.g. 10% off your order" /></label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={labelClass}>Offer type<select name="kind" value={couponKind} onChange={(event) => setCouponKind(event.target.value as AdminCoupon["kind"])} className={fieldClass}><option value="percentage">Percentage off</option><option value="fixed">Amount off</option><option value="buy_x_get_y">Buy X, get Y free</option></select></label>
                    {couponKind === "buy_x_get_y" ? (
                      <>
                        <label className={labelClass}>Buy quantity<input name="buy_quantity" required min="1" type="number" step="1" defaultValue={draft.buy_quantity} className={fieldClass} /></label>
                        <label className={labelClass}>Free quantity<input name="free_quantity" required min="1" type="number" step="1" defaultValue={draft.free_quantity} className={fieldClass} /></label>
                        <label className={`${labelClass} sm:col-span-2`}>Eligible product or dish<input name="eligible_terms" required defaultValue={draft.eligible_terms} className={fieldClass} placeholder="e.g. biryani" /><span className="mt-1 block font-normal text-ink-400">Separate multiple terms with commas.</span></label>
                      </>
                    ) : (
                      <label className={labelClass}>{couponKind === "percentage" ? "Discount (%)" : "Discount (₹)"}<input name="discount" required min="0.01" max={couponKind === "percentage" ? "100" : undefined} type="number" step="0.01" defaultValue={draft.discount} className={fieldClass} /></label>
                    )}
                    <label className={labelClass}>Minimum order (₹)<input name="minimum_order" min="0" type="number" step="0.01" defaultValue={draft.minimum_order} className={fieldClass} /></label>
                    <label className="flex items-center gap-2 text-sm font-medium text-ink-700"><input name="is_active" type="checkbox" defaultChecked={draft.is_active} className="size-4 accent-masala-700" /> Offer is active</label>
                  </div>
                  <details className="rounded-xl border border-paper-200 px-4 py-3">
                    <summary className="cursor-pointer text-sm font-semibold text-ink-700">Optional settings</summary>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className={labelClass}>Maximum discount (₹)<input name="max_discount" min="0" type="number" step="0.01" defaultValue={draft.max_discount} className={fieldClass} /></label>
                      <label className="flex items-center gap-2 text-sm font-medium text-ink-700"><input name="first_order_only" type="checkbox" defaultChecked={draft.first_order_only} className="size-4 accent-masala-700" /> First order only</label>
                      <label className={labelClass}>Starts<input name="active_from" type="date" defaultValue={draft.active_from} className={fieldClass} /></label>
                      <label className={labelClass}>Ends<input name="active_until" type="date" defaultValue={draft.active_until} className={fieldClass} /></label>
                    </div>
                  </details>
                  <div className="flex justify-end gap-2 border-t border-paper-200 pt-4"><button type="button" className={secondaryButton} onClick={() => setCouponEditor(null)}>Cancel</button><button type="submit" className={primaryButton} disabled={busy}>Save promotion</button></div>
                </>
              );
            })()}
          </form>
        </Modal>
      ) : null}

      {activeOrder ? (
        <Modal title={`Order ${activeOrder.order_number}`} onClose={() => setActiveOrder(null)} wide>
          <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
            <div>
              <div className="rounded-2xl bg-paper-100 p-4">
                <h3 className="font-semibold text-ink-900">{activeOrder.customer_name}</h3>
                <p className="mt-1 text-sm text-ink-600">{activeOrder.phone}{activeOrder.email ? ` · ${activeOrder.email}` : ""}</p>
                <p className="mt-2 text-sm text-ink-600">{[activeOrder.address_line, activeOrder.city, activeOrder.state, activeOrder.postal_code].filter(Boolean).join(", ")}</p>
                <p className="mt-2 text-xs text-ink-500">Placed {new Date(activeOrder.created_at).toLocaleString()} · Payment {displayStatus(activeOrder.payment_status ?? "pending_offline")}</p>
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-ink-900">Line items · {amount(activeOrder.total)}</h3>
                <div className="mt-2 space-y-2">
                    {products.length > 0 ? (
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                        <label className="sr-only" htmlFor="order-add-product">Add a product to this order</label>
                        <select id="order-add-product" className={`${fieldClass} mt-0`} value={productToAdd} onChange={(event) => setProductToAdd(event.target.value)}>
                          <option value="">Add a product…</option>
                          {products.filter((product) => product.status === "active").map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                        </select>
                        <button type="button" className={secondaryButton} disabled={!productToAdd} onClick={() => {
                          const product = products.find((candidate) => candidate.id === productToAdd);
                          if (!product) return;
                          const variant = product.variants[0];
                          setActiveOrder({
                            ...activeOrder,
                            items: [...activeOrder.items, {
                              product_id: product.id,
                              variant_id: variant?.id ?? null,
                              name: product.name,
                              pack_size: variant?.pack_size ?? "Standard",
                              price: variant?.price ?? product.price,
                              qty: 1,
                            }],
                          });
                          setProductToAdd("");
                        }}><PlusIcon className="size-4" />Add item</button>
                      </div>
                    ) : null}
                    {activeOrder.items.map((item, index) => (
                      <div key={`${item.product_id}-${item.variant_id ?? index}`} className="grid grid-cols-[1fr_5rem_auto] items-center gap-3 rounded-xl border border-paper-200 px-3 py-2.5">
                        <span className="min-w-0"><span className="block truncate text-sm font-medium text-ink-800">{item.name}</span><span className="text-xs text-ink-400">{item.pack_size ?? "Standard"} · {amount(item.price)}</span></span>
                        <label className="text-xs text-ink-500">Qty<input aria-label={`Quantity of ${item.name}`} type="number" min="1" max="20" className={`${fieldClass} mt-1 py-1.5`} value={item.qty} onChange={(event) => setActiveOrder({ ...activeOrder, items: activeOrder.items.map((line, row) => row === index ? { ...line, qty: Number(event.target.value) } : line) })} /></label>
                        <span className="flex items-center gap-1 text-sm font-semibold text-ink-800">{amount(item.price * item.qty)}<button type="button" aria-label={`Remove ${item.name}`} className="rounded-lg p-1.5 text-chili-600 hover:bg-chili-50" onClick={() => setActiveOrder({ ...activeOrder, items: activeOrder.items.filter((_, row) => row !== index) })}><TrashIcon className="size-4" /></button></span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <label className={labelClass}>Order status<select className={fieldClass} value={activeOrder.status} onChange={(event) => setActiveOrder({ ...activeOrder, status: event.target.value as AdminOrder["status"] })}>{[activeOrder.status, NEXT_ORDER_STAGE[activeOrder.status]].filter((status): status is AdminOrder["status"] => Boolean(status)).map((status) => <option key={status} value={status}>{displayStatus(status)}</option>)}</select></label>
              {activeOrder.status === "shipped" ? (
                <>
                  <label className={labelClass}>
                    Courier partner{originalOrderStatus === "processing" ? <span className="ml-1 text-chili-700">(required)</span> : null}
                    <input
                      className={fieldClass}
                      maxLength={120}
                      required={originalOrderStatus === "processing"}
                      value={activeOrder.courier_partner ?? ""}
                      onChange={(event) => setActiveOrder({ ...activeOrder, courier_partner: event.target.value })}
                      placeholder="e.g. India Post, Blue Dart"
                    />
                  </label>
                  <label className={labelClass}>
                    Tracking ID{originalOrderStatus === "processing" ? <span className="ml-1 text-chili-700">(required)</span> : null}
                    <input
                      className={fieldClass}
                      maxLength={128}
                      required={originalOrderStatus === "processing"}
                      value={activeOrder.tracking_id ?? ""}
                      onChange={(event) => setActiveOrder({ ...activeOrder, tracking_id: event.target.value })}
                      placeholder="Shipment tracking number"
                    />
                  </label>
                </>
              ) : null}
              <label className={labelClass}>Admin note<textarea rows={3} className={fieldClass} placeholder="Internal order note…" value={activeOrder.admin_note ?? ""} onChange={(event) => setActiveOrder({ ...activeOrder, admin_note: event.target.value })} /></label>
              <p className="rounded-xl border border-saffron-200 bg-saffron-50 p-3 text-xs leading-relaxed text-ink-700">
                The customer receives an email when the order enters each stage. Courier and tracking details are included when it ships.
              </p>
              <button type="button" className={`${primaryButton} w-full`} disabled={busy} onClick={() => void updateOrder()}>{busy ? "Saving…" : "Save order review"}</button>
            </div>
          </div>
        </Modal>
      ) : null}

      {adminManagerOpen ? (
        <Modal title="Administrator accounts" onClose={() => setAdminManagerOpen(false)}>
          <p className="text-sm text-ink-500">
            Each account has the same full administrator access. Passwords are stored as salted hashes.
          </p>
          <div className="mt-4 divide-y divide-paper-100 rounded-2xl border border-paper-200 bg-white">
            {adminAccounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span>
                  <span className="block text-sm font-semibold text-ink-900">{account.email}</span>
                  <span className="text-xs text-ink-400">Added {new Date(account.created_at).toLocaleDateString()}</span>
                </span>
                <span className={`chip ${account.is_active ? "border-cardamom-200 bg-cardamom-50 text-cardamom-700" : "border-chili-100 bg-chili-50 text-chili-700"}`}>
                  {account.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
          <form onSubmit={addAdmin} className="mt-6 space-y-4 border-t border-paper-200 pt-5">
            <div>
              <h3 className="font-display text-lg font-semibold text-ink-950">Register another admin</h3>
              <p className="text-xs text-ink-500">Use a unique email and a password of at least 12 characters.</p>
            </div>
            <label className={labelClass}>Email address<input type="email" autoComplete="email" required className={fieldClass} value={newAdminEmail} onChange={(event) => setNewAdminEmail(event.target.value)} /></label>
            <label className={labelClass}>Temporary password<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required className={fieldClass} value={newAdminPassword} onChange={(event) => setNewAdminPassword(event.target.value)} /></label>
            {adminRegistrationError ? <p role="alert" className="text-sm text-chili-700">{adminRegistrationError}</p> : null}
            {adminRegistrationNotice ? <p role="status" className="text-sm text-cardamom-700">{adminRegistrationNotice}</p> : null}
            <div className="flex justify-end gap-2">
              <button type="button" className={secondaryButton} onClick={() => setAdminManagerOpen(false)}>Close</button>
              <button type="submit" className={primaryButton} disabled={busy}>{busy ? "Registering…" : "Register admin"}</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function Overview({
  analytics,
  orders,
  products,
  reviews,
  onOpenOrders,
  onSelectOrder,
}: {
  analytics: AnalyticsReport;
  orders: AdminOrder[];
  products: AdminProduct[];
  reviews: AdminReview[];
  onOpenOrders: () => void;
  onSelectOrder: (order: AdminOrder) => void;
}) {
  const pending = orders.filter((order) => order.status === "placed" || order.status === "processing");
  const lowStock = products.flatMap((product) => product.variants).filter((variant) => variant.stock_qty <= 5).length;
  const kpis = [
    { label: "Gross sales", value: formatShortINR(analytics.total_revenue), note: "From recorded orders", Icon: TagIcon },
    { label: "Orders", value: String(analytics.orders_count), note: `${pending.length} need review`, Icon: BagIcon },
    { label: "Average order", value: formatINR(analytics.avg_order_value), note: "Average basket value", Icon: TruckIcon },
    { label: "Repeat purchase", value: `${(analytics.repeat_purchase_rate * 100).toFixed(1)}%`, note: "Returning customers", Icon: RefreshIcon },
  ];

  return (
    <div className="mt-7 space-y-6">
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, note, Icon }) => (
          <li key={label} className="rounded-2xl border border-paper-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold tracking-wider text-ink-500 uppercase">
              {label}<Icon className="size-4 text-masala-700" />
            </div>
            <p className="mt-3 font-display text-3xl font-semibold text-ink-950">{value}</p>
            <p className="mt-1 text-xs text-ink-400">{note}</p>
          </li>
        ))}
      </ul>
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-paper-200 bg-white p-5 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div><p className="eyebrow">Action needed</p><h2 className="mt-1 font-display text-xl font-semibold text-ink-950">Order review queue</h2></div>
            <button type="button" className="text-sm font-semibold text-masala-700 hover:text-masala-900" onClick={onOpenOrders}>All orders <ArrowRightIcon className="inline size-4" /></button>
          </div>
          {pending.length ? (
            <div className="mt-4 divide-y divide-paper-100">
              {pending.slice(0, 5).map((order) => (
                <button type="button" key={order.id} onClick={() => onSelectOrder(order)} className="flex w-full items-center justify-between gap-4 py-3 text-left hover:bg-paper-50">
                  <span><span className="block text-sm font-semibold text-ink-900">{order.order_number} · {order.customer_name}</span><span className="text-xs text-ink-400">{order.item_count} items · {displayStatus(order.status)}</span></span>
                  <span className="font-display font-semibold text-ink-950">{amount(order.total)}</span>
                </button>
              ))}
            </div>
          ) : <p className="mt-5 text-sm text-ink-500">No orders need review right now.</p>}
        </section>
        <section className="rounded-2xl border border-paper-200 bg-white p-5 shadow-xs">
          <p className="eyebrow">Inventory health</p><h2 className="mt-1 font-display text-xl font-semibold text-ink-950">Catalog at a glance</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-paper-100 p-4"><p className="text-xs text-ink-500">Products</p><p className="mt-1 font-display text-2xl font-semibold">{products.length}</p></div>
            <div className="rounded-xl bg-chili-50 p-4"><p className="text-xs text-chili-700">Low stock packs</p><p className="mt-1 font-display text-2xl font-semibold text-chili-700">{lowStock}</p></div>
            <div className="rounded-xl bg-paper-100 p-4"><p className="text-xs text-ink-500">Reviews to moderate</p><p className="mt-1 font-display text-2xl font-semibold">{reviews.filter((review) => review.status === "pending").length}</p></div>
            <div className="rounded-xl bg-paper-100 p-4"><p className="text-xs text-ink-500">Total pack sizes</p><p className="mt-1 font-display text-2xl font-semibold">{products.reduce((count, product) => count + product.variants.length, 0)}</p></div>
          </div>
        </section>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <MiniBreakdown title="Sales by category" items={analytics.sales_by_category} />
        <MiniBreakdown title="Sales by region" items={analytics.sales_by_region} />
        <MiniBreakdown title="Top SKUs" items={analytics.top_skus.map((item) => ({ name: item.sku, revenue: item.revenue }))} />
      </div>
    </div>
  );
}

function OrdersTable({ orders, onSelect }: { orders: AdminOrder[]; onSelect: (order: AdminOrder) => void }) {
  if (!orders.length) return <EmptyPanel>No orders found</EmptyPanel>;
  return (
    <div className="overflow-hidden rounded-2xl border border-paper-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[740px] text-left text-sm">
          <thead className="bg-paper-100 text-[0.68rem] font-bold tracking-wider text-ink-500 uppercase">
            <tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Placed</th><th className="px-4 py-3"><span className="sr-only">Review</span></th></tr>
          </thead>
          <tbody className="divide-y divide-paper-100">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-paper-50">
                <td className="px-4 py-3.5 font-semibold text-ink-900">{order.order_number}</td>
                <td className="px-4 py-3.5"><span className="block font-medium">{order.customer_name}</span><span className="text-xs text-ink-400">{order.phone}</span></td>
                <td className="px-4 py-3.5 text-ink-600">{order.item_count}</td>
                <td className="px-4 py-3.5 font-semibold">{amount(order.total)}</td>
                <td className="px-4 py-3.5"><span className="chip">{displayStatus(order.status)}</span></td>
                <td className="px-4 py-3.5 text-ink-500">{new Date(order.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3.5"><button type="button" className="text-sm font-semibold text-masala-700 hover:underline" onClick={() => onSelect(order)}>Review</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductsTable({
  products,
  onEdit,
  onDelete,
}: {
  products: AdminProduct[];
  onEdit: (product: AdminProduct) => void;
  onDelete: (product: AdminProduct) => void;
}) {
  if (!products.length) return <EmptyPanel>No products found</EmptyPanel>;
  return (
    <div className="overflow-hidden rounded-2xl border border-paper-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-paper-100 text-[0.68rem] font-bold tracking-wider text-ink-500 uppercase"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Variants</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody className="divide-y divide-paper-100">
            {products.map((product) => {
              const stock = product.variants.reduce((count, variant) => count + variant.stock_qty, 0);
              return (
                <tr key={product.id} className="hover:bg-paper-50">
                  <td className="px-4 py-3.5"><span className="block font-semibold text-ink-900">{product.name}</span><span className="text-xs text-ink-400">{product.variants.map((variant) => variant.sku).join(", ") || product.slug}</span></td>
                  <td className="px-4 py-3.5 text-ink-600">{product.categories.join(", ") || "—"}</td>
                  <td className="px-4 py-3.5 text-ink-600">{product.variants.length}</td>
                  <td className={`px-4 py-3.5 font-semibold ${stock <= 5 ? "text-chili-700" : "text-ink-700"}`}>{stock} units</td>
                  <td className="px-4 py-3.5 font-semibold">{amount(product.price)}</td>
                  <td className="px-4 py-3.5"><span className="chip">{displayStatus(product.status)}</span></td>
                  <td className="px-4 py-3.5"><div className="flex items-center gap-2"><button type="button" className="text-sm font-semibold text-masala-700 hover:underline" onClick={() => onEdit(product)}>Edit</button><button type="button" className="rounded-lg p-1.5 text-chili-600 hover:bg-chili-50" aria-label={`Delete ${product.name}`} onClick={() => onDelete(product)}><TrashIcon className="size-4" /></button></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MiniBreakdown({ title, items }: { title: string; items: { name: string; revenue: number }[] }) {
  const max = Math.max(1, ...items.map((item) => item.revenue));
  return (
    <section className="rounded-2xl border border-paper-200 bg-white p-5 shadow-xs">
      <h2 className="font-display text-lg font-semibold text-ink-950">{title}</h2>
      {items.length ? <ul className="mt-4 space-y-3">{items.slice(0, 5).map((item) => (
        <li key={item.name}>
          <div className="flex justify-between gap-3 text-xs"><span className="truncate text-ink-700">{item.name}</span><span className="shrink-0 font-semibold text-ink-900">{formatShortINR(item.revenue)}</span></div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-100"><div className="h-full rounded-full bg-masala-500" style={{ width: `${Math.max(2, (item.revenue / max) * 100)}%` }} /></div>
        </li>
      ))}</ul> : <p className="mt-4 text-sm text-ink-400">No sales data available.</p>}
    </section>
  );
}

function Analytics({ analytics }: { analytics: AnalyticsReport }) {
  return (
    <div className="mt-7 space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Revenue", formatINR(analytics.total_revenue)],
          ["Orders", String(analytics.orders_count)],
          ["Average order", formatINR(analytics.avg_order_value)],
          ["Repeat purchase rate", `${(analytics.repeat_purchase_rate * 100).toFixed(1)}%`],
        ].map(([label, value]) => <div key={label} className="rounded-2xl border border-paper-200 bg-white p-5 shadow-xs"><p className="text-xs font-bold tracking-wide text-ink-500 uppercase">{label}</p><p className="mt-2 font-display text-2xl font-semibold text-ink-950">{value}</p></div>)}
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <MiniBreakdown title="Sales by category" items={analytics.sales_by_category} />
        <MiniBreakdown title="Sales by region" items={analytics.sales_by_region} />
        <MiniBreakdown title="Sales by dish type" items={analytics.sales_by_dish_type} />
        <section className="rounded-2xl border border-paper-200 bg-white p-5 shadow-xs">
          <h2 className="font-display text-lg font-semibold text-ink-950">Top SKUs</h2>
          {analytics.top_skus.length ? <ul className="mt-4 divide-y divide-paper-100">{analytics.top_skus.map((item, index) => <li key={item.sku} className="flex items-center justify-between gap-4 py-3"><span className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-saffron-100 text-xs font-bold text-ink-700">{index + 1}</span><span><span className="block font-mono text-sm font-semibold text-ink-900">{item.sku}</span><span className="text-xs text-ink-400">{item.quantity} units sold</span></span></span><span className="font-semibold text-ink-800">{formatINR(item.revenue)}</span></li>)}</ul> : <p className="mt-4 text-sm text-ink-400">No sales data available.</p>}
        </section>
      </div>
    </div>
  );
}
