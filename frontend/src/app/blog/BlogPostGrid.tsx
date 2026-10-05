"use client";

import { useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { SmartImage } from "@/components/ui/SmartImage";
import { ArrowRightIcon } from "@/components/ui/icons";
import { Pagination } from "@/components/ui/Pagination";
import type { BlogPost } from "@/lib/types";

const PAGE_SIZE = 6;

export function BlogPostGrid({ posts }: { posts: BlogPost[] }) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visiblePosts = posts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {visiblePosts.map((post, index) => (
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
                <p className="eyebrow">{post.category || "Journal"}</p>
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
      {posts.length > PAGE_SIZE ? (
        <Pagination page={currentPage} pageSize={PAGE_SIZE} total={posts.length} itemLabel="stories" ariaLabel="Blog stories pagination" onPageChange={setPage} />
      ) : null}
    </>
  );
}
