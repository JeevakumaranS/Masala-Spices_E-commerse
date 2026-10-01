import { unstable_cache } from "next/cache";
import type { ActiveOffer, Category, HomepageContent, Product, Recipe } from "@/lib/types";
import { apiClient } from "@/lib/http";

async function fetchJson<T>(
  path: string,
  fallback: T | null = null,
  cache = true,
): Promise<T | null> {
  try {
    if (!cache) {
      const response = await apiClient.get<T>(path);
      return response.data;
    }
    const cachedRequest = unstable_cache(
      async (requestPath: string) => {
        const response = await apiClient.get<T>(requestPath);
        return response.data;
      },
      ["backend-api"],
      { revalidate: 300 },
    );
    return await cachedRequest(path);
  } catch {
    return fallback;
  }
}

export async function getCategories(): Promise<Category[]> {
  const payload = await fetchJson<{ items?: Category[] } | Category[]>(
    "/api/categories",
    [],
  );
  if (!payload) return [];
  return Array.isArray(payload) ? payload : (payload.items ?? []);
}

export async function getProducts(category?: string): Promise<Product[]> {
  const path = category
    ? `/api/products?category=${encodeURIComponent(category)}`
    : "/api/products";
  const payload = await fetchJson<{ items?: Product[] } | Product[]>(
    path,
    [],
    false,
  );
  if (!payload) return [];
  return Array.isArray(payload) ? payload : (payload.items ?? []);
}

export async function getActiveOffers(): Promise<ActiveOffer[]> {
  return (await fetchJson<ActiveOffer[]>("/api/coupons/active", [], false)) ?? [];
}

export async function getProduct(slug: string): Promise<Product | null> {
  return fetchJson<Product>(`/api/products/${encodeURIComponent(slug)}`, null, false);
}

export type HeroImage = {
  id: string;
  url: string;
  alt_text: string;
  sort_order: number;
};

export async function getHeroImages(): Promise<HeroImage[]> {
  return (await fetchJson<HeroImage[]>("/api/hero-images", [], false)) ?? [];
}

const DEFAULT_HOMEPAGE_CONTENT: HomepageContent = {
  ticker: [
    "Stone-ground, never beaten",
    "No fillers or anti-caking agents",
    "Roasted in 4kg batches",
    "Sealed within 48 hours",
    "Single-origin whole spices",
    "Recipes that actually work",
  ],
  categories: {
    title: "Shop by category",
    items: [
      { slug: "breakfast-masalas", label: "Everyday Masalas", image_url: "", image_key: "", image_product_slug: "sambar-masala" },
      { slug: "masala-powders", label: "Masala Powders", image_url: "", image_key: "", image_product_slug: "biriyani-masala" },
      { slug: "pure-spices", label: "Pure Spices", image_url: "", image_key: "", image_product_slug: "garam-masala" },
      { slug: "podis", label: "Podis", image_url: "", image_key: "", image_product_slug: "rasam-podi" },
      { slug: "pickles", label: "Pickles", image_url: "", image_key: "", image_product_slug: "mango-pickle" },
    ],
  },
  bestsellers: { title: "Bestsellers", product_slugs: [] },
  combos: {
    title: "Better valued Combos",
    description: "Curated combos — a combination of meals in one box",
    product_slugs: [],
  },
  recipes: {
    eyebrow: "Cook with confidence",
    title: "Recipes that put the jar to work",
    description: "Written for home cooks — measured in spoons, not scales, and timed for a weeknight.",
    link_label: "All recipes",
    link_href: "/recipes",
    recipe_slugs: [],
  },
};

export async function getHomepageContent(): Promise<HomepageContent> {
  return (await fetchJson<HomepageContent>(
    "/api/homepage-content",
    DEFAULT_HOMEPAGE_CONTENT,
    false,
  )) ?? DEFAULT_HOMEPAGE_CONTENT;
}

export async function getRecipes(): Promise<Recipe[]> {
  const payload = await fetchJson<{ items?: Recipe[] } | Recipe[]>(
    "/api/recipes",
    [],
  );
  if (!payload) return [];
  return Array.isArray(payload) ? payload : (payload.items ?? []);
}

export async function getRecipe(slug: string): Promise<Recipe | null> {
  return fetchJson<Recipe>(`/api/recipes/${encodeURIComponent(slug)}`);
}
