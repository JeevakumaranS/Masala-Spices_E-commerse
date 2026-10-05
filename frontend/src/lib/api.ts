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

export async function getAllCombos(): Promise<Product[]> {
  const pageSize = 100;
  try {
    const firstPage = await apiClient.get<{
      items: Product[];
      total_count: number;
    }>("/api/products", {
      params: { category: "combos-packs", page: 1, page_size: pageSize },
    });
    const totalPages = Math.ceil(firstPage.data.total_count / pageSize);
    if (totalPages <= 1) return firstPage.data.items;
    const remainingPages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        apiClient.get<{ items: Product[] }>("/api/products", {
          params: { category: "combos-packs", page: index + 2, page_size: pageSize },
        }),
      ),
    );
    return [firstPage.data.items, ...remainingPages.map((response) => response.data.items)].flat();
  } catch {
    return [];
  }
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
      { slug: "breakfast-masalas", label: "Everyday Masalas", image_url: "https://shop.cookdtv.com/cdn/shop/files/cat-kulambu.png?v=1788332086&width=400", image_key: "", image_product_slug: "sambar-masala" },
      { slug: "masala-powders", label: "Masala Powders", image_url: "https://img.magnific.com/free-psd/overhead-view-indian-spices-bowl_84443-93191.jpg?semt=ais_hybrid&w=740&q=80", image_key: "", image_product_slug: "biriyani-masala" },
      { slug: "pure-spices", label: "Pure Spices", image_url: "https://tiimg.tistatic.com/fp/1/007/630/100-pure-turmeric-powder-for-food-spices-with-12-months-shelf-life-712.jpg", image_key: "", image_product_slug: "garam-masala" },
      { slug: "podis", label: "Podis", image_url: "https://shop.cookdtv.com/cdn/shop/files/cat-podis.png?v=1788332086&width=400", image_key: "", image_product_slug: "rasam-podi" },
      { slug: "pickles", label: "Pickles", image_url: "https://images.jdmagicbox.com/quickquotes/images_main/mtc4ntmwotgwoq-1785309809-ofhfv4jq.png", image_key: "", image_product_slug: "mango-pickle" },
    ],
  },
  bestsellers: { title: "Bestsellers", product_slugs: [] },
  combos: {
    title: "Better valued Combos & Offers",
    description: "Curated combos — a combination of meals in one box",
    product_slugs: [],
    offer_codes: [],
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
    false,
  );
  if (!payload) return [];
  return Array.isArray(payload) ? payload : (payload.items ?? []);
}

export async function getRecipe(slug: string): Promise<Recipe | null> {
  return fetchJson<Recipe>(`/api/recipes/${encodeURIComponent(slug)}`);
}
