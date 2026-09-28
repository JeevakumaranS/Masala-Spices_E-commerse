import type { Metadata } from "next";
import Link from "next/link";
import type { BlogPost } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { SmartImage } from "@/components/ui/SmartImage";
import { ArrowRightIcon, SparkleIcon } from "@/components/ui/icons";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "The journal",
  description:
    "Stories from the roastery, pantry guides and the recipes behind our blends — written by the people who grind the masala.",
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** The blog API has no client helper yet — and it must never crash the page. */
async function fetchBlogPosts(): Promise<BlogPost[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/blog`, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    return Array.isArray(data) ? (data as BlogPost[]) : [];
  } catch {
    return [];
  }
}

export default async function BlogPage() {
  const posts = await fetchBlogPosts();

  return (
    <>
      {/* ============================ HERO ============================ */}
      <section className="shell relative overflow-hidden py-14 md:py-20">
        <span
          className="pointer-events-none absolute -top-24 -left-20 size-72 rounded-full bg-[radial-gradient(circle,var(--color-saffron-100),transparent_70%)]"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute -right-24 -bottom-28 size-80 rounded-full bg-[radial-gradient(circle,var(--color-masala-100),transparent_70%)]"
          aria-hidden="true"
        />

        <div className="relative">
          <p className="eyebrow">Field notes from the roastery</p>
          <h1 className="display mt-4 max-w-[14ch]">From the kitchen journal</h1>
          <p className="lede mt-5 max-w-2xl">
            Stories from the roastery, pantry guides and the recipes behind our blends —
            written by the people who grind the masala.
          </p>
        </div>
      </section>

      {/* ============================ GRID ============================ */}
      <section className="shell border-t border-paper-200 py-14 md:py-20">
        {posts.length === 0 ? (
          <EmptyState
            icon={<SparkleIcon className="size-7" />}
            eyebrow="Nothing on the press"
            title="No stories to show right now"
            description="The kitchen API didn't hand us anything this time. The kettle is on — try again shortly."
            action={{ label: "Browse recipes", href: "/recipes" }}
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, index) => (
              <Reveal key={post.slug} delay={(index % 3) * 80} className="h-full">
                <Link
                  href={`/blog/${post.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-3xl border border-paper-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-paper-300 hover:shadow-lg"
                >
                  <SmartImage
                    src={post.hero_image_url}
                    alt={post.title}
                    aspect="aspect-video"
                    zoom
                    priority={index < 3}
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="flex flex-1 flex-col p-5">
                    <p className="eyebrow">Journal</p>
                    <h2 className="mt-2.5 font-display text-xl leading-snug font-semibold text-ink-950 transition-colors group-hover:text-masala-800">
                      {post.title}
                    </h2>
                    <span className="mt-auto inline-flex items-center gap-2 pt-4 text-sm font-semibold text-masala-700">
                      Read story
                      <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
