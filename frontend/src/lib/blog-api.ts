import { unstable_cache } from "next/cache";
import type { BlogPost } from "@/lib/types";
import { apiClient } from "@/lib/http";

const getCachedBlogData = unstable_cache(
  async (path: string) => {
    const response = await apiClient.get<unknown>(path);
    return response.data;
  },
  ["backend-blog"],
  { revalidate: 600 },
);

export async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const data = await getCachedBlogData("/api/blog");
    return Array.isArray(data) ? (data as BlogPost[]) : [];
  } catch {
    return [];
  }
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    return (await getCachedBlogData(`/api/blog/${encodeURIComponent(slug)}`)) as BlogPost;
  } catch {
    return null;
  }
}
