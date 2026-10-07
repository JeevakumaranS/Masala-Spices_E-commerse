"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AdminCategory,
  AdminHeroImage,
  AdminProduct,
  adminRequest,
  getAdminHomepageContent,
  saveAdminHomepageContent,
  uploadAdminHeroImage,
  uploadHomepageMedia,
} from "@/lib/admin";
import type { HomepageContent, Recipe } from "@/lib/types";
import { Pagination } from "@/components/ui/Pagination";
import { SelectField } from "@/components/ui/SelectField";
import { SmartImage } from "@/components/ui/SmartImage";
import { ArrowRightIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/ui/icons";
import { formatINR } from "@/lib/format";
import { getStartingPrice } from "@/lib/productPricing";
import { useUIStore } from "@/store/ui";

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-paper-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none transition focus:border-masala-500 focus:ring-2 focus:ring-masala-500/15";
const labelClass = "block text-xs font-semibold tracking-wide text-ink-600";
const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-masala-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-masala-800 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-paper-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:border-masala-300 disabled:cursor-not-allowed disabled:opacity-50";
const RECENT_ITEMS_LIMIT = 6;
const ALL_ITEMS_PAGE_SIZE = 12;
const MAX_HERO_IMAGES = 6;

const homepageSections = [
  { id: "hero", label: "Hero" },
  { id: "ticker", label: "Announcement ticker" },
  { id: "categories", label: "Shop by category" },
  { id: "bestsellers", label: "Bestsellers" },
  { id: "combos", label: "Better value combos" },
  { id: "recipes", label: "Recipes" },
] as const;

type Props = {
  token: string;
  products: AdminProduct[];
  categories: AdminCategory[];
  heroImages: AdminHeroImage[];
  onRefresh: () => Promise<void>;
};

function SectionCard({ title, description, children }: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-paper-200 bg-white p-5 shadow-xs sm:p-6">
      <h2 className="font-display text-xl font-semibold text-ink-950">{title}</h2>
      <p className="mt-1 text-sm text-ink-500">{description}</p>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function SectionSearch({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="relative block">
      <span className="sr-only">{label}</span>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" />
      <input
        id={id}
        type="search"
        className={`${fieldClass} mt-0 pl-9`}
        placeholder={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function matchesSearch(query: string, ...values: string[]) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return !normalizedQuery || values.some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
}

function displayStatus(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function HomepageManagement({ token, products, categories, heroImages, onRefresh }: Props) {
  const showToast = useUIStore((state) => state.showToast);
  const [content, setContent] = useState<HomepageContent | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroAlt, setHeroAlt] = useState("");
  const [heroAltDrafts, setHeroAltDrafts] = useState<Record<string, string>>({});
  const [categoryToAdd, setCategoryToAdd] = useState("");
  const [tickerDraft, setTickerDraft] = useState("");
  const [activeSection, setActiveSection] = useState<(typeof homepageSections)[number]["id"]>("hero");
  const [sectionSearch, setSectionSearch] = useState<Record<string, string>>({});
  const [showAllCombos, setShowAllCombos] = useState(false);
  const [combosPage, setCombosPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      getAdminHomepageContent(token),
      adminRequest<{ items?: Recipe[] } | Recipe[]>("/api/recipes", token),
    ])
      .then(([homepageContent, recipePayload]) => {
        if (cancelled) return;
        setContent(homepageContent);
        setTickerDraft(homepageContent.ticker.join("\n"));
        setRecipes(Array.isArray(recipePayload) ? recipePayload : recipePayload.items ?? []);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Homepage settings could not be loaded.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const comboProducts = useMemo(
    () => products.filter((product) => product.is_combo).sort((left, right) => right.id.localeCompare(left.id)),
    [products],
  );
  const availableCategories = categories.filter(
    (category) => !content?.categories.items.some((item) => item.slug === category.slug),
  );
  const tickerLines = tickerDraft.split(/\r?\n/);

  const updateContent = (updater: (current: HomepageContent) => HomepageContent) => {
    setContent((current) => current ? updater(current) : current);
  };

  const setSearch = (section: string, value: string) => {
    setSectionSearch((current) => ({ ...current, [section]: value }));
    if (section === "combos") setCombosPage(1);
  };

  const updateTickerLines = (lines: string[]) => {
    setTickerDraft(lines.join("\n"));
    updateContent((current) => ({ ...current, ticker: lines }));
  };

  const updateCategory = (slug: string, patch: Partial<HomepageContent["categories"]["items"][number]>) => {
    updateContent((current) => ({
      ...current,
      categories: {
        ...current.categories,
        items: current.categories.items.map((item) => item.slug === slug ? { ...item, ...patch } : item),
      },
    }));
  };

  const uploadImage = async (file: File): Promise<{ image_key: string; image_url: string } | null> => {
    setError("");
    try {
      return await uploadHomepageMedia(file, token);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
      return null;
    }
  };

  const saveContent = async () => {
    if (!content) return;
    setSaving(true);
    setError("");
    try {
      const normalizedContent = {
        ...content,
        categories: {
          ...content.categories,
          items: content.categories.items.map((item) => ({ ...item, image_url: "" })),
        },
        combos: {
          ...content.combos,
          product_slugs: content.combos.product_slugs.filter((slug) =>
            comboProducts.some((product) => product.slug === slug),
          ).slice(0, 4),
          offer_codes: [],
        },
        recipes: {
          ...content.recipes,
          recipe_slugs: content.recipes.recipe_slugs
            .filter((slug) => recipes.some((recipe) => recipe.slug === slug))
            .slice(0, 4),
        },
        ticker: tickerDraft.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 20),
      };
      const saved = await saveAdminHomepageContent(normalizedContent, token);
      setContent(saved);
      setTickerDraft(saved.ticker.join("\n"));
      showToast("Homepage content saved.", "success");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Homepage content could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const uploadHero = async () => {
    if (!heroFile) return;
    setSaving(true);
    setError("");
    try {
      await uploadAdminHeroImage(heroFile, heroAlt.trim(), token);
      setHeroFile(null);
      setHeroAlt("");
      showToast("Hero image added.", "success");
      await onRefresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Hero image upload failed.");
    } finally {
      setSaving(false);
    }
  };

  const removeHero = async (image: AdminHeroImage) => {
    if (!window.confirm("Remove this image from the homepage hero?")) return;
    setSaving(true);
    setError("");
    try {
      await adminRequest(`/api/admin/hero-images/${image.id}`, token, { method: "DELETE" });
      showToast("Hero image removed.", "success");
      await onRefresh();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Hero image could not be removed.");
    } finally {
      setSaving(false);
    }
  };

  const saveHeroAlt = async (image: AdminHeroImage) => {
    const altText = heroAltDrafts[image.id];
    if (altText === undefined || altText === image.alt_text) return;
    setSaving(true);
    setError("");
    try {
      await adminRequest(`/api/admin/hero-images/${image.id}`, token, {
        method: "PUT",
        body: JSON.stringify({ alt_text: altText, sort_order: image.sort_order }),
      });
      setHeroAltDrafts((current) => {
        const next = { ...current };
        delete next[image.id];
        return next;
      });
      showToast("Hero photo description updated.", "success");
      await onRefresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Hero photo description could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const selectedComboCount = content?.combos.product_slugs.filter((slug) =>
    comboProducts.some((product) => product.slug === slug),
  ).length ?? 0;

  const toggleProduct = (key: "bestsellers" | "combos", slug: string) => {
    if (!content) return;
    const selected = content[key].product_slugs;
    if (key === "combos" && !selected.includes(slug) && selectedComboCount >= 4) return;
    const product_slugs = selected.includes(slug)
      ? selected.filter((item) => item !== slug)
      : [...selected, slug];
    updateContent((current) => ({ ...current, [key]: { ...current[key], product_slugs } }));
  };

  const toggleRecipe = (slug: string) => {
    if (!content) return;
    const selected = content.recipes.recipe_slugs;
    if (!selected.includes(slug) && selected.length >= 4) return;
    const recipe_slugs = selected.includes(slug)
      ? selected.filter((item) => item !== slug)
      : [...selected, slug];
    updateContent((current) => ({
      ...current,
      recipes: { ...current.recipes, recipe_slugs },
    }));
  };

  if (loading) {
    return <p role="status" className="mt-7 text-sm text-ink-500">Loading homepage settings…</p>;
  }
  if (!content) {
    return <p role="alert" className="mt-7 rounded-xl border border-chili-100 bg-chili-50 p-4 text-sm text-chili-700">{error || "Homepage settings are unavailable."}</p>;
  }
  const filteredCategoryItems = content.categories.items.filter((item) =>
    matchesSearch(sectionSearch.categories ?? "", item.label, item.slug),
  );
  const filteredComboProducts = comboProducts.filter((product) =>
    matchesSearch(sectionSearch.combos ?? "", product.name, product.slug, ...product.categories),
  );
  const visibleComboChoices = showAllCombos
    ? filteredComboProducts.slice((combosPage - 1) * ALL_ITEMS_PAGE_SIZE, combosPage * ALL_ITEMS_PAGE_SIZE)
    : filteredComboProducts.slice(0, RECENT_ITEMS_LIMIT);
  const heroImageLimitReached = heroImages.length >= MAX_HERO_IMAGES;

  return (
    <section className="mt-7">
      {error ? <p role="alert" className="mb-4 rounded-xl border border-chili-100 bg-chili-50 p-3 text-sm text-chili-700">{error}</p> : null}

      <div role="tablist" aria-label="Homepage sections" className="mb-5 flex gap-2 overflow-x-auto pb-2">
        {homepageSections.map((item) => (
          <button
            key={item.id}
            id={`homepage-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={activeSection === item.id}
            aria-controls="homepage-section-panel"
            onClick={() => setActiveSection(item.id)}
            className={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
              activeSection === item.id
                ? "border-masala-700 bg-masala-700 text-white"
                : "border-paper-200 bg-white text-ink-700 hover:border-masala-300"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="space-y-5">
        <div
          id="homepage-section-panel"
          role="tabpanel"
          aria-labelledby={`homepage-tab-${activeSection}`}
          className="min-h-64"
        >
        {activeSection === "hero" ? (
        <SectionCard title="Hero section" description="Manage the carousel images shown on the homepage hero.">
          <SectionSearch id="hero-search" label="Search hero slides" value={sectionSearch.hero ?? ""} onChange={(value) => setSearch("hero", value)} />
          <p className="mb-3 text-sm text-ink-500" aria-live="polite">{heroImages.length} of {MAX_HERO_IMAGES} hero images</p>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className={labelClass}>
              Add carousel photo
              <input type="file" accept="image/*" disabled={heroImageLimitReached || saving} className={`${fieldClass} file:mr-3 file:rounded-lg file:border-0 file:bg-paper-100 file:px-3 file:py-1.5`} onChange={(event) => setHeroFile(event.currentTarget.files?.[0] ?? null)} />
            </label>
            <label className={labelClass}>
              Image description
              <input className={fieldClass} value={heroAlt} onChange={(event) => setHeroAlt(event.target.value)} />
            </label>
            <button type="button" className={secondaryButton} disabled={!heroFile || saving || heroImageLimitReached} onClick={() => void uploadHero()}><PlusIcon className="size-4" />Add image</button>
          </div>
          {heroImageLimitReached ? <p className="mt-2 text-sm text-ink-500">Maximum reached. Remove an image to add another.</p> : null}
          {heroImages.length ? (
            heroImages.some((image, index) => matchesSearch(sectionSearch.hero ?? "", image.alt_text, `slide ${index + 1}`)) ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {heroImages.map((image, index) => ({ image, index }))
                .filter(({ image, index }) => matchesSearch(sectionSearch.hero ?? "", image.alt_text, `slide ${index + 1}`))
                .map(({ image, index }) => (
                <article key={image.id} className="overflow-hidden rounded-xl border border-paper-200">
                  <SmartImage src={image.url} alt={image.alt_text || `Hero slide ${index + 1}`} aspect="aspect-[2.76/1]" sizes="(max-width: 640px) 100vw, 50vw" />
                  <div className="space-y-2 p-3">
                    <p className="text-xs font-semibold text-ink-600">Slide {index + 1}</p>
                    <input
                      className={fieldClass}
                      aria-label={`Hero slide ${index + 1} image description`}
                      value={heroAltDrafts[image.id] ?? image.alt_text}
                      onChange={(event) => setHeroAltDrafts((current) => ({ ...current, [image.id]: event.target.value }))}
                    />
                    <div className="flex justify-between gap-2">
                      <button type="button" className={secondaryButton} disabled={saving || (heroAltDrafts[image.id] ?? image.alt_text) === image.alt_text} onClick={() => void saveHeroAlt(image)}>Save description</button>
                      <button type="button" className="rounded-lg p-2 text-chili-600 hover:bg-chili-50 disabled:opacity-50" aria-label={`Remove hero image ${index + 1}`} disabled={saving} onClick={() => void removeHero(image)}><TrashIcon className="size-4" /></button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            ) : <p className="text-sm text-ink-500">No hero slides match that search.</p>
          ) : <p className="text-sm text-ink-500">No hero photos are configured yet.</p>}
        </SectionCard>
        ) : null}

        {activeSection === "ticker" ? (
        <SectionCard title="Announcement ticker" description="Edit the short messages repeated in the scrolling promise bar.">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1">
              <SectionSearch id="ticker-search" label="Search ticker messages" value={sectionSearch.ticker ?? ""} onChange={(value) => setSearch("ticker", value)} />
            </div>
            <button
              type="button"
              className={secondaryButton}
              disabled={tickerLines.length >= 20}
              onClick={() => updateTickerLines([...tickerLines, ""])}
            ><PlusIcon className="size-4" />Add message</button>
          </div>
          {tickerLines.some((line) => matchesSearch(sectionSearch.ticker ?? "", line)) ? (
            <div className="space-y-2">
              {tickerLines.map((line, index) => ({ line, index }))
                .filter(({ line }) => matchesSearch(sectionSearch.ticker ?? "", line))
                .map(({ line, index }) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      className={fieldClass}
                      aria-label={`Announcement message ${index + 1}`}
                      value={line}
                      onChange={(event) => updateTickerLines(tickerLines.map((item, row) => row === index ? event.target.value : item))}
                      placeholder="Enter an announcement"
                    />
                    <button
                      type="button"
                      className="rounded-lg p-2 text-chili-600 hover:bg-chili-50"
                      aria-label={`Remove announcement message ${index + 1}`}
                      onClick={() => updateTickerLines(tickerLines.filter((_, row) => row !== index))}
                    ><TrashIcon className="size-4" /></button>
                  </div>
                ))}
            </div>
          ) : <p className="text-sm text-ink-500">No ticker messages match that search.</p>}
        </SectionCard>
        ) : null}

        {activeSection === "categories" ? (
        <SectionCard title="Shop by category" description="Choose categories to feature and upload their round photos.">
          <SectionSearch id="categories-search" label="Search featured categories" value={sectionSearch.categories ?? ""} onChange={(value) => setSearch("categories", value)} />
          <div className="flex flex-wrap items-end gap-2">
            <label className={`${labelClass} min-w-64 flex-1`}>
              Add category
              <SelectField value={categoryToAdd} onChange={(event) => setCategoryToAdd(event.target.value)}>
                <option value="">Choose a category</option>
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.slug}>{category.name}</option>
                ))}
              </SelectField>
            </label>
            <button
              type="button"
              className={secondaryButton}
              disabled={!categoryToAdd}
              onClick={() => {
                const category = categories.find((item) => item.slug === categoryToAdd);
                if (!category) return;
                const imageProduct = products.find((product) => product.categories.includes(category.slug));
                updateContent((current) => ({
                  ...current,
                  categories: {
                    ...current.categories,
                    items: [...current.categories.items, {
                      slug: category.slug,
                      label: category.name,
                      image_url: "",
                      image_key: "",
                      image_product_slug: imageProduct?.slug ?? "",
                    }],
                  },
                }));
                setCategoryToAdd("");
              }}
            ><PlusIcon className="size-4" />Add category</button>
          </div>
          {filteredCategoryItems.length ? filteredCategoryItems.map((item) => (
            <article key={item.slug} className="grid gap-3 rounded-xl border border-paper-100 bg-paper-50 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className={labelClass}>
                Label · {item.slug}
                <input className={fieldClass} value={item.label} onChange={(event) => updateCategory(item.slug, { label: event.target.value })} />
              </label>
              <div className="flex items-center gap-3">
                <SmartImage
                  src={item.image_url || products.find((product) => product.slug === item.image_product_slug)?.images[0]?.url}
                  alt={item.label}
                  aspect="aspect-square"
                  sizes="64px"
                  wrapperClassName="size-16 shrink-0 rounded-full"
                  zoom={false}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className={`${secondaryButton} cursor-pointer`}>
                  Upload image
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      if (!file) return;
                      void uploadImage(file).then((result) => {
                        if (result) updateCategory(item.slug, { image_key: result.image_key, image_url: result.image_url });
                      });
                    }}
                  />
                </label>
                <button type="button" className="rounded-lg p-2 text-chili-600 hover:bg-chili-50" aria-label={`Remove ${item.label}`} onClick={() => updateContent((current) => ({ ...current, categories: { ...current.categories, items: current.categories.items.filter((category) => category.slug !== item.slug) } }))}><TrashIcon className="size-4" /></button>
              </div>
            </article>
          )) : <p className="text-sm text-ink-500">No featured categories match that search.</p>}
        </SectionCard>
        ) : null}

        {activeSection === "bestsellers" ? (
        <SectionCard title="Bestsellers" description="Add or remove catalog products from the homepage Bestsellers rail.">
          <SectionSearch id="bestsellers-search" label="Search products" value={sectionSearch.bestsellers ?? ""} onChange={(value) => setSearch("bestsellers", value)} />
          <ProductChoices products={products.filter((product) => !product.is_combo)} selected={content.bestsellers.product_slugs} onToggle={(slug) => toggleProduct("bestsellers", slug)} query={sectionSearch.bestsellers ?? ""} />
        </SectionCard>
        ) : null}

        {activeSection === "combos" ? (
        <SectionCard title="Homepage combos" description="Choose up to four combos for the homepage. Newest items appear first; unselected combos remain available in the catalog.">
          <p className="text-sm font-semibold text-ink-700" aria-live="polite">
            {selectedComboCount} of 4 homepage combos selected
          </p>

          <section aria-labelledby="homepage-combo-choices">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 id="homepage-combo-choices" className="font-semibold text-ink-900">Combos</h3>
                <p className="text-xs text-ink-500">{comboProducts.length} available</p>
              </div>
              <div className="flex min-w-0 flex-col gap-2 sm:w-96 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <SectionSearch id="combos-search" label="Search combos" value={sectionSearch.combos ?? ""} onChange={(value) => setSearch("combos", value)} />
                </div>
                {filteredComboProducts.length > RECENT_ITEMS_LIMIT ? (
                  <button
                    type="button"
                    className={secondaryButton}
                    aria-expanded={showAllCombos}
                    onClick={() => { setShowAllCombos((visible) => !visible); setCombosPage(1); }}
                  >
                    {showAllCombos ? "Recent 6" : "View all combos"}
                    <ArrowRightIcon className={`size-4 transition-transform ${showAllCombos ? "rotate-180" : ""}`} />
                  </button>
                ) : null}
              </div>
            </div>
            {comboProducts.length ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleComboChoices.map((product) => {
                  const selected = content.combos.product_slugs.includes(product.slug);
                  return (
                    <article key={product.id} className="rounded-xl border border-paper-200 bg-paper-50 p-3">
                      <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-800">
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={!selected && selectedComboCount >= 4}
                          onChange={() => toggleProduct("combos", product.slug)}
                        />
                        <span className="min-w-0 truncate">{product.name}</span>
                      </label>
                      <SmartImage src={product.images[0]?.url} alt={product.name} aspect="aspect-square" sizes="(max-width: 640px) 50vw, 25vw" wrapperClassName="mt-3 rounded-lg" zoom={false} />
                      <p className="mt-2 text-xs text-ink-600">{formatINR(getStartingPrice(product))} · {displayStatus(product.status)}</p>
                    </article>
                  );
                })}
              </div>
            ) : <p className="mt-3 rounded-lg border border-dashed border-paper-300 px-4 py-5 text-sm text-ink-500">No combos have been added yet. Create combos under Combos, then return here to feature them.</p>}
            {showAllCombos && filteredComboProducts.length > 0 ? (
              <Pagination page={Math.min(combosPage, Math.max(1, Math.ceil(filteredComboProducts.length / ALL_ITEMS_PAGE_SIZE)))} pageSize={ALL_ITEMS_PAGE_SIZE} total={filteredComboProducts.length} itemLabel="combos" ariaLabel="All homepage combos pagination" onPageChange={setCombosPage} />
            ) : null}
          </section>
        </SectionCard>
        ) : null}

        {activeSection === "recipes" ? (
        <SectionCard title="Homepage recipes" description="Choose up to four recipes for the homepage. Removing a selection here only hides it from the homepage; it does not delete the recipe.">
          <SectionSearch id="recipes-search" label="Search recipes" value={sectionSearch.recipes ?? ""} onChange={(value) => setSearch("recipes", value)} />
          <p className="text-sm text-ink-500" aria-live="polite">
            {content.recipes.recipe_slugs.length} of 4 homepage recipe slots selected · {recipes.length} recipes available.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {recipes.filter((recipe) => matchesSearch(sectionSearch.recipes ?? "", recipe.title, recipe.slug, recipe.cuisine, recipe.dish_type)).map((recipe) => {
              return (
                <article key={recipe.id} className="rounded-xl border border-paper-100 bg-paper-50 p-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-800">
                    <input
                      type="checkbox"
                      checked={content.recipes.recipe_slugs.includes(recipe.slug)}
                      disabled={!content.recipes.recipe_slugs.includes(recipe.slug) && content.recipes.recipe_slugs.length >= 4}
                      onChange={() => toggleRecipe(recipe.slug)}
                    />
                    <span>{recipe.title}</span>
                  </label>
                  <SmartImage
                    src={recipe.hero_image_url}
                    alt={recipe.title}
                    aspect="aspect-video"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    wrapperClassName="mt-3 rounded-lg"
                    zoom={false}
                  />
                  <p className="mt-2 text-xs text-ink-600">
                    {recipe.cuisine} · {recipe.dish_type} · {recipe.cook_time_minutes} min
                  </p>
                </article>
              );
            })}
          </div>
          {recipes.length > 0 && !recipes.some((recipe) => matchesSearch(sectionSearch.recipes ?? "", recipe.title, recipe.slug, recipe.cuisine, recipe.dish_type)) ? <p className="text-sm text-ink-500">No recipes match that search.</p> : null}
          {recipes.length === 0 ? <p className="text-sm text-ink-500">No recipes are available to feature.</p> : null}
        </SectionCard>
        ) : null}
        </div>

        <div className="sticky bottom-3 z-10 flex justify-end">
          <button type="button" onClick={() => void saveContent()} className={primaryButton} disabled={saving}>
            {saving ? "Saving…" : "Save homepage changes"}
          </button>
        </div>
      </div>
    </section>
  );
}

function ProductChoices({
  products,
  selected,
  onToggle,
  query,
}: {
  products: AdminProduct[];
  selected: string[];
  onToggle: (slug: string) => void;
  query: string;
}) {
  if (!products.length) return <p className="text-sm text-ink-500">No products available for this section.</p>;
  const filteredProducts = products.filter((product) =>
    matchesSearch(query, product.name, product.slug, ...product.categories),
  );
  if (!filteredProducts.length) return <p className="text-sm text-ink-500">No products match that search.</p>;
  return (
    <>
      <p className="text-sm text-ink-500" aria-live="polite">
        Showing {selected.length} of {products.length} products on the homepage · {filteredProducts.length} match the search.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {filteredProducts.map((product) => (
          <article key={product.id} className="flex items-center gap-3 rounded-xl border border-paper-100 bg-paper-50 p-3">
            <SmartImage
              src={product.images[0]?.url}
              alt={product.name}
              aspect="aspect-square"
              sizes="48px"
              wrapperClassName="size-12 shrink-0 rounded-lg"
              zoom={false}
            />
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm text-ink-800">
              <input type="checkbox" checked={selected.includes(product.slug)} onChange={() => onToggle(product.slug)} />
              <span className="min-w-0 truncate">{product.name}</span>
            </label>
          </article>
        ))}
      </div>
    </>
  );
}
