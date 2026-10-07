"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  AdminCategory,
  AdminAccount,
  AdminCoupon,
  AdminHeroImage,
  AdminOrder,
  AdminProduct,
  AdminReview,
  AdminIntegrationSettings,
  AdminOverviewResponse,
  AdminRegistrationStatus,
  AnalyticsReport,
  getAdminOverview,
  getAdminRegistrationStatus,
  adminLogin,
  adminRequest,
  registerAdmin,
  uploadHomepageMedia,
} from "@/lib/admin";
import { HomepageManagement } from "@/app/admin/HomepageManagement";
import { BlogManagement } from "@/app/admin/BlogManagement";
import { MessagesManagement } from "@/app/admin/MessagesManagement";
import { RecipesManagement } from "@/app/admin/RecipesManagement";
import { Pagination as ListPagination } from "@/components/ui/Pagination";
import { SelectField } from "@/components/ui/SelectField";
import { SmartImage } from "@/components/ui/SmartImage";
import {
  ArrowRightIcon,
  BagIcon,
  CheckCircleIcon,
  CloseIcon,
  FlameIcon,
  HomeIcon,
  LogOutIcon,
  MailIcon,
  MenuIcon,
  PackageIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  ShieldIcon,
  SparkleIcon,
  StarIcon,
  TagIcon,
  TrashIcon,
  TruckIcon,
  UtensilsIcon,
} from "@/components/ui/icons";
import { formatINR, formatShortINR } from "@/lib/format";
import { getStartingPrice } from "@/lib/productPricing";
import { uploadProductImage } from "@/services/uploadService";
import { useUIStore } from "@/store/ui";

type Section = "overview" | "orders" | "products" | "homepage" | "recipes" | "blog" | "messages" | "categories" | "campaigns" | "coupons" | "reviews" | "analytics" | "api";
type OrderFilter = "all" | "placed" | "processing" | "shipped" | "delivered";
type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};
type VariantDraft = {
  id?: string;
  pack_size: string;
  price: string;
  mrp: string;
  sku: string;
  stock_qty: string;
  batch_no: string;
  expiry_date: string;
};
type ComboCatalogProductDraft = {
  product_id: string;
  variant_id: string;
  quantity: string;
};
type ProductDraft = {
  id?: string;
  is_combo: boolean;
  name: string;
  slug: string;
  description: string;
  categories: string[];
  dish_type: string;
  status: string;
  price: string;
  mrp: string;
  spice_level: string;
  images: AdminProduct["images"];
  variants: VariantDraft[];
  combo_catalog_products: ComboCatalogProductDraft[];
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
  { id: "homepage", label: "Home page", Icon: HomeIcon },
  { id: "recipes", label: "Recipes", Icon: UtensilsIcon },
  { id: "blog", label: "Blog", Icon: SparkleIcon },
  { id: "messages", label: "Messages", Icon: MailIcon },
  { id: "categories", label: "Categories", Icon: TagIcon },
  { id: "campaigns", label: "Combos", Icon: FlameIcon },
  { id: "coupons", label: "Offers", Icon: FlameIcon },
  { id: "reviews", label: "Reviews", Icon: StarIcon },
  { id: "analytics", label: "Analytics", Icon: UtensilsIcon },
  { id: "api", label: "API & notifications", Icon: ShieldIcon },
];

