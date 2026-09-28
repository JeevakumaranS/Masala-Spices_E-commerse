# Masala House — Design System Reference

**Read this before touching any page or component.** The warm-artisanal redesign lives here.

## 1. Page structure (IMPORTANT)

`src/app/layout.tsx` renders the global shell:

```
<a class="skip-link"> → <SiteChrome /> → <Toast />
→ <main id="main-content">{children}</main>
```

`SiteChrome` renders the storefront header, overlays and footer everywhere except
under `/admin`, where the back office owns its own navigation.

Therefore, in **storefront pages**:

- ❌ Do **not** import or render `<Header />` — it is global.
- ❌ Do **not** use `<main>` — nested `<main>` is invalid. Use `<div>` or `<section>`.
- ✅ Return a fragment `<> … </>` (or a plain `<div>`), starting with a `.shell` section.

The `/admin` dashboard is a full-width exception to the storefront `.shell`
pattern. It renders inside the root `<main>` and must not add a nested `<main>`.

## 2. Page container

```html
<section class="shell py-14 md:py-20"> … </section>
```

`.shell` = `max-width 80rem`, auto margins, responsive inline padding. Use it for **every**
full-width band. Alternate bands with `bg-paper-100`, `bg-ink-950`, or gradients so the page
rhythm reads clearly.

## 3. Colour tokens (Tailwind utilities)

| Token | Use |
|---|---|
| `paper-50…400` | Warm cream surfaces. `paper-50` = page bg, `paper-100` = alt band, `paper-200` = borders |
| `ink-950…100` | Espresso text. `ink-950` headings · `ink-600` body · `ink-500` muted · `ink-400` faint |
| `masala-50…900` | Primary terracotta. **`masala-700` = primary button** |
| `saffron-50…700` | Accent / highlight. `saffron-300/400` on dark surfaces |
| `cardamom-50…700` | Positive: in-stock, success, savings |
| `chili-50…700` | Alerts, sale badges, validation errors |

Shadows: `shadow-xs … shadow-xl`, plus `shadow-glow`. All warm-tinted — prefer them over
Tailwind defaults where it matters.

## 4. Typography

Body font = **Inter** (`--font-inter`), headings = **Fraunces** (`--font-fraunces`).

Base `h1…h6` already inherit Fraunces. Helper classes:

| Class | Purpose |
|---|---|
| `.display` | Hero headline — `clamp(2.4rem → 4.5rem)` |
| `.section-title` | Section headline — `clamp(1.75rem → 2.75rem)` |
| `.lede` | Large supporting paragraph |
| `.eyebrow` | Small-caps terracotta label above titles |
| `font-display` | Apply Fraunces ad hoc (cards, prices, stat numbers) |

Never hardcode `font-family` or use `font-black` — keep weights at 500/600/700.

## 5. Buttons

```html
<button class="btn btn-primary">Add to cart</button>
<a class="btn btn-secondary btn-lg">Explore recipes</a>
<a class="btn btn-ghost btn-icon btn-sm" aria-label="Close">…</a>
```

Variants: `btn-primary` (terracotta) · `btn-dark` · `btn-secondary` (white/outline) ·
`btn-ghost` · `btn-saffron`. Sizes: `btn-sm` · `btn-lg` · `btn-block` · `btn-icon`.
Hover/active/focus/disabled states are built in — never re-specify them.

## 6. Forms

```html
<label class="field-label" for="x">Customer name</label>
<input id="x" class="input" placeholder="Your name" aria-invalid="true" />
<p class="field-error">This field is required.</p>
<p class="field-hint">Optional helper text.</p>
```

`.input` already styles hover/focus/invalid. Always: associate `<label>` via `for`/`id`,
set `aria-invalid`, and render `.field-error` for messages.

## 7. Surfaces & chips

- `.card` / `.card-hover` — white bordered tile with lift-on-hover
- `.panel` — soft `paper-100` inset block
- `.hairline` — subtle top rule
- `.chip` — small pill (metadata, filters, tags)
- `.badge-sale` — red discount badge · `.badge-accent` — saffron highlight
- `.skeleton` — shimmer placeholder
- `.grain` — adds the artisanal noise overlay (use on gradient/hero bands)

