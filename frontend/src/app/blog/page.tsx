import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/EmptyState";
import { SparkleIcon } from "@/components/ui/icons";
import { getBlogPosts } from "@/lib/blog-api";
import { BlogPostGrid } from "@/app/blog/BlogPostGrid";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The journal",
  description:
    "Stories from the roastery, pantry guides and the recipes behind our blends — written by the people who grind the masala.",
};

export default async function BlogPage() {
  const posts = await getBlogPosts();

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
        ) : <BlogPostGrid posts={posts} />}
      </section>
    </>
  );
}
