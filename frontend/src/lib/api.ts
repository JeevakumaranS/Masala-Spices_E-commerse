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
      { revalidate: 60 },
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
  const pageSize = 100;
  const params = { page: 1, page_size: pageSize, ...(category ? { category } : {}) };

  try {
    const firstPage = await apiClient.get<{
      items?: Product[];
      total_count?: number;
    } | Product[]>("/api/products", { params });
    if (Array.isArray(firstPage.data)) return firstPage.data;

    const items = firstPage.data.items ?? [];
    const totalPages = Math.ceil((firstPage.data.total_count ?? items.length) / pageSize);
    if (totalPages <= 1) return items;

    const remainingPages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        apiClient.get<{ items?: Product[] } | Product[]>("/api/products", {
          params: { ...params, page: index + 2 },
        }),
      ),
    );

    return [
      ...items,
      ...remainingPages.flatMap(({ data }) =>
        Array.isArray(data) ? data : (data.items ?? []),
      ),
    ];
  } catch {
    return [];
  }
}

export async function getProductsBySlugsAndCategories(
  slugs: string[],
  categories: string[],
): Promise<Product[]> {
  const uniqueSlugs = [...new Set(slugs.filter(Boolean))];
  const uniqueCategories = [...new Set(categories.filter(Boolean))];
  if (!uniqueSlugs.length && !uniqueCategories.length) return [];

  const params = new URLSearchParams({ page: "1", page_size: "100" });
  if (uniqueSlugs.length) params.set("slugs", uniqueSlugs.join(","));
  if (uniqueCategories.length) params.set("categories", uniqueCategories.join(","));

  const payload = await fetchJson<{ items?: Product[] } | Product[]>(
    `/api/products?${params.toString()}`,
    [],
  );
  if (!payload) return [];
  return Array.isArray(payload) ? payload : (payload.items ?? []);
}

export async function getAllCombos(slugs?: string[]): Promise<Product[]> {
  if (slugs) {
    const uniqueSlugs = [...new Set(slugs.filter(Boolean))];
    if (!uniqueSlugs.length) return [];
    const params = new URLSearchParams({
      category: "combos-packs",
      page: "1",
      page_size: "100",
      slugs: uniqueSlugs.join(","),
    });
    const payload = await fetchJson<{ items?: Product[] } | Product[]>(
      `/api/products?${params.toString()}`,
      [],
    );
    if (!payload) return [];
    return Array.isArray(payload) ? payload : (payload.items ?? []);
  }

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
  return (await fetchJson<ActiveOffer[]>("/api/coupons/active", [])) ?? [];
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
  return (await fetchJson<HeroImage[]>("/api/hero-images", [])) ?? [];
}

export async function getAboutImage(): Promise<string | null> {
  const payload = await fetchJson<{ image_url?: string }>("/api/about-image", null, false);
  return payload?.image_url || null;
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
  )) ?? DEFAULT_HOMEPAGE_CONTENT;
}

export async function getRecipes(slugs?: string[]): Promise<Recipe[]> {
  if (slugs) {
    const uniqueSlugs = [...new Set(slugs.filter(Boolean))];
    if (!uniqueSlugs.length) return [];
    const params = new URLSearchParams({ slugs: uniqueSlugs.join(",") });
    const payload = await fetchJson<{ items?: Recipe[] } | Recipe[]>(
      `/api/recipes?${params.toString()}`,
      [],
    );
    if (!payload) return [];
    return Array.isArray(payload) ? payload : (payload.items ?? []);
  }

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