## 8. Components (all under `src/components`)

| Component | Notes |
|---|---|
| `ui/SectionHeading` | `{ eyebrow, title, description?, action?: {label, href}, align? }` — the **only** section header pattern |
| `ui/Breadcrumbs` | `{ items: {label, href?}[] }` — emits `BreadcrumbList` JSON-LD. Use on every detail page |
| `ui/Reveal` | `{ delay? }` scroll-reveal wrapper. Wrap each card/grid with staggered `delay` |
| `ui/EmptyState` | `{ eyebrow?, title, description?, action?, icon? }` — **every list needs one** |
| `ui/SmartImage` | `{ src, alt, aspect?, sizes?, priority?, zoom?, wrapperClassName? }` — **the only way to render remote images** |
| `ui/Accordion` | `{ items: [{title, content}], defaultOpen?, multiple? }` — for FAQ / PDP details |
| `ui/QuantityStepper` | `{ value, onChange, min?, max?, size?, label }` |
| `AddToCartButton` | `{ product, variant?, quantity?, appearance?: quick\|full\|dark }` — fires store + toast |
| `ProductCard` | `{ product, priority?, density?, className? }` |
| `Logo` | `{ tone?: light\|dark, markOnly? }` |
| `ui/icons` | Named SVG icon components — `className="size-4"` controls size |

## 9. State

- `store/cart.ts` — Zustand + `localStorage` persist. `useCartStore`, selectors
  (`selectCount`, `selectSubtotal`, `selectShipping`, `selectTotal`, `selectSavings`),
  promo code and delivery-mode state, and `useCartHydrated()` — **always gate persisted
  reads behind `useCartHydrated()`** to avoid hydration mismatches.
- `lib/promos.ts` — client-side promo estimates; `lib/shipping.ts` contains the
  configurable starter international destination matrix used for instant estimates.
  The backend coupon and order endpoints recalculate all discounts and shipping
  authoritatively.
- Order confirmation email/SMS/WhatsApp notifications are intentionally deferred.
  Checkout displays the order reference and routes payment confirmation through the
  admin by phone.
- `store/ui.ts` — `useUIStore` for search/cart/mobile-nav open state and `showToast(text, tone?, action?)`.

## 10. Helpers

- `lib/format.ts` — `formatINR`, `formatShortINR`, `percentOff`
- `lib/cn.ts` — `cn(...)` for conditional class names
- `lib/api.ts` — `getCategories/getProducts/getProduct/getRecipes/getRecipe` (all fail soft to `[]`/`null`)

## 11. Route-level states

`error.tsx` and `not-found.tsx` exist globally — don't recreate them unless a segment
genuinely needs its own.

**There is intentionally no root `loading.tsx`.** A `loading.tsx` (or any `Suspense`
boundary above a page) streams a `200` before the page's `notFound()` runs, so unknown
slugs would return *soft* 404s (HTTP 200 + `noindex`) instead of a real `404` status.
Real status codes win — pages render fast anyway (ISR + a local API). Loading feedback
still exists where it matters: the cart/checkout hydration skeletons (`.skeleton`),
`Reveal` entrances, and image placeholders.

For the same reason, data-driven `notFound()` also lives in `generateMetadata` on the
four dynamic routes (`/collections/[category]`, its PDP, `/recipes/[slug]`,
`/blog/[slug]`) — metadata resolves before the stream commits, guaranteeing the status
code. Page titles there must NOT append `| Masala House`; the layout template
(`%s · Masala House`) does it.

## 12. Hard rules

1. **No raw `<img>`** and no direct `next/image` for remote URLs — use `SmartImage`
   (it guards against unconfigured hosts and missing assets).
2. **No `<Header />`, no `<main>`.**
3. **Every list gets an empty state.** APIs fail soft to `[]`.
4. **Every interactive element** needs an accessible name (`aria-label`) when icon-only.
5. **Mobile first** — grids must work at 360px; test `sm:` breakpoints.
6. Respect motion: use `animate-*` utilities or `Reveal`, both already reduced-motion safe.
7. Keep `npx tsc --noEmit` clean before finishing.