const ADMIN_PAGE_SIZE = 10;
const ADMIN_CATEGORIES_PAGE_SIZE = 9;
const ORDER_FILTERS: { id: OrderFilter; label: string }[] = [
  { id: "all", label: "All orders" },
  { id: "placed", label: "New orders" },
  { id: "processing", label: "Processing" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
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
const OVERVIEW_WIDGETS = ["products", "categories", "orders", "coupons", "reviews", "hero_images", "analytics"] as const;

const fieldClass =
  "mt-1.5 block w-full min-w-0 max-w-full rounded-xl border border-paper-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none transition focus:border-masala-500 focus:ring-2 focus:ring-masala-500/15";
const labelClass = "block min-w-0 text-xs font-semibold tracking-wide text-ink-600";
const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-masala-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-masala-800 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-paper-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:border-masala-300 hover:text-masala-800 disabled:opacity-50";
const statusBadgeClass = "chip inline-flex min-w-24 shrink-0 items-center justify-center whitespace-nowrap";

function displayStatus(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function amount(value: number | undefined) {
  return formatINR(value ?? 0);
}

function formatAdminDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function subscribeAdminSession(onChange: () => void) {
  window.addEventListener("masala-admin-session", onChange);
  return () => window.removeEventListener("masala-admin-session", onChange);
}

function getAdminSession() {
  return window.sessionStorage.getItem("masala-admin-token") ?? "";
}

function EmptyPanel({ children }: { children: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-paper-300 bg-white/70 px-5 py-12 text-center">
      <p className="font-display text-xl font-semibold text-ink-800">{children}</p>
      <p className="mt-1 text-sm text-ink-500">Nothing to show yet.</p>
    </div>
  );
}

function WidgetError({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-xl border border-chili-100 bg-chili-50 p-3 text-sm text-chili-700">
      {message}
    </p>
  );
}

function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const pages = new Set<number>([1, pageCount]);
  for (let candidate = Math.max(1, page - 1); candidate <= Math.min(pageCount, page + 1); candidate += 1) {
    pages.add(candidate);
  }
  const visiblePages = [...pages].sort((left, right) => left - right);

  return (
    <nav aria-label="Pagination" className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-ink-500" aria-live="polite">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className="rounded-lg border border-paper-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 transition hover:border-masala-300 disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </button>
        {visiblePages.map((currentPage, index) => (
          <span key={currentPage} className="contents">
            {index > 0 && currentPage - visiblePages[index - 1] > 1 ? (
              <span className="px-1 text-sm text-ink-400" aria-hidden="true">…</span>
            ) : null}
            <button
              type="button"
              className={`size-9 rounded-lg border text-sm font-semibold transition ${
                currentPage === page
                  ? "border-masala-700 bg-masala-700 text-white"
                  : "border-paper-200 bg-white text-ink-700 hover:border-masala-300"
              }`}
              aria-label={`Page ${currentPage}`}
              aria-current={currentPage === page ? "page" : undefined}
              onClick={() => onPageChange(currentPage)}
            >
              {currentPage}
            </button>
          </span>
        ))}
        <button
          type="button"
          className="rounded-lg border border-paper-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 transition hover:border-masala-300 disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
        >
          Next
        </button>
      </div>
    </nav>
  );
}

function OfferCard({
  coupon,
  onEdit,
  onDelete,
}: {
  coupon: AdminCoupon;
  onEdit: (coupon: AdminCoupon) => void;
  onDelete: (coupon: AdminCoupon) => void;
}) {
  return (
    <article className="grid h-full gap-4 rounded-xl border border-paper-200 bg-white p-4 shadow-xs sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex max-w-full truncate rounded-lg bg-saffron-100 px-2.5 py-1 font-mono text-sm font-bold tracking-wider text-ink-900">
            {coupon.code}
          </span>
          <h3 className="mt-3 break-words font-semibold text-ink-900">{coupon.label}</h3>
        </div>
        <span className={`${statusBadgeClass} ${coupon.is_active ? "border-cardamom-200 bg-cardamom-50 text-cardamom-700" : "border-paper-200 bg-paper-50 text-ink-500"}`}>
          {coupon.is_active ? "Active" : "Paused"}
        </span>
      </div>

      <p className="text-sm text-ink-500">
        {displayStatus(coupon.kind)} · Minimum order {amount(coupon.minimum_order)}
      </p>

      <dl className="grid grid-cols-2 gap-3 border-y border-paper-100 py-3 text-xs">
        <div className="min-w-0">
          <dt className="font-semibold text-ink-400">Starts</dt>
          <dd className="mt-1 break-words text-ink-700">{coupon.active_from || "No start date"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="font-semibold text-ink-400">Ends</dt>
          <dd className="mt-1 break-words text-ink-700">{coupon.active_until || "No end date"}</dd>
        </div>
      </dl>

      <div className="flex items-center justify-end gap-2 self-end">
        <button type="button" className={secondaryButton} onClick={() => onEdit(coupon)}>Edit</button>
        <button type="button" className="rounded-xl p-2.5 text-chili-600 hover:bg-chili-50" aria-label={`Delete ${coupon.code}`} onClick={() => onDelete(coupon)}>
          <TrashIcon className="size-4" />
        </button>
      </div>
    </article>
  );
}

function ImageUploadField({
  id,
  title,
  hint,
  file,
  previewSrc,
  required = false,
  className = "",
  onChange,
}: {
  id: string;
  title: string;
  hint: string;
  file: File | null;
  previewSrc?: string | null;
  required?: boolean;
  className?: string;
  onChange: (file: File | null) => void;
}) {
  const fileSize = file
    ? file.size < 1024 * 1024
      ? `${Math.max(1, Math.round(file.size / 1024))} KB`
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`
    : "";

  return (
    <div className={className}>
      <p className={labelClass}>{title}</p>
      <input
        id={id}
        type="file"
        accept="image/*"
        required={required}
        className="peer sr-only"
        aria-describedby={`${id}-hint`}
        onChange={(event) => onChange(event.currentTarget.files?.[0] ?? null)}
      />
      <label
        htmlFor={id}
        className="mt-1.5 flex min-h-24 cursor-pointer items-center justify-between gap-4 rounded-xl border border-dashed border-paper-300 bg-paper-50 px-4 py-3 transition hover:border-masala-400 hover:bg-masala-50/40 peer-focus-visible:ring-2 peer-focus-visible:ring-masala-500 peer-focus-visible:ring-offset-2"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-masala-700 shadow-xs">
            <PackageIcon className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink-800">
              {file ? file.name : "Choose an image to upload"}
            </span>
            <span id={`${id}-hint`} className="mt-0.5 block truncate text-xs text-ink-500">
              {file ? `Image file · ${fileSize}` : hint}
            </span>
          </span>
        </span>
        <span className="shrink-0 rounded-lg border border-paper-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700 shadow-xs">
          {file ? "Change" : "Browse"}
        </span>
      </label>
      {previewSrc ? (
        <SmartImage
          src={previewSrc}
          alt={file?.name ?? title}
          aspect="aspect-square"
          sizes="128px"
          wrapperClassName="mt-3 w-32 rounded-xl border border-paper-200"
        />
      ) : null}
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
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-ink-950/55 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[90dvh] w-full min-w-0 max-w-full overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl border border-paper-200 bg-paper-50 p-4 shadow-2xl sm:max-h-[92vh] sm:rounded-3xl sm:p-7 ${wide ? "sm:max-w-3xl" : "sm:max-w-xl"}`}
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
  const showToast = useUIStore((state) => state.showToast);
  const [section, setSection] = useState<Section>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const [ordersPage, setOrdersPage] = useState(1);
  const [productsPage, setProductsPage] = useState(1);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [categoriesPage, setCategoriesPage] = useState(1);
  const [campaignCombosPage, setCampaignCombosPage] = useState(1);
  const [campaignOffersPage, setCampaignOffersPage] = useState(1);
  const [showAllCampaignCombos, setShowAllCampaignCombos] = useState(false);
  const [showAllCampaignOffers, setShowAllCampaignOffers] = useState(false);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [heroImages, setHeroImages] = useState<AdminHeroImage[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [categoryImageFile, setCategoryImageFile] = useState<File | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsReport>(EMPTY_ANALYTICS);
  const [analyticsError, setAnalyticsError] = useState("");
  const [overviewErrors, setOverviewErrors] = useState<Record<string, string>>({});
  const [integrationSettings, setIntegrationSettings] = useState<AdminIntegrationSettings | null>(null);
  const [integrationSettingsError, setIntegrationSettingsError] = useState("");
  const [notificationDraft, setNotificationDraft] = useState({
    sms_enabled: false,
    sms_account_sid: "",
    sms_sender_phone: "",
    email_enabled: false,
    email_sender_name: "",
    email_sender_email: "",
  });
  const [smsAuthTokenDraft, setSmsAuthTokenDraft] = useState("");
  const [emailApiKeyDraft, setEmailApiKeyDraft] = useState("");
  const [showSmsAuthToken, setShowSmsAuthToken] = useState(false);
  const [showEmailApiKey, setShowEmailApiKey] = useState(false);
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
  const [productEditor, setProductEditor] = useState<ProductDraft | null>(null);
  const [selectedProductImage, setSelectedProductImage] = useState<File | null>(null);
  const [selectedProductImagePreview, setSelectedProductImagePreview] = useState<string | null>(null);
  const [categoryEditor, setCategoryEditor] = useState<AdminCategory | null | "new">(null);
  const [couponEditor, setCouponEditor] = useState<AdminCoupon | null | "new">(null);
  const [couponKind, setCouponKind] = useState<AdminCoupon["kind"]>("percentage");
  const [activeOrder, setActiveOrder] = useState<AdminOrder | null>(null);
  const [originalOrderStatus, setOriginalOrderStatus] = useState("");
  const [comboCatalogProductToAdd, setComboCatalogProductToAdd] = useState("");

  const handleProductImageChange = useCallback((file: File | null) => {
    setSelectedProductImage(file);
    setSelectedProductImagePreview(file ? URL.createObjectURL(file) : null);
  }, []);

  useEffect(() => {
    if (!selectedProductImagePreview) return;
    return () => URL.revokeObjectURL(selectedProductImagePreview);
  }, [selectedProductImagePreview]);

  const navigateToSection = (nextSection: Section) => {
    setNotice("");
    setSection(nextSection);
    setMobileNavOpen(false);
  };

  useEffect(() => {
    if (!mobileNavOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobileNavOpen]);

  useEffect(() => {
    if (token) return;
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
  }, [token]);

  const refresh = useCallback(async (forceRefresh = false) => {
    if (!token) return;
    let overviewResponse: AdminOverviewResponse | null = null;
    let requestError = "";
    try {
      overviewResponse = await getAdminOverview(token, forceRefresh);
    } catch (error) {
      requestError = error instanceof Error ? error.message : "Unable to load overview data.";
    }

    const nextErrors: Record<string, string> = {};
    if (overviewResponse) {
      const { data, errors } = overviewResponse;
      setProducts(data.products ?? []);
      setCategories(data.categories ?? []);
      setOrders(data.orders ?? []);
      setCoupons(data.coupons ?? []);
      setReviews(data.reviews ?? []);
      setHeroImages(data.hero_images ?? []);
      setAnalytics(data.analytics ?? EMPTY_ANALYTICS);
      setAnalyticsError(errors.analytics ?? "");
      Object.assign(nextErrors, errors);
    } else {
      for (const widget of OVERVIEW_WIDGETS) nextErrors[widget] = requestError;
      setAnalyticsError(requestError);
    }

    setOverviewErrors(nextErrors);
    setLoadErrors(Object.entries(nextErrors).map(([widget, error]) => `${widget}: ${error}`));
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
        if (cancelled) return;
        setIntegrationSettings(settings);
        setNotificationDraft({
          sms_enabled: settings.sms_enabled,
          sms_account_sid: settings.sms_account_sid,
          sms_sender_phone: settings.sms_sender_phone,
          email_enabled: settings.email_enabled,
          email_sender_name: settings.email_sender_name,
          email_sender_email: settings.email_sender_email,
        });
        setSmsAuthTokenDraft(settings.sms_auth_token);
        setEmailApiKeyDraft(settings.email_api_key);
        setShowSmsAuthToken(false);
        setShowEmailApiKey(false);
        setIntegrationSettingsError("");
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
      showToast(successMessage, "success");
      await refresh(true);
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The action could not be completed.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveNotificationSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    setBusy(true);
    setNotice("");
    try {
      const settings = await adminRequest<AdminIntegrationSettings>(
        "/api/admin/integration-settings",
        token,
        {
          method: "PUT",
          body: JSON.stringify({
            ...notificationDraft,
            sms_auth_token: smsAuthTokenDraft,
            email_api_key: emailApiKeyDraft,
          }),
        },
      );
      setIntegrationSettings(settings);
      setNotificationDraft({
        sms_enabled: settings.sms_enabled,
        sms_account_sid: settings.sms_account_sid,
        sms_sender_phone: settings.sms_sender_phone,
        email_enabled: settings.email_enabled,
        email_sender_name: settings.email_sender_name,
        email_sender_email: settings.email_sender_email,
      });
      setSmsAuthTokenDraft(settings.sms_auth_token);
      setEmailApiKeyDraft(settings.email_api_key);
      setShowSmsAuthToken(false);
      setShowEmailApiKey(false);
      showToast("Notification settings saved.", "success");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Notification settings could not be saved.");
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
    try {
      await registerAdmin(newAdminEmail.trim(), newAdminPassword, { token });
      const updatedAdmins = await adminRequest<AdminAccount[]>("/api/admin/admins", token);
      setAdminAccounts(updatedAdmins);
      setNewAdminEmail("");
      setNewAdminPassword("");
      setAdminManagerOpen(false);
      showToast("Administrator account created. They can now sign in with their email and password.", "success");
    } catch (error) {
      setAdminRegistrationError(error instanceof Error ? error.message : "Admin account could not be registered.");
    } finally {
      setBusy(false);
    }
  };

  const filteredRegularProducts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return products.filter((product) => {
      if (product.is_combo) return false;
      if (!needle) return true;
      return [product.name, product.slug, ...product.categories].join(" ").toLowerCase().includes(needle);
    });
  }, [products, search]);
  const filteredComboProducts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return products.filter((product) => {
      if (!product.is_combo) return false;
      if (!needle) return true;
      return [product.name, product.slug, ...product.categories].join(" ").toLowerCase().includes(needle);
    });
  }, [products, search]);
  const comboProducts = filteredComboProducts;
  const regularProducts = products.filter((product) => !product.is_combo && product.status === "active");
  const bundleRegularPrice = productEditor
    ? productEditor.combo_catalog_products.reduce((sum, item) => {
        const product = regularProducts.find((candidate) => candidate.id === item.product_id);
        const variant = product?.variants.find((candidate) => candidate.id === item.variant_id);
        return sum + (variant?.mrp ?? 0) * Number(item.quantity || 0);
      }, 0)
    : 0;
  const roundedBundleRegularPrice = Math.round((bundleRegularPrice + Number.EPSILON) * 100) / 100;
  const filteredOrders = useMemo(() => orders.filter((order) => {
    const matchesFilter = orderFilter === "all" || order.status === orderFilter;
    const matchesSearch = `${order.order_number} ${order.customer_name} ${order.phone} ${order.status}`
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  }), [orders, orderFilter, search]);
  const activeProducts = section === "campaigns" ? comboProducts : filteredRegularProducts;
  const campaignCombos = products
    .filter((product) => product.is_combo)
    .sort((left, right) => right.id.localeCompare(left.id));
  const campaignOffers = [...coupons].sort((left, right) =>
    (right.id ?? right.code).localeCompare(left.id ?? left.code),
  );
  const currentOrdersPage = Math.min(ordersPage, Math.max(1, Math.ceil(filteredOrders.length / ADMIN_PAGE_SIZE)));
  const currentProductsPage = Math.min(productsPage, Math.max(1, Math.ceil(activeProducts.length / ADMIN_PAGE_SIZE)));
  const currentReviewsPage = Math.min(reviewsPage, Math.max(1, Math.ceil(reviews.length / ADMIN_PAGE_SIZE)));
  const currentCategoriesPage = Math.min(categoriesPage, Math.max(1, Math.ceil(categories.length / ADMIN_CATEGORIES_PAGE_SIZE)));
  const currentCampaignCombosPage = Math.min(campaignCombosPage, Math.max(1, Math.ceil(campaignCombos.length / ADMIN_PAGE_SIZE)));
  const currentCampaignOffersPage = Math.min(campaignOffersPage, Math.max(1, Math.ceil(campaignOffers.length / ADMIN_PAGE_SIZE)));
  const visibleOrders = filteredOrders.slice((currentOrdersPage - 1) * ADMIN_PAGE_SIZE, currentOrdersPage * ADMIN_PAGE_SIZE);
  const visibleProducts = activeProducts.slice((currentProductsPage - 1) * ADMIN_PAGE_SIZE, currentProductsPage * ADMIN_PAGE_SIZE);
  const visibleReviews = reviews.slice((currentReviewsPage - 1) * ADMIN_PAGE_SIZE, currentReviewsPage * ADMIN_PAGE_SIZE);
  const visibleCategories = categories.slice((currentCategoriesPage - 1) * ADMIN_CATEGORIES_PAGE_SIZE, currentCategoriesPage * ADMIN_CATEGORIES_PAGE_SIZE);
  const visibleCampaignCombos = showAllCampaignCombos
    ? campaignCombos.slice((currentCampaignCombosPage - 1) * ADMIN_PAGE_SIZE, currentCampaignCombosPage * ADMIN_PAGE_SIZE)
    : campaignCombos.slice(0, 6);
  const visibleCampaignOffers = showAllCampaignOffers
    ? campaignOffers.slice((currentCampaignOffersPage - 1) * ADMIN_PAGE_SIZE, currentCampaignOffersPage * ADMIN_PAGE_SIZE)
    : campaignOffers.slice(0, 6);

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
              : "Sign in with an administrator account to manage orders, products and offers."}
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
    const isCombo = combo || Boolean(product?.is_combo);
    handleProductImageChange(null);
    setComboCatalogProductToAdd("");
    setProductEditor(
      product
        ? {
            id: product.id,
            is_combo: isCombo,
            name: product.name,
            slug: product.slug,
            description: product.description,
            categories: product.categories,
            dish_type: product.dish_type ?? "",
            status: product.status,
            price: String(product.price ?? product.variants[0]?.price ?? ""),
            mrp: String(product.mrp ?? product.variants[0]?.mrp ?? ""),
            spice_level: product.spice_level,
            images: product.images,
            variants: product.variants.map((variant) => ({
              id: variant.id,
              pack_size: variant.pack_size,
              price: String(variant.price),
              mrp: String(variant.mrp),
              sku: variant.sku,
              stock_qty: String(variant.stock_qty),
              batch_no: variant.batch_no ?? "",
              expiry_date: variant.expiry_date ?? "",
            })),
            combo_catalog_products: (product.combo_catalog_products ?? []).map((item) => ({
              product_id: item.product_id,
              variant_id: item.variant_id,
              quantity: String(item.quantity),
            })),
          }
        : {
            is_combo: isCombo,
            name: "",
            slug: "",
            description: "",
            categories: combo
              ? [categories.find((category) => /combo|pack/i.test(`${category.slug} ${category.name}`))?.slug ?? "combos-packs"]
              : [],
            dish_type: "",
            status: "active",
            price: "",
            mrp: "",
            spice_level: "mild",
            images: [],
            variants: isCombo ? [] : [{ pack_size: "", price: "", mrp: "", sku: "", stock_qty: "0", batch_no: "", expiry_date: "" }],
            combo_catalog_products: [],
          },
    );
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!productEditor) return;
    const editor = productEditor;
    const packVariants = editor.variants.filter((variant) => variant.pack_size.trim());
    if (!editor.is_combo && !packVariants.length) {
      setNotice("Add at least one pack size before saving this product.");
      return;
    }
    if (!editor.is_combo && !editor.categories.length) {
      setNotice("Choose at least one product category from the dropdown.");
      return;
    }
    if (editor.is_combo && (
      !editor.combo_catalog_products.length
      || roundedBundleRegularPrice <= Number(editor.price)
    )) {
      setNotice("Add at least one regular product and set the combo price below their combined MRP.");
      return;
    }
    const method = editor.id ? "PUT" : "POST";
    const resource = editor.is_combo ? "combos" : "products";
    const url = editor.id ? `/api/admin/${resource}/${editor.id}` : `/api/admin/${resource}`;
    const saved = await runAction(
      async () => {
        const images = editor.images.map((image) => image.object_key ?? image.url);
        const productId = editor.id ?? crypto.randomUUID();
        if (selectedProductImage) {
          const result = await uploadProductImage(selectedProductImage, productId, {
            section: editor.is_combo ? "combos" : "products",
            name: editor.slug.trim() || editor.name.trim() || productId,
          });
          if (images.length) images[0] = result.object_key;
          else images.unshift(result.object_key);
        }

        const payload = {
          id: productId,
          name: editor.name.trim(),
          slug: editor.slug.trim(),
          description: editor.description.trim(),
          categories: editor.categories,
          status: editor.status,
          spice_level: editor.spice_level,
          ...(editor.is_combo ? {
            price: Number(editor.price),
            mrp: roundedBundleRegularPrice,
            dish_type: editor.dish_type.trim() || null,
            combo_catalog_products: editor.combo_catalog_products.map((item) => ({
              product_id: item.product_id,
              variant_id: item.variant_id,
              quantity: Number(item.quantity),
            })),
          } : {}),
          images,
          variants: editor.is_combo ? [] : packVariants.map((variant) => ({
            ...(variant.id ? { id: variant.id } : {}),
            pack_size: variant.pack_size.trim(),
            price: Number(variant.price),
            mrp: Number(variant.mrp),
            sku: variant.sku.trim(),
            stock_qty: Number(variant.stock_qty),
            batch_no: variant.batch_no.trim() || null,
            expiry_date: variant.expiry_date || null,
          })),
        };
        await adminRequest(url, token, { method, body: JSON.stringify(payload) });
      },
      editor.id ? "Product updated." : "Product created.",
    );
    if (saved) {
      setProductEditor(null);
      handleProductImageChange(null);
    }
  };

  const saveCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!categoryEditor) return;
    const editor = categoryEditor;
    const id = editor !== "new" ? editor.id : undefined;
    const slug = String(form.get("slug") ?? "").trim();
    const saved = await runAction(
      async () => {
        let imageKey = editor !== "new" ? editor.image_key ?? null : null;
        if (categoryImageFile) {
          const uploaded = await uploadHomepageMedia(categoryImageFile, token, "collections", slug);
          imageKey = uploaded.image_key;
        }
        const body = {
          name: String(form.get("name") ?? "").trim(),
          slug,
          type: String(form.get("type") ?? "product_type"),
          description: String(form.get("description") ?? "").trim() || null,
          image_key: imageKey,
        };
        await adminRequest(id ? `/api/admin/categories/${id}` : "/api/admin/categories", token, {
          method: id ? "PUT" : "POST",
          body: JSON.stringify(body),
        });
      },
      id ? "Category updated." : "Category created.",
    );
    if (saved) {
      setCategoryEditor(null);
      setCategoryImageFile(null);
    }
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
      id ? "Offer updated." : "Offer created.",
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
      showToast(`Order changes saved.${mailNotice}`, "success");
      setActiveOrder(null);
      await refresh(true);
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
    if (!window.confirm(`Delete offer ${coupon.code}?`)) return;
    await runAction(
      () => adminRequest(`/api/admin/coupons/${coupon.id ?? coupon.code}`, token, { method: "DELETE" }),
      "Offer removed.",
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
    <div className="min-h-screen bg-[#f7f3ec] text-ink-900 md:grid md:grid-cols-[250px_minmax(0,1fr)]">
      <header className="sticky top-0 z-40 flex min-w-0 items-center gap-2 border-b border-[#543827] bg-[#302016] px-3 py-3 text-paper-100 shadow-md md:hidden">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open admin sections"
          aria-expanded={mobileNavOpen}
          aria-controls="mobile-admin-navigation"
          className="grid size-9 shrink-0 place-items-center rounded-xl text-paper-100 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron-300"
        >
          <MenuIcon className="size-5" />
        </button>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-base font-semibold text-white">Masala House</span>
          <span className="hidden text-[0.6rem] font-bold tracking-[0.14em] text-paper-400 uppercase min-[375px]:block">Back office</span>
        </span>
        <button
          type="button"
          onClick={() => void refresh(true)}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-paper-400/30 px-2 text-xs font-semibold text-paper-100 transition hover:bg-white/10"
          disabled={busy}
        >
          <RefreshIcon className="size-4" />
          Refresh
        </button>
        <button
          type="button"
          onClick={signOut}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-chili-400/30 bg-chili-500/15 px-2 text-xs font-semibold text-chili-100 transition hover:bg-chili-500/30"
        >
          <LogOutIcon className="size-4" />
          Sign out
        </button>
      </header>

      <div
        className={`fixed inset-0 z-50 md:hidden ${mobileNavOpen ? "visible" : "invisible pointer-events-none"}`}
        onClick={() => setMobileNavOpen(false)}
      >
        <div className={`absolute inset-0 bg-ink-950/55 transition-opacity duration-300 ${mobileNavOpen ? "opacity-100" : "opacity-0"}`} />
        <aside
          id="mobile-admin-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Admin sections"
          aria-hidden={!mobileNavOpen}
          className={`absolute inset-y-0 left-0 flex w-[min(19rem,88vw)] flex-col border-r border-paper-200/10 bg-[#302016] text-paper-100 shadow-2xl transition-transform duration-300 ease-out ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-saffron-400/15 text-saffron-300">
                <FlameIcon className="size-5" />
              </span>
              <span>
                <span className="block font-display text-lg font-semibold text-white">Masala House</span>
                <span className="block text-[0.65rem] font-bold tracking-[0.16em] text-paper-400 uppercase">Back office</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close admin sections"
              className="grid size-9 shrink-0 place-items-center rounded-xl text-paper-300 transition hover:bg-white/10 hover:text-white"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>
          <nav aria-label="Admin sections" className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {NAV.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => navigateToSection(id)}
                aria-current={section === id ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${section === id ? "bg-saffron-400 text-ink-950 shadow-md" : "text-paper-300 hover:bg-white/10 hover:text-white"}`}
              >
                <Icon className="size-[1.05rem] shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </aside>
      </div>

      <aside className="hidden border-b border-paper-200 bg-[#302016] text-paper-100 md:sticky md:top-0 md:flex md:h-screen md:min-h-0 md:self-start md:flex-col md:border-b-0 md:border-r md:px-4 md:py-6">
        <div className="flex items-center justify-between gap-4 px-2 py-1">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-saffron-400/15 text-saffron-300">
              <FlameIcon className="size-5" />
            </span>
            <span>
              <span className="block font-display text-lg font-semibold text-white">Masala House</span>
              <span className="block text-[0.65rem] font-bold tracking-[0.16em] text-paper-400 uppercase">Back office</span>
            </span>
          </div>
        </div>
        <nav aria-label="Admin sections" className="no-scrollbar mt-9 block flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-0">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => navigateToSection(id)}
              aria-current={section === id ? "page" : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${section === id ? "bg-saffron-400 text-ink-950 shadow-md" : "text-paper-300 hover:bg-white/10 hover:text-white"}`}
            >
              <Icon className="size-[1.05rem]" />
              {label}
            </button>
          ))}
        </nav>
        <button
          type="button"
          onClick={signOut}
          className="group mx-0 mb-0 mt-3 inline-flex w-full items-center gap-3 rounded-2xl border border-chili-400/30 bg-chili-500/15 px-3.5 py-3 text-left text-xs font-semibold text-chili-100 transition hover:border-chili-300/60 hover:bg-chili-500/30 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chili-300"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-chili-500/20 text-chili-100 transition group-hover:bg-chili-500/40">
            <LogOutIcon className="size-4" />
          </span>
          <span className="flex-1">Sign out</span>
          <ArrowRightIcon className="size-4 opacity-60 transition-transform group-hover:translate-x-0.5" />
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
          <div className="hidden flex-wrap items-center gap-2 md:flex">
            <button type="button" onClick={() => void refresh(true)} className={secondaryButton} disabled={busy}>
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
            analyticsError={analyticsError}
            orders={orders}
            products={products}
            reviews={reviews}
            errors={overviewErrors}
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
                <input className={`${fieldClass} mt-0 pl-9`} value={search} onChange={(event) => {
                  setSearch(event.target.value);
                  setOrdersPage(1);
                  setProductsPage(1);
                }} placeholder="Search order or customer" aria-label="Search orders" />
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
                    onClick={() => {
                      setOrderFilter(id);
                      setOrdersPage(1);
                    }}
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
            <OrdersTable orders={visibleOrders} onSelect={openOrder} />
            {filteredOrders.length ? (
              <Pagination
                page={currentOrdersPage}
                pageSize={ADMIN_CATEGORIES_PAGE_SIZE}
                total={filteredOrders.length}
                onPageChange={setOrdersPage}
              />
            ) : null}
          </section>
        ) : null}

        {section === "products" ? (
          <section className="mt-7">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink-500">
                {filteredRegularProducts.length} regular products in catalog · stock and batch details are managed per pack size.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="relative block">
                  <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" />
                  <input className={`${fieldClass} mt-0 pl-9`} value={search} onChange={(event) => {
                    setSearch(event.target.value);
                    setProductsPage(1);
                    setOrdersPage(1);
                  }} placeholder="Search products" aria-label="Search products" />
                </label>
                <button type="button" onClick={() => openProduct()} className={primaryButton}><PlusIcon className="size-4" />Add product</button>
              </div>
            </div>
            <ProductsTable products={visibleProducts} onEdit={openProduct} onDelete={async (product) => {
              const removalDetails = product.is_combo
                ? "This also removes its included-product links."
                : "This also removes its pack variants.";
              if (!window.confirm(`Delete ${product.name}? ${removalDetails}`)) return;
              const resource = product.is_combo ? "combos" : "products";
              await runAction(() => adminRequest(`/api/admin/${resource}/${product.id}`, token, { method: "DELETE" }), "Product removed.");
            }} />
            {activeProducts.length ? (
              <Pagination
                page={currentProductsPage}
                pageSize={ADMIN_PAGE_SIZE}
                total={activeProducts.length}
                onPageChange={setProductsPage}
              />
            ) : null}
          </section>
        ) : null}

        {section === "campaigns" ? (
          <section className="mt-7 space-y-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold text-ink-950">Combos</h2>
                <p className="text-sm text-ink-500">Manage combo listings and their included products.</p>
              </div>
              <button type="button" onClick={() => openProduct(undefined, true)} className={primaryButton}>
                <PlusIcon className="size-4" />Add combo
              </button>
            </div>

            <section aria-labelledby="campaign-combos-heading">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 id="campaign-combos-heading" className="font-display text-lg font-semibold text-ink-950">Combos</h3>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-ink-500">{showAllCampaignCombos ? campaignCombos.length : Math.min(6, campaignCombos.length)} of {campaignCombos.length}</span>
                  {campaignCombos.length > 6 ? (
                    <button type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-masala-700 hover:text-masala-900" aria-expanded={showAllCampaignCombos} onClick={() => { setShowAllCampaignCombos((showing) => !showing); setCampaignCombosPage(1); }}>
                      {showAllCampaignCombos ? "Recent 6" : "View all combos"}
                      <ArrowRightIcon className={`size-4 transition-transform ${showAllCampaignCombos ? "rotate-180" : ""}`} />
                    </button>
                  ) : null}
                </div>
              </div>
              {campaignCombos.length ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleCampaignCombos.map((combo) => (
                    <article key={combo.id} className="flex h-full flex-col overflow-hidden rounded-xl border border-paper-200 bg-white shadow-xs">
                      <SmartImage
                        src={combo.images[0]?.url}
                        alt={combo.name}
                        aspect="aspect-[16/9]"
                        sizes="(max-width: 640px) 100vw, 33vw"
                        zoom={false}
                      />
                      <div className="flex flex-1 flex-col gap-3 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="break-words font-semibold text-ink-900">{combo.name}</h4>
                            <p className="mt-1 break-all text-xs text-ink-400">/{combo.slug}</p>
                          </div>
                          <span className={`${statusBadgeClass} ${combo.status === "active" ? "border-cardamom-200 bg-cardamom-50 text-cardamom-700" : "border-paper-200 bg-paper-50 text-ink-500"}`}>
                            {displayStatus(combo.status)}
                          </span>
                        </div>
                        <p className="line-clamp-2 min-h-10 text-sm text-ink-600">{combo.description || "No description added."}</p>
                        <p className="text-sm font-semibold text-ink-900">
                          {amount(combo.price)} <span className="font-normal text-ink-400">· MRP {amount(combo.mrp)}</span>
                        </p>
                        <div className="mt-auto flex justify-end gap-2 border-t border-paper-100 pt-3">
                          <button type="button" className={secondaryButton} onClick={() => openProduct(combo)}>Edit</button>
                          <button
                            type="button"
                            className="rounded-xl p-2.5 text-chili-600 hover:bg-chili-50"
                            aria-label={`Delete ${combo.name}`}
                            onClick={() => {
                              if (!window.confirm(`Delete ${combo.name}? This also removes its included-product links.`)) return;
                              void runAction(() => adminRequest(`/api/admin/combos/${combo.id}`, token, { method: "DELETE" }), "Combo removed.");
                            }}
                          ><TrashIcon className="size-4" /></button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <EmptyPanel>No combos created yet</EmptyPanel>}
              {showAllCampaignCombos && campaignCombos.length > 6 ? (
                <ListPagination
                  page={currentCampaignCombosPage}
                  pageSize={ADMIN_PAGE_SIZE}
                  total={campaignCombos.length}
                  itemLabel="combos"
                  ariaLabel="Combos pagination"
                  onPageChange={setCampaignCombosPage}
                />
              ) : null}
            </section>

          </section>
        ) : null}

        {section === "homepage" ? (
          <HomepageManagement
            token={token}
            products={products}
            categories={categories}
            heroImages={heroImages}
            onRefresh={() => refresh(true)}
          />
        ) : null}

        {section === "recipes" ? <RecipesManagement token={token} /> : null}
        {section === "blog" ? <BlogManagement token={token} /> : null}
        {section === "messages" ? <MessagesManagement token={token} /> : null}

        {section === "categories" ? (
          <section className="mt-7">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-ink-500">Organize product types, regions, dishes and collections.</p>
              <button type="button" className={primaryButton} onClick={() => { setCategoryImageFile(null); setCategoryEditor("new"); }}><PlusIcon className="size-4" />Add category</button>
            </div>
            {categories.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleCategories.map((category) => (
                  <article key={category.id} className="rounded-2xl border border-paper-200 bg-white p-5 shadow-xs">
                    {category.image_url ? (
                      <SmartImage src={category.image_url} alt={category.name} aspect="aspect-[16/7]" sizes="(max-width: 640px) 100vw, 33vw" wrapperClassName="mb-4 rounded-xl" zoom={false} />
                    ) : null}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-lg font-semibold text-ink-950">{category.name}</h2>
                        <p className="mt-1 text-xs text-ink-400">/{category.slug}</p>
                      </div>
                      <span className="chip">{displayStatus(category.type)}</span>
                    </div>
                    {category.description ? <p className="mt-3 text-sm text-ink-600">{category.description}</p> : null}
                    <div className="mt-4 flex gap-2">
                      <button type="button" className={secondaryButton} onClick={() => { setCategoryImageFile(null); setCategoryEditor(category); }}>Edit</button>
                      <button type="button" className="rounded-xl p-2.5 text-chili-600 hover:bg-chili-50" aria-label={`Delete ${category.name}`} onClick={() => void removeCategory(category)}><TrashIcon className="size-4" /></button>
                    </div>
                  </article>
                ))}
              </div>
            ) : <EmptyPanel>No categories loaded</EmptyPanel>}
            {categories.length > 0 ? (
              <ListPagination
                page={currentCategoriesPage}
                pageSize={ADMIN_PAGE_SIZE}
                total={categories.length}
                itemLabel="categories"
                ariaLabel="Categories pagination"
                onPageChange={setCategoriesPage}
              />
            ) : null}
          </section>
        ) : null}

        {section === "coupons" ? (
          <section className="mt-7">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-ink-500">
                Manage coupon rules and offers shown at checkout.
              </p>
              <div className="flex items-center gap-2">
                {campaignOffers.length > 6 ? (
                  <button type="button" className={secondaryButton} aria-expanded={showAllCampaignOffers} onClick={() => { setShowAllCampaignOffers((showing) => !showing); setCampaignOffersPage(1); }}>
                    {showAllCampaignOffers ? "Recent 6" : "View all offers"}
                    <ArrowRightIcon className={`size-4 transition-transform ${showAllCampaignOffers ? "rotate-180" : ""}`} />
                  </button>
                ) : null}
                <button type="button" className={primaryButton} onClick={() => openCouponEditor("new")}><PlusIcon className="size-4" />Add offer</button>
              </div>
            </div>
            {coupons.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleCampaignOffers.map((coupon) => (
                  <OfferCard
                    key={coupon.id ?? coupon.code}
                    coupon={coupon}
                    onEdit={(offer) => openCouponEditor(offer)}
                    onDelete={(offer) => void removeCoupon(offer)}
                  />
                ))}
              </div>
            ) : <EmptyPanel>No offers loaded</EmptyPanel>}
            {showAllCampaignOffers && campaignOffers.length > 6 ? (
              <ListPagination
                page={currentCampaignOffersPage}
                pageSize={ADMIN_PAGE_SIZE}
                total={coupons.length}
                itemLabel="offers"
                ariaLabel="Offers pagination"
                onPageChange={setCampaignOffersPage}
              />
            ) : null}
          </section>
        ) : null}

        {section === "reviews" ? (
          <section className="mt-7">
            <p className="mb-4 text-sm text-ink-500">Moderate customer feedback before it appears on product pages.</p>
            {reviews.length ? (
              <div className="space-y-3">
                {visibleReviews.map((review) => (
                  <article key={review.id} className="rounded-2xl border border-paper-200 bg-white p-5 shadow-xs">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold text-ink-950">{review.reviewer_name}</h2>
                          <span className="text-saffron-600" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(Math.max(0, Math.min(review.rating, 5)))}</span>
                          <span className={statusBadgeClass}>{displayStatus(review.status)}</span>
                        </div>
                        <p className="mt-1 text-xs text-ink-400">
                          {review.product_name ?? `${review.combo_id ? "Combo" : "Product"} #${review.combo_id ?? review.product_id ?? "unknown"}`}
                          {review.created_at ? <> · <time dateTime={review.created_at}>{formatAdminDateTime(review.created_at)}</time></> : ""}
                        </p>
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
            {reviews.length ? (
              <Pagination
                page={currentReviewsPage}
                pageSize={ADMIN_PAGE_SIZE}
                total={reviews.length}
                onPageChange={setReviewsPage}
              />
            ) : null}
          </section>
        ) : null}

        {section === "analytics" ? <Analytics analytics={analytics} /> : null}
        {section === "api" ? (
          <section className="mt-7 max-w-4xl space-y-5">
            <div className="rounded-2xl border border-saffron-200 bg-saffron-50 p-4 text-sm leading-relaxed text-ink-700">
              Manage notification providers here. Provider keys are stored as plain text in the database; only admins can access this settings page. Keys are masked until revealed.
            </div>
            {integrationSettingsError ? (
              <p role="alert" className="rounded-xl border border-chili-100 bg-chili-50 px-4 py-3 text-sm text-chili-700">{integrationSettingsError}</p>
            ) : null}
            {!integrationSettings && !integrationSettingsError ? (
              <p role="status" className="text-sm text-ink-500">Loading integration settings…</p>
            ) : null}
            {integrationSettings ? (
              <form className="space-y-5" onSubmit={saveNotificationSettings}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <section className="space-y-4 rounded-2xl border border-paper-200 bg-white p-5 shadow-xs sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                      <h2 className="font-display text-xl font-semibold text-ink-950">Twilio SMS</h2>
                      <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
                        <input
                          type="checkbox"
                          checked={notificationDraft.sms_enabled}
                          onChange={(event) => setNotificationDraft((draft) => ({ ...draft, sms_enabled: event.target.checked }))}
                        />
                        Enabled
                      </label>
                    </div>
                    <p className="text-sm text-ink-600">
                      Credentials: {integrationSettings.sms_configured ? "Configured" : "Incomplete"}
                    </p>
                    <label className={labelClass} htmlFor="twilio-account-sid">
                      Account SID
                      <input
                        id="twilio-account-sid"
                        className={fieldClass}
                        value={notificationDraft.sms_account_sid}
                        onChange={(event) => setNotificationDraft((draft) => ({ ...draft, sms_account_sid: event.target.value }))}
                        autoComplete="off"
                      />
                    </label>
                    <div>
                      <label className={labelClass} htmlFor="twilio-auth-token">Auth token</label>
                      <div className="relative">
                        <input
                          id="twilio-auth-token"
                          type="text"
                          autoComplete="off"
                          className={`${fieldClass} pr-12`}
                          value={showSmsAuthToken || !smsAuthTokenDraft ? smsAuthTokenDraft : "***"}
                          readOnly={!showSmsAuthToken && Boolean(smsAuthTokenDraft)}
                          onChange={(event) => {
                            setSmsAuthTokenDraft(event.target.value);
                            setShowSmsAuthToken(true);
                          }}
                          placeholder="Enter Twilio auth token"
                        />
                        {smsAuthTokenDraft ? (
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-ink-500 hover:text-ink-900"
                            onClick={() => setShowSmsAuthToken((visible) => !visible)}
                            aria-label={showSmsAuthToken ? "Hide Twilio auth token" : "Show Twilio auth token"}
                            title={showSmsAuthToken ? "Hide key" : "Show key"}
                          >
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                              {showSmsAuthToken ? (
                                <>
                                  <path d="M3 3l18 18" />
                                  <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                                  <path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 9 4 10 7a10.8 10.8 0 01-2.6 3.6" />
                                  <path d="M6.2 6.2C3.9 7.5 2.4 9.5 2 12c1 3 5 7 10 7 1.3 0 2.5-.3 3.6-.8" />
                                </>
                              ) : (
                                <>
                                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                                  <circle cx="12" cy="12" r="3" />
                                </>
                              )}
                            </svg>
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <label className={labelClass} htmlFor="twilio-sender-phone">
                      Sender phone
                      <input
                        id="twilio-sender-phone"
                        className={fieldClass}
                        value={notificationDraft.sms_sender_phone}
                        onChange={(event) => setNotificationDraft((draft) => ({ ...draft, sms_sender_phone: event.target.value }))}
                        placeholder="+14155550123"
                      />
                    </label>
                  </section>

                  <section className="space-y-4 rounded-2xl border border-paper-200 bg-white p-5 shadow-xs sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                      <h2 className="font-display text-xl font-semibold text-ink-950">Brevo email</h2>
                      <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
                        <input
                          type="checkbox"
                          checked={notificationDraft.email_enabled}
                          onChange={(event) => setNotificationDraft((draft) => ({ ...draft, email_enabled: event.target.checked }))}
                        />
                        Enabled
                      </label>
                    </div>
                    <p className="text-sm text-ink-600">
                      Credentials: {integrationSettings.email_configured ? "Configured" : "Incomplete"}
                    </p>
                    <div>
                      <label className={labelClass} htmlFor="brevo-api-key">API key</label>
                      <div className="relative">
                        <input
                          id="brevo-api-key"
                          type="text"
                          autoComplete="off"
                          className={`${fieldClass} pr-12`}
                          value={showEmailApiKey || !emailApiKeyDraft ? emailApiKeyDraft : "***"}
                          readOnly={!showEmailApiKey && Boolean(emailApiKeyDraft)}
                          onChange={(event) => {
                            setEmailApiKeyDraft(event.target.value);
                            setShowEmailApiKey(true);
                          }}
                          placeholder="Enter Brevo API key"
                        />
                        {emailApiKeyDraft ? (
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-ink-500 hover:text-ink-900"
                            onClick={() => setShowEmailApiKey((visible) => !visible)}
                            aria-label={showEmailApiKey ? "Hide Brevo API key" : "Show Brevo API key"}
                            title={showEmailApiKey ? "Hide key" : "Show key"}
                          >
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                              {showEmailApiKey ? (
                                <>
                                  <path d="M3 3l18 18" />
                                  <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                                  <path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 9 4 10 7a10.8 10.8 0 01-2.6 3.6" />
                                  <path d="M6.2 6.2C3.9 7.5 2.4 9.5 2 12c1 3 5 7 10 7 1.3 0 2.5-.3 3.6-.8" />
                                </>
                              ) : (
                                <>
                                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                                  <circle cx="12" cy="12" r="3" />
                                </>
                              )}
                            </svg>
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <label className={labelClass} htmlFor="brevo-sender-name">
                      Sender name
                      <input
                        id="brevo-sender-name"
                        className={fieldClass}
                        value={notificationDraft.email_sender_name}
                        onChange={(event) => setNotificationDraft((draft) => ({ ...draft, email_sender_name: event.target.value }))}
                      />
                    </label>
                    <label className={labelClass} htmlFor="brevo-sender-email">
                      Sender email
                      <input
                        id="brevo-sender-email"
                        type="email"
                        className={fieldClass}
                        value={notificationDraft.email_sender_email}
                        onChange={(event) => setNotificationDraft((draft) => ({ ...draft, email_sender_email: event.target.value }))}
                      />
                    </label>
                  </section>
                </div>
                <button className={primaryButton} type="submit" disabled={busy}>
                  {busy ? "Saving…" : "Save notification settings"}
                </button>
              </form>
            ) : null}
          </section>
        ) : null}
      </div>

      {productEditor ? (
        <Modal title={productEditor.is_combo ? (productEditor.id ? "Edit combo" : "Create combo") : (productEditor.id ? "Edit product" : "Add product")} onClose={() => setProductEditor(null)} wide>
          <form onSubmit={saveProduct} className="space-y-5">
            <div className="grid min-w-0 items-start gap-x-4 gap-y-5 sm:grid-cols-2">
              <label className={labelClass}>{productEditor.is_combo ? "Combo name" : "Product name"}<input required className={fieldClass} value={productEditor.name} onChange={(event) => setProductEditor({ ...productEditor, name: event.target.value })} /></label>
              <label className={labelClass}>URL slug<input required className={fieldClass} value={productEditor.slug} onChange={(event) => setProductEditor({ ...productEditor, slug: event.target.value })} /></label>
              {productEditor.is_combo ? (
                <>
                  <label className={labelClass}>Discounted combo price (₹)<input required type="number" min="0" max={Math.max(0, bundleRegularPrice - 0.01)} step="0.01" className={fieldClass} value={productEditor.price} onChange={(event) => setProductEditor({ ...productEditor, price: event.target.value })} /></label>
                  <label className={labelClass}>Combined regular price (₹)<input readOnly className={`${fieldClass} bg-paper-100`} value={roundedBundleRegularPrice.toFixed(2)} /></label>
                </>
              ) : (
                <>
                  <div className={labelClass}>
                    <label htmlFor="product-category">Categories</label>
                    <SelectField
                      id="product-category"
                      value=""
                      onChange={(event) => {
                        const slug = event.target.value;
                        if (slug && !productEditor.categories.includes(slug)) {
                          setProductEditor({
                            ...productEditor,
                            categories: [...productEditor.categories, slug],
                          });
                        }
                      }}
                    >
                      <option value="">Choose a category…</option>
                      {categories
                        .filter((category) => !productEditor.categories.includes(category.slug))
                        .map((category) => (
                          <option key={category.id} value={category.slug}>{category.name}</option>
                        ))}
                    </SelectField>
                    {productEditor.categories.length ? (
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {productEditor.categories.map((slug) => {
                          const category = categories.find((item) => item.slug === slug);
                          return (
                            <li key={slug}>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-full border border-masala-200 bg-masala-50 px-3 py-1 text-xs font-semibold text-masala-800"
                                aria-label={`Remove ${category?.name ?? slug} category`}
                                onClick={() => setProductEditor({
                                  ...productEditor,
                                  categories: productEditor.categories.filter((item) => item !== slug),
                                })}
                              >
                                {category?.name ?? slug}<span aria-hidden="true">×</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                    {!categories.length ? (
                      <p className="mt-1 text-xs font-medium text-chili-700">No categories are available. Add a category before assigning one to a product.</p>
                    ) : null}
                  </div>
                  <label className={labelClass}>Spice level<SelectField value={productEditor.spice_level} onChange={(event) => setProductEditor({ ...productEditor, spice_level: event.target.value })}><option value="mild">Mild</option><option value="medium">Medium</option><option value="hot">Hot</option></SelectField></label>
                </>
              )}
                  <label className={labelClass}>Status<SelectField value={productEditor.status} onChange={(event) => setProductEditor({ ...productEditor, status: event.target.value })}><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></SelectField></label>
              {productEditor.is_combo ? (
                <section className="min-w-0 sm:col-span-2 rounded-2xl border border-paper-200 bg-paper-50 p-4">
                  <div className="mb-3">
                    <h3 className="font-semibold text-ink-900">Regular products in this combo</h3>
                    <p className="text-xs text-ink-500">Select at least one catalog product pack. Its regular inventory is deducted when the combo is purchased.</p>
                  </div>
                  <div>
                    <div className="rounded-xl bg-white p-3">
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <label className="sr-only" htmlFor="combo-catalog-product">Add a regular product pack</label>
                        <SelectField
                          id="combo-catalog-product"
                          wrapperClassName="mt-0 min-w-0 flex-1"
                          value={comboCatalogProductToAdd}
                          onChange={(event) => setComboCatalogProductToAdd(event.target.value)}
                        >
                          <option value="">Add a regular product pack (optional)…</option>
                          {regularProducts.flatMap((product) => product.variants.map((variant) => (
                            <option key={variant.id} value={`${product.id}:${variant.id}`}>
                              {product.name} · {variant.pack_size}
                            </option>
                          )))}
                        </SelectField>
                        <button
                          type="button"
                          className={secondaryButton}
                          disabled={!comboCatalogProductToAdd}
                          onClick={() => {
                            const [productId, variantId] = comboCatalogProductToAdd.split(":");
                            if (!productId || !variantId || productEditor.combo_catalog_products.some((item) => item.variant_id === variantId)) return;
                            setProductEditor({
                              ...productEditor,
                              combo_catalog_products: [...productEditor.combo_catalog_products, {
                                product_id: productId,
                                variant_id: variantId,
                                quantity: "1",
                              }],
                            });
                            setComboCatalogProductToAdd("");
                          }}
                        ><PlusIcon className="size-4" />Add regular product</button>
                      </div>
                      <div className="mt-3 space-y-2">
                        {productEditor.combo_catalog_products.map((item, index) => {
                          const product = regularProducts.find((candidate) => candidate.id === item.product_id);
                          const variant = product?.variants.find((candidate) => candidate.id === item.variant_id);
                          return (
                            <div key={item.variant_id} className="flex flex-wrap items-center gap-3 rounded-lg border border-paper-200 p-3">
                              <span className="min-w-0 flex-1 text-sm font-medium text-ink-800">
                                {product?.name ?? "Unavailable product"} · {variant?.pack_size ?? "Unavailable pack"} · {formatINR(variant?.mrp ?? 0)} MRP
                              </span>
                              <label className={`${labelClass} w-28`}>Quantity
                                <input
                                  type="number"
                                  min="1"
                                  max="20"
                                  step="1"
                                  className={fieldClass}
                                  value={item.quantity}
                                  onChange={(event) => setProductEditor({
                                    ...productEditor,
                                    combo_catalog_products: productEditor.combo_catalog_products.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: event.target.value } : row),
                                  })}
                                />
                              </label>
                              <button type="button" aria-label={`Remove regular product ${index + 1}`} className="rounded-xl p-2.5 text-chili-600 hover:bg-chili-50" onClick={() => setProductEditor({
                                ...productEditor,
                                combo_catalog_products: productEditor.combo_catalog_products.filter((_, rowIndex) => rowIndex !== index),
                              })}><TrashIcon className="size-4" /></button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                  <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-paper-200 pt-3 text-sm">
                    <span className="text-ink-600">Bundle savings</span>
                    <span className="font-semibold text-cardamom-700">{formatINR(Math.max(0, roundedBundleRegularPrice - Number(productEditor.price || 0)))}</span>
                  </div>
                </section>
              ) : null}
              <ImageUploadField
                id="product-image-file"
                title="Product image"
                hint="Select an image to use as the product's main image."
                file={selectedProductImage}
                previewSrc={selectedProductImagePreview ?? productEditor.images[0]?.url}
                className="sm:col-span-2"
                onChange={handleProductImageChange}
              />
              <label className={`${labelClass} sm:col-span-2`}>Description<textarea rows={3} className={fieldClass} value={productEditor.description} onChange={(event) => setProductEditor({ ...productEditor, description: event.target.value })} /></label>
            </div>
            {!productEditor.is_combo ? (
              <div>
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div><h3 className="font-semibold text-ink-900">Pack sizes, inventory & batch</h3><p className="text-xs text-ink-500">Add SKU, stock quantity, batch number and expiry date per variant.</p></div>
                <button type="button" className={`${secondaryButton} shrink-0 sm:w-auto`} onClick={() => setProductEditor({ ...productEditor, variants: [...productEditor.variants, { pack_size: "", price: "", mrp: "", sku: "", stock_qty: "0", batch_no: "", expiry_date: "" }] })}><PlusIcon className="size-4" />Add pack</button>
              </div>
              <div className="space-y-3">
                {productEditor.variants.map((variant, index) => (
                  <div key={index} className="grid min-w-0 gap-3 rounded-2xl bg-paper-100 p-3 sm:grid-cols-2 lg:grid-cols-4">
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
            ) : null}
            <div className="flex flex-col-reverse gap-2 border-t border-paper-200 pt-4 sm:flex-row sm:justify-end">
              <button type="button" className={secondaryButton} onClick={() => setProductEditor(null)}>Cancel</button>
              <button type="submit" className={primaryButton} disabled={busy}>{busy ? "Saving…" : productEditor.is_combo ? "Save combo" : "Save product"}</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {categoryEditor ? (
        <Modal title={categoryEditor === "new" ? "Add category" : "Edit category"} onClose={() => { setCategoryEditor(null); setCategoryImageFile(null); }}>
          <form onSubmit={saveCategory} className="space-y-4">
            <label className={labelClass}>Name<input name="name" required defaultValue={categoryEditor === "new" ? "" : categoryEditor.name} className={fieldClass} /></label>
            <label className={labelClass}>Slug<input name="slug" required defaultValue={categoryEditor === "new" ? "" : categoryEditor.slug} className={fieldClass} /></label>
            <label className={labelClass}>Category type<SelectField name="type" defaultValue={categoryEditor === "new" ? "product_type" : categoryEditor.type}><option value="product_type">Product type</option><option value="region">Region</option><option value="dish">Dish</option><option value="collection">Collection</option></SelectField></label>
            <label className={labelClass}>Description<textarea name="description" rows={3} defaultValue={categoryEditor === "new" ? "" : categoryEditor.description ?? ""} className={fieldClass} /></label>
            <label className={labelClass}>Collection image (stored in RustFS)
              <input type="file" accept="image/*" className={`${fieldClass} file:mr-3 file:rounded-lg file:border-0 file:bg-paper-100 file:px-3 file:py-1.5`} onChange={(event) => setCategoryImageFile(event.currentTarget.files?.[0] ?? null)} />
              {categoryImageFile ? <span className="mt-1 block text-xs text-ink-500">{categoryImageFile.name} will be used for this collection.</span> : categoryEditor !== "new" && categoryEditor.image_key ? <span className="mt-1 block text-xs text-ink-500">Leave empty to keep the current image.</span> : null}
            </label>
            {categoryEditor !== "new" && categoryEditor.image_url && !categoryImageFile ? (
              <SmartImage src={categoryEditor.image_url} alt={categoryEditor.name} aspect="aspect-[16/7]" sizes="(max-width: 640px) 100vw, 50vw" wrapperClassName="rounded-xl" zoom={false} />
            ) : null}
            <div className="flex flex-col-reverse gap-2 border-t border-paper-200 pt-4 sm:flex-row sm:justify-end"><button type="button" className={`${secondaryButton} w-full sm:w-auto`} onClick={() => { setCategoryEditor(null); setCategoryImageFile(null); }}>Cancel</button><button type="submit" className={`${primaryButton} w-full sm:w-auto`} disabled={busy}>Save category</button></div>
          </form>
        </Modal>
      ) : null}

      {couponEditor ? (
        <Modal title={couponEditor === "new" ? "Create offer" : "Edit offer"} onClose={() => setCouponEditor(null)} wide>
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
                  <div className="grid min-w-0 items-start gap-x-4 gap-y-4 sm:grid-cols-2">
                    <label className={labelClass}>Offer code<input name="code" required defaultValue={draft.code} className={fieldClass} /></label>
                    <label className={labelClass}>Offer title<input name="label" defaultValue={draft.label} className={fieldClass} placeholder="Optional display title" /></label>
                    <label className={labelClass}>Offer type<SelectField name="kind" value={couponKind} onChange={(event) => setCouponKind(event.target.value as AdminCoupon["kind"])}><option value="percentage">Percentage off</option><option value="fixed">Amount off</option><option value="buy_x_get_y">Buy X, get Y free</option></SelectField></label>
                    <label className={labelClass}>Minimum order (₹)<input name="minimum_order" min="0" type="number" step="0.01" defaultValue={draft.minimum_order} className={fieldClass} /></label>
                    {couponKind === "buy_x_get_y" ? (
                      <>
                        <label className={labelClass}>Buy quantity<input name="buy_quantity" required min="1" type="number" step="1" defaultValue={draft.buy_quantity} className={fieldClass} /></label>
                        <label className={labelClass}>Free quantity<input name="free_quantity" required min="1" type="number" step="1" defaultValue={draft.free_quantity} className={fieldClass} /></label>
                        <label className={`${labelClass} sm:col-span-2`}>Eligible product or dish<input name="eligible_terms" required defaultValue={draft.eligible_terms} className={fieldClass} placeholder="e.g. biryani" /><span className="mt-1 block font-normal text-ink-400">Separate multiple terms with commas.</span></label>
                      </>
                    ) : (
                      <label className={labelClass}>{couponKind === "percentage" ? "Discount (%)" : "Discount (₹)"}<input name="discount" required min="0.01" max={couponKind === "percentage" ? "100" : undefined} type="number" step="0.01" defaultValue={draft.discount} className={fieldClass} /></label>
                    )}
                    <label className="flex min-h-16 items-center gap-3 self-end rounded-xl border border-paper-200 bg-white px-4 py-3 text-sm font-semibold text-ink-700">
                      <input name="is_active" type="checkbox" defaultChecked={draft.is_active} className="size-4 shrink-0 accent-masala-700" /> Offer is active
                    </label>
                  </div>
                  <section className="rounded-xl border border-paper-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-ink-800">Schedule and eligibility</h3>
                    <div className="mt-3 grid min-w-0 items-start gap-4 sm:grid-cols-2">
                      <label className={labelClass}>Starts<input name="active_from" type="date" defaultValue={draft.active_from} className={fieldClass} /></label>
                      <label className={labelClass}>Ends<input name="active_until" type="date" defaultValue={draft.active_until} className={fieldClass} /></label>
                      <label className={labelClass}>Maximum discount (₹)<input name="max_discount" min="0" type="number" step="0.01" defaultValue={draft.max_discount} className={fieldClass} /></label>
                      <label className="flex min-h-16 items-center gap-3 self-end rounded-xl border border-paper-200 bg-paper-50 px-4 py-3 text-sm font-semibold text-ink-700"><input name="first_order_only" type="checkbox" defaultChecked={draft.first_order_only} className="size-4 shrink-0 accent-masala-700" /> First order only</label>
                    </div>
                  </section>
                  <div className="flex flex-col-reverse gap-2 border-t border-paper-200 pt-4 sm:flex-row sm:justify-end"><button type="button" className={`${secondaryButton} w-full sm:w-auto`} onClick={() => setCouponEditor(null)}>Cancel</button><button type="submit" className={`${primaryButton} w-full sm:w-auto`} disabled={busy}>Save offer</button></div>
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
                <p className="mt-2 text-xs text-ink-500">Placed <time dateTime={activeOrder.created_at}>{formatAdminDateTime(activeOrder.created_at)}</time> · Payment {displayStatus(activeOrder.payment_status ?? "pending_offline")}</p>
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-ink-900">Line items · {amount(activeOrder.total)}</h3>
                <div className="mt-2 space-y-2">
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
              <label className={labelClass}>Order status<SelectField value={activeOrder.status} onChange={(event) => setActiveOrder({ ...activeOrder, status: event.target.value as AdminOrder["status"] })}>{[activeOrder.status, NEXT_ORDER_STAGE[activeOrder.status]].filter((status): status is AdminOrder["status"] => Boolean(status)).map((status) => <option key={status} value={status}>{displayStatus(status)}</option>)}</SelectField></label>
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
                  <span className="text-xs text-ink-400">Added <time dateTime={account.created_at}>{formatAdminDateTime(account.created_at)}</time></span>
                </span>
                <span className={`${statusBadgeClass} ${account.is_active ? "border-cardamom-200 bg-cardamom-50 text-cardamom-700" : "border-chili-100 bg-chili-50 text-chili-700"}`}>
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
  analyticsError,
  orders,
  products,
  reviews,
  errors,
  onOpenOrders,
  onSelectOrder,
}: {
  analytics: AnalyticsReport;
  analyticsError: string;
  orders: AdminOrder[];
  products: AdminProduct[];
  reviews: AdminReview[];
  errors: Record<string, string>;
  onOpenOrders: () => void;
  onSelectOrder: (order: AdminOrder) => void;
}) {
  const pending = orders.filter((order) => order.status === "placed" || order.status === "processing");
  const lowStock = products.flatMap((product) => product.variants).filter((variant) => variant.stock_qty <= 5).length;
  const kpis = [
    { label: "Gross sales", value: formatShortINR(analytics.total_revenue), note: "From recorded orders", Icon: TagIcon, error: analyticsError },
    { label: "Orders", value: String(analytics.orders_count), note: `${pending.length} need review`, Icon: BagIcon, error: errors.orders },
    { label: "Average order", value: formatINR(analytics.avg_order_value), note: "Average basket value", Icon: TruckIcon, error: analyticsError },
    { label: "Repeat purchase", value: `${(analytics.repeat_purchase_rate * 100).toFixed(1)}%`, note: "Returning customers", Icon: RefreshIcon, error: analyticsError },
  ];

  return (
    <div className="mt-7 space-y-6">
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, note, Icon, error }) => (
          <li key={label} className="rounded-2xl border border-paper-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold tracking-wider text-ink-500 uppercase">
              {label}<Icon className="size-4 text-masala-700" />
            </div>
            {error ? <div className="mt-3"><WidgetError message={error} /></div> : (
              <>
                <p className="mt-3 font-display text-3xl font-semibold text-ink-950">{value}</p>
                <p className="mt-1 text-xs text-ink-400">{note}</p>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-paper-200 bg-white p-5 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div><p className="eyebrow">Action needed</p><h2 className="mt-1 font-display text-xl font-semibold text-ink-950">Order review queue</h2></div>
            <button type="button" className="text-sm font-semibold text-masala-700 hover:text-masala-900" onClick={onOpenOrders}>All orders <ArrowRightIcon className="inline size-4" /></button>
          </div>
          {errors.orders ? <div className="mt-4"><WidgetError message={errors.orders} /></div> : pending.length ? (
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
            <div className="rounded-xl bg-paper-100 p-4"><p className="text-xs text-ink-500">Products</p>{errors.products ? <WidgetError message={errors.products} /> : <p className="mt-1 font-display text-2xl font-semibold">{products.length}</p>}</div>
            <div className="rounded-xl bg-chili-50 p-4"><p className="text-xs text-chili-700">Low stock packs</p>{errors.products ? <WidgetError message={errors.products} /> : <p className="mt-1 font-display text-2xl font-semibold text-chili-700">{lowStock}</p>}</div>
            <div className="rounded-xl bg-paper-100 p-4"><p className="text-xs text-ink-500">Reviews to moderate</p>{errors.reviews ? <WidgetError message={errors.reviews} /> : <p className="mt-1 font-display text-2xl font-semibold">{reviews.filter((review) => review.status === "pending").length}</p>}</div>
            <div className="rounded-xl bg-paper-100 p-4"><p className="text-xs text-ink-500">Total pack sizes</p>{errors.products ? <WidgetError message={errors.products} /> : <p className="mt-1 font-display text-2xl font-semibold">{products.reduce((count, product) => count + product.variants.length, 0)}</p>}</div>
          </div>
        </section>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <MiniBreakdown title="Sales by category" items={analytics.sales_by_category} error={analyticsError} />
        <MiniBreakdown title="Sales by region" items={analytics.sales_by_region} error={analyticsError} />
        <MiniBreakdown title="Top SKUs" items={analytics.top_skus.map((item) => ({ name: item.sku, revenue: item.revenue }))} error={analyticsError} />
      </div>
    </div>
  );
}

function OrdersTable({ orders, onSelect }: { orders: AdminOrder[]; onSelect: (order: AdminOrder) => void }) {
  if (!orders.length) return <EmptyPanel>No orders found</EmptyPanel>;
  return (
    <div className="overflow-hidden rounded-2xl border border-paper-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
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
                <td className="px-4 py-3.5"><span className={statusBadgeClass}>{displayStatus(order.status)}</span></td>
                <td className="px-4 py-3.5 whitespace-nowrap text-ink-500"><time dateTime={order.created_at}>{formatAdminDateTime(order.created_at)}</time></td>
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
                  <td className="px-4 py-3.5 font-semibold">{amount(getStartingPrice(product))}</td>
                  <td className="px-4 py-3.5"><span className={statusBadgeClass}>{displayStatus(product.status)}</span></td>
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

function MiniBreakdown({
  title,
  items,
  error,
}: {
  title: string;
  items: { name: string; revenue: number }[];
  error?: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.revenue));
  return (
    <section className="rounded-2xl border border-paper-200 bg-white p-5 shadow-xs">
      <h2 className="font-display text-lg font-semibold text-ink-950">{title}</h2>
      {error ? <div className="mt-4"><WidgetError message={error} /></div> : items.length ? <ul className="mt-4 space-y-3">{items.slice(0, 5).map((item) => (
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
