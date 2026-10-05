import type { BlogPost } from "@/lib/types";
import { apiClient } from "@/lib/http";

export async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const response = await apiClient.get<unknown>("/api/blog");
    const data = response.data;
    return Array.isArray(data) ? (data as BlogPost[]) : [];
  } catch {
    return [];
  }
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const response = await apiClient.get<BlogPost>(`/api/blog/${encodeURIComponent(slug)}`);
    return response.data;
  } catch {
    return null;
  }
}
