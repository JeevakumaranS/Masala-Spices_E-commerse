import { unstable_cache } from "next/cache";
import type { ActiveOffer, Category, Product, Recipe } from "@/lib/types";
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
  );
  if (!payload) return [];
  return Array.isArray(payload) ? payload : (payload.items ?? []);
}

export async function getActiveOffers(): Promise<ActiveOffer[]> {
  return (await fetchJson<ActiveOffer[]>("/api/coupons/active", [], false)) ?? [];
}

export async function getProduct(slug: string): Promise<Product | null> {
  return fetchJson<Product>(`/api/products/${encodeURIComponent(slug)}`);
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
