import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SmartImage } from "@/components/ui/SmartImage";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/ui/icons";
import { getBlogPost, getBlogPosts } from "@/lib/blog-api";

export const revalidate = 600;

/** Resolve the post before HTML streaming so missing posts return a real 404. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  const firstParagraph = (post.body ?? "").split(/\n+/)[0]?.trim() ?? "";
  const description =
    firstParagraph.length > 155 ? `${firstParagraph.slice(0, 152)}…` : firstParagraph;

  return {
    title: post.title,
    ...(description ? { description } : {}),
  };
}

function formatPublishDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) {
    notFound();
  }

  // One wall of text is unreadable — break the body into real paragraphs.
  const paragraphs = (post.body ?? "")
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const published = formatPublishDate(post.published_at);
  const eyebrowLine = [post.category || "Kitchen journal", published]
    .filter(Boolean)
    .join(" · ");

  const morePosts = (await getBlogPosts())
    .filter((item) => item.slug !== slug)
    .slice(0, 3);

  return (
    <>
      {/* ============================ ARTICLE ============================ */}
      <section className="shell py-14 md:py-20">
        <Breadcrumbs items={[{ label: "Blog", href: "/blog" }, { label: post.title }]} />

        <div className="mx-auto mt-5 max-w-3xl">
          <Link href="/blog" className="btn btn-ghost btn-sm -ml-3">
            <ArrowLeftIcon className="size-4" />
            Back to journal
          </Link>

          <article className="mt-4">
            <p className="eyebrow">{eyebrowLine}</p>
            <h1 className="display mt-3">{post.title}</h1>

            <div className="mt-8 overflow-hidden rounded-3xl">
              <SmartImage
                src={post.hero_image_url}
                alt={post.title}
                aspect="aspect-video"
                priority
                sizes="(max-width: 1024px) 100vw, 48rem"
              />
            </div>

            <div className="mt-9 space-y-6">
              {paragraphs.length > 0 ? (
                paragraphs.map((paragraph, index) => (
                  <p key={index} className="text-lg leading-8 text-ink-700">
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className="text-lg leading-8 text-ink-700">
                  The full story is being plated up — check back shortly.
                </p>
              )}
            </div>

            {/* Share / back bar */}
            <div className="hairline mt-10 flex flex-wrap items-center justify-between gap-4 pt-6">
              <p className="text-sm text-ink-500">Thanks for reading — the kitchen writes weekly.</p>
              <div className="flex flex-wrap gap-3">
                <Link href="/recipes" className="btn btn-secondary btn-sm">
                  Cook with our blends
                  <ArrowRightIcon className="size-4" />
                </Link>
                <Link href="/blog" className="btn btn-ghost btn-sm">
                  <ArrowLeftIcon className="size-4" />
                  Back to journal
                </Link>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* ============================ MORE FROM THE JOURNAL ============================ */}
      {morePosts.length > 0 ? (
        <section className="border-t border-paper-200 bg-paper-100 py-14 md:py-20">
          <div className="shell">
            <Reveal>
              <SectionHeading
                eyebrow="Keep reading"
                title="More from the journal"
                action={{ label: "All posts", href: "/blog" }}
              />
            </Reveal>

            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {morePosts.map((item, index) => (
                <Reveal key={item.slug} delay={index * 90} className="h-full">
                  <Link
                    href={`/blog/${item.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-3xl border border-paper-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-paper-300 hover:shadow-lg"
                  >
                    <SmartImage
                      src={item.hero_image_url}
                      alt={item.title}
                      aspect="aspect-video"
                      zoom
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="flex flex-1 flex-col p-5">
                      <p className="eyebrow">Journal</p>
                      <h3 className="mt-2.5 font-display text-xl leading-snug font-semibold text-ink-950 transition-colors group-hover:text-masala-800">
                        {item.title}
                      </h3>
                      <span className="mt-auto inline-flex items-center gap-2 pt-4 text-sm font-semibold text-masala-700">
                        Read story
                        <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
