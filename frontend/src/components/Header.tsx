"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { getCategories } from "@/lib/api";
import type { ActiveOffer, Category } from "@/lib/types";
import { cn } from "@/lib/cn";
import { apiClient } from "@/lib/http";
import { selectCount, useCartHydrated, useCartStore } from "@/store/cart";
import { useUIStore } from "@/store/ui";
import {
  BagIcon,
  ChevronDownIcon,
  CloseIcon,
  MenuIcon,
  SearchIcon,
  ArrowRightIcon,
  PhoneIcon,
  HeartIcon,
} from "@/components/ui/icons";
import { useWatchlistHydrated, useWatchlistStore } from "@/store/watchlist";

const STATIC_NAV = [
  { label: "Recipes", href: "/recipes" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/pages/about" },
  { label: "Contact", href: "/pages/contact" },
];

function ShopMenuColumn({
  title,
  items,
}: {
  title: string;
  items: Pick<Category, "name" | "slug">[];
}) {
  return (
    <div>
      <p className="mb-4 text-[0.7rem] font-bold tracking-[0.16em] text-ink-500 uppercase">
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((category) => (
          <li key={category.slug}>
            <Link
              href={`/collections/${category.slug}`}
              className="flex rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-paper-100 hover:text-masala-700"
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Header() {
  const pathname = usePathname();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [promotions, setPromotions] = useState<ActiveOffer[]>([]);
  const [announcement, setAnnouncement] = useState(0);

  const collectionsRef = useRef<HTMLDivElement>(null);
  const shopCloseTimeout = useRef<number | null>(null);

  const openSearch = useUIStore((s) => s.openSearch);
  const openCart = useUIStore((s) => s.openCart);
  const lines = useCartStore((s) => s.lines);
  const hydrated = useCartHydrated();
  const cartCount = hydrated ? selectCount(lines) : 0;
  const watchlistSlugs = useWatchlistStore((s) => s.slugs);
  const watchlistHydrated = useWatchlistHydrated();
  const watchlistCount = watchlistHydrated ? watchlistSlugs.length : 0;

  /* ---- scroll shadow ---- */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ---- categories for the Collections menu ---- */
  useEffect(() => {
    let cancelled = false;
    getCategories()
      .then((items) => {
        if (!cancelled) setCategories(items);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- database-backed offer announcement ---- */
  useEffect(() => {
    let cancelled = false;
    void apiClient
      .get<ActiveOffer[]>("/api/coupons/active")
      .then(({ data }) => {
        if (!cancelled) setPromotions(data);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          console.error("Active promotions could not be loaded.", error);
          setPromotions([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (promotions.length < 2) {
      return;
    }
    const id = window.setInterval(
      () => setAnnouncement((i) => (i + 1) % promotions.length),
      5000,
    );
    return () => window.clearInterval(id);
  }, [promotions.length]);

  /* ---- close overlays on navigation ---- */
  useEffect(() => {
    setMobileOpen(false);
    setCollectionsOpen(false);
  }, [pathname]);

  /* ---- body scroll lock ---- */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  /* ---- click outside / Escape for the Collections menu ---- */
  useEffect(() => {
    if (!collectionsOpen) return;

    const onPointer = (event: MouseEvent) => {
      if (!collectionsRef.current?.contains(event.target as Node))
        setCollectionsOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCollectionsOpen(false);
    };

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [collectionsOpen]);

  useEffect(() => {
    return () => {
      if (shopCloseTimeout.current !== null) {
        window.clearTimeout(shopCloseTimeout.current);
      }
    };
  }, []);

  const shopCategories = categories.filter(
    (category) => category.type === "product_type",
  );
  const shopRegions = categories.filter(
    (category) => category.type === "region",
  );
  const shopDishes = categories.filter((category) => category.type === "dish");
  const shopCollections = categories.filter(
    (category) => category.type === "collection",
  );
  const openShopMenu = () => {
    if (shopCloseTimeout.current !== null) {
      window.clearTimeout(shopCloseTimeout.current);
      shopCloseTimeout.current = null;
    }
    setCollectionsOpen(true);
  };
  const closeShopMenu = () => {
    if (shopCloseTimeout.current !== null) {
      window.clearTimeout(shopCloseTimeout.current);
    }
    shopCloseTimeout.current = window.setTimeout(() => {
      setCollectionsOpen(false);
      shopCloseTimeout.current = null;
    }, 180);
  };
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const activeAnnouncement = promotions.length
    ? promotions[announcement % promotions.length]
    : null;

  return (
    <header className="sticky top-0 z-50">
      {/* ---------- Announcement ---------- */}
      {activeAnnouncement ? (
        <div className="relative overflow-hidden bg-ink-950 text-paper-100">
          <div className="shell flex h-9 items-center justify-center">
            <Link
              key={announcement}
              href="/cart"
              className="truncate text-center text-[0.7rem] font-medium tracking-[0.14em] uppercase animate-fade-in hover:text-saffron-300 sm:text-[0.75rem]"
              aria-label={`Offer ${activeAnnouncement.label}, code ${activeAnnouncement.code}. Go to cart to use this offer.`}
            >
              {activeAnnouncement.label} · Use code {activeAnnouncement.code}
            </Link>
          </div>
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent,rgb(242 195 107/0.16),transparent)]"
            aria-hidden="true"
          />
        </div>
      ) : null}

      {/* ---------- Main bar ---------- */}
      <div
        className={cn(
          "bg-transparent px-3 transition-all duration-300 sm:px-5",
          scrolled ? "py-2 md:py-2" : "py-3 md:py-5",
        )}
      >
        <div
          className={cn(
            "shell relative flex items-center justify-between gap-3 rounded-full bg-gradient-to-r from-[#6F2414] via-[#8B2A15] to-[#A65331] text-paper-50 transition-all duration-300",
            scrolled
              ? "min-h-11 px-2.5 shadow-xl shadow-ink-950/20 sm:px-3.5 md:min-h-13 md:px-4.5"
              : "min-h-13 px-3 shadow-lg shadow-ink-950/10 sm:px-4 md:min-h-15 md:px-5",
          )}
        >
          <Logo
            tone="dark"
            className="shrink-0 lg:absolute lg:left-1/2 lg:-translate-x-1/2"
          />

          {/* Desktop nav */}
          <nav
            aria-label="Primary"
            className="hidden items-center gap-0.5 lg:flex"
          >
            <div
              ref={collectionsRef}
              className="relative"
              onMouseEnter={openShopMenu}
              onMouseLeave={closeShopMenu}
            >
              <button
                type="button"
                aria-expanded={collectionsOpen}
                aria-haspopup="true"
                onClick={() => setCollectionsOpen((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition",
                  isActive("/collections") || collectionsOpen
                    ? "bg-white/15 text-white"
                    : "text-paper-100 hover:bg-white/10 hover:text-[#E1662F]",
                )}
              >
                Shop
                <ChevronDownIcon
                  className={cn(
                    "size-4 transition-transform duration-200",
                    collectionsOpen && "rotate-180",
                  )}
                />
              </button>

              {collectionsOpen ? (
                <div
                  className="fixed top-[7.25rem] left-1/2 w-[calc(100vw-2rem)] max-w-[64rem] -translate-x-1/2 pt-2 animate-pop"
                  onMouseEnter={openShopMenu}
                  onMouseLeave={closeShopMenu}
                >
                  <div className="grid grid-cols-2 gap-5 rounded-3xl border border-paper-200 bg-white p-5 text-ink-800 shadow-xl shadow-ink-900/15 sm:grid-cols-4 sm:gap-6 sm:p-6">
                    <ShopMenuColumn
                      title="Shop by category"
                      items={shopCategories}
                    />
                    <ShopMenuColumn
                      title="Shop by region"
                      items={shopRegions}
                    />
                    <ShopMenuColumn title="Shop by dish" items={shopDishes} />
                    <div>
                      <p className="mb-4 text-[0.7rem] font-bold tracking-[0.16em] text-ink-500 uppercase">
                        Offers &amp; collections
                      </p>
                      <ul className="space-y-1.5">
                        {shopCollections.map((category) => (
                          <li key={category.slug}>
                            <Link
                              href={`/collections/${category.slug}`}
                              className="flex rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-paper-100 hover:text-masala-700"
                            >
                              {category.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {STATIC_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm font-medium transition",
                  isActive(item.href)
                    ? "bg-white/15 text-white"
                    : "text-paper-100 hover:bg-white/10 hover:text-[#E1662F]",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={openSearch}
              aria-label="Search products and recipes"
              className="hidden items-center gap-2 rounded-full border border-white/50 bg-paper-50 py-2 pr-2 pl-3.5 text-sm text-ink-950 transition hover:bg-white md:flex"
            >
              <SearchIcon className="size-4" />
              <span>Search</span>
              <kbd className="rounded-md border border-paper-200 bg-white px-1.5 py-0.5 text-[0.65rem] font-semibold text-ink-600">
                ⌘K
              </kbd>
            </button>

            <button
              type="button"
              onClick={openSearch}
              aria-label="Search"
              className="btn btn-ghost btn-icon btn-sm md:hidden"
            >
              <SearchIcon className="size-5" />
            </button>

            <Link
              href="/order-status"
              aria-label="Track your order"
              className="hidden rounded-full bg-paper-50 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-white sm:inline-flex"
            >
              Track order
            </Link>

            <Link
              href="/watchlist"
              aria-label={watchlistCount > 0 ? `Open watchlist, ${watchlistCount} saved items` : "Open watchlist"}
              className="relative grid size-9 place-items-center rounded-full bg-paper-50 text-ink-950 transition hover:bg-white"
            >
              <HeartIcon className={cn("size-4.5", watchlistCount > 0 && "fill-masala-600 text-masala-600")} />
              <span
                aria-hidden="true"
                className={cn(
                  "absolute -top-1 -right-1 grid min-w-3.5 place-items-center rounded-full px-1 text-[0.55rem] leading-3.5 font-bold transition-all duration-300",
                  watchlistCount > 0
                    ? "scale-100 bg-masala-600 text-white"
                    : "scale-0 bg-masala-600",
                )}
              >
                {watchlistCount}
              </span>
            </Link>

            <button
              type="button"
              onClick={openCart}
              aria-label={
                cartCount > 0 ? `Open cart, ${cartCount} items` : "Open cart"
              }
              className="relative grid size-10 place-items-center rounded-full bg-paper-50 text-ink-950 transition hover:bg-white"
            >
              <BagIcon className="size-5" />
              <span
                aria-hidden="true"
                className={cn(
                  "absolute -top-1 -right-1 grid min-w-4 place-items-center rounded-full px-1 text-[0.6rem] leading-4 font-bold transition-all duration-300",
                  cartCount > 0
                    ? "scale-100 bg-saffron-400 text-ink-950"
                    : "scale-0 bg-masala-600",
                )}
              >
                {cartCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className="grid size-10 place-items-center rounded-full text-paper-50 transition hover:bg-white/10 lg:hidden"
            >
              {mobileOpen ? (
                <CloseIcon className="size-5" />
              ) : (
                <MenuIcon className="size-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Mobile drawer ---------- */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          onClick={() => setMobileOpen(false)}
          className={cn(
            "absolute inset-0 bg-ink-950/45 backdrop-blur-sm transition-opacity duration-300",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className={cn(
            "absolute inset-y-0 right-0 flex w-[min(21rem,88vw)] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out",
            mobileOpen ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b border-paper-200 px-5 py-4">
            <Logo markOnly />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="btn btn-ghost btn-icon btn-sm"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>

          <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-4 py-5">
            <p className="eyebrow px-2 pb-2">Collections</p>
            <ul className="space-y-1">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/collections/${category.slug}`}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-3 py-2.5 text-[0.95rem] font-medium transition",
                      isActive(`/collections/${category.slug}`)
                        ? "bg-masala-50 text-masala-800"
                        : "text-ink-800 hover:bg-paper-50",
                    )}
                  >
                    {category.name}
                    <ArrowRightIcon className="size-4 text-ink-300" />
                  </Link>
                </li>
              ))}
            </ul>

            <p className="eyebrow mt-6 px-2 pb-2">Explore</p>
            <ul className="space-y-1">
              {STATIC_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "block rounded-xl px-3 py-2.5 text-[0.95rem] font-medium transition",
                      isActive(item.href)
                        ? "bg-masala-50 text-masala-800"
                        : "text-ink-800 hover:bg-paper-50",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/order-status"
                  className="block rounded-xl px-3 py-2.5 text-[0.95rem] font-medium text-ink-800 transition hover:bg-paper-50"
                >
                  Track order
                </Link>
              </li>
            </ul>
          </nav>

          <div className="space-y-3 border-t border-paper-200 bg-paper-50 p-5">
            <button
              type="button"
              onClick={openCart}
              className="btn btn-primary btn-block"
            >
              <BagIcon className="size-4" />
              {cartCount > 0 ? `View cart · ${cartCount}` : "Your cart"}
            </button>
            <a href="tel:+919876543210" className="btn btn-secondary btn-block">
              <PhoneIcon className="size-4" />
              +91 98765 43210
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
