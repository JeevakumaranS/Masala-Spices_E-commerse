import type { Category, Product, Recipe } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchJson<T>(
  path: string,
  fallback: T | null = null,
): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return fallback;
    }

    return (await res.json()) as T;
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

export async function getProducts(): Promise<Product[]> {
  const payload = await fetchJson<{ items?: Product[] } | Product[]>(
    "/api/products",
    [],
  );
  if (!payload) return [];
  return Array.isArray(payload) ? payload : (payload.items ?? []);
}

export async function getProduct(slug: string): Promise<Product | null> {
  return fetchJson<Product>(`/api/products/${slug}`);
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
  return fetchJson<Recipe>(`/api/recipes/${slug}`);
}
// testing
