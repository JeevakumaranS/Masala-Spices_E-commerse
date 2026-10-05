"use client";

import { FormEvent, useEffect, useState } from "react";
import { adminRequest, uploadHomepageMedia } from "@/lib/admin";
import type { BlogPost } from "@/lib/types";
import { Pagination } from "@/components/ui/Pagination";
import { SmartImage } from "@/components/ui/SmartImage";
import { PlusIcon } from "@/components/ui/icons";

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-paper-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none transition focus:border-masala-500 focus:ring-2 focus:ring-masala-500/15";
const labelClass = "block text-xs font-semibold tracking-wide text-ink-600";
const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-masala-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-masala-800 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-paper-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:border-masala-300 disabled:cursor-not-allowed disabled:opacity-50";
const PAGE_SIZE = 6;

type AdminBlogPost = BlogPost & {
  id: string;
  category: string;
  published_at: string;
  hero_image_url: string;
  hero_image_key?: string | null;
  body: string;
  status: "draft" | "published";
};

type BlogDraft = Omit<AdminBlogPost, "id"> & { id?: string; image_preview: string };

function newDraft(): BlogDraft {
  return {
    title: "",
    slug: "",
    category: "Kitchen notes",
    published_at: new Date().toISOString().slice(0, 10),
    hero_image_url: "",
    image_preview: "",
    body: "",
    status: "draft",
  };
}

export function BlogManagement({ token }: { token: string }) {
  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [draft, setDraft] = useState<BlogDraft | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);

  const loadPosts = async () => {
    const result = await adminRequest<AdminBlogPost[]>("/api/admin/blog", token);
    setPosts(result);
  };

  useEffect(() => {
    let cancelled = false;
    void adminRequest<AdminBlogPost[]>("/api/admin/blog", token)
      .then((result) => {
        if (!cancelled) setPosts(result);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Blog posts could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const openEditor = (post?: AdminBlogPost) => {
    setPhoto(null);
    setError("");
    setMessage("");
    setDraft(post ? {
      id: post.id,
      title: post.title,
      slug: post.slug,
      category: post.category,
      published_at: post.published_at,
      hero_image_url: post.hero_image_key || post.hero_image_url,
      image_preview: post.hero_image_url,
      body: post.body,
      status: post.status,
    } : newDraft());
  };

  const savePost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft) return;
    if (!draft.id && !photo) {
      setError("Upload a hero image to RustFS before creating the post.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      let imageReference = draft.hero_image_url.trim();
      if (photo) {
        const uploaded = await uploadHomepageMedia(photo, token);
        imageReference = uploaded.image_key;
      }
      const payload = {
        title: draft.title.trim(),
        slug: draft.slug.trim(),
        category: draft.category.trim(),
        published_at: draft.published_at,
        hero_image_url: imageReference,
        body: draft.body.trim(),
        status: draft.status,
      };
      await adminRequest(
        draft.id ? `/api/admin/blog/${draft.id}` : "/api/admin/blog",
        token,
        { method: draft.id ? "PUT" : "POST", body: JSON.stringify(payload) },
      );
      await loadPosts();
      setDraft(null);
      setPhoto(null);
      setPage(1);
      setMessage(draft.id ? "Blog post updated." : "Blog post created.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Blog post could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const deletePost = async (post: AdminBlogPost) => {
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await adminRequest(`/api/admin/blog/${post.id}`, token, { method: "DELETE" });
      setPosts((current) => current.filter((item) => item.id !== post.id));
      if (draft?.id === post.id) setDraft(null);
      setMessage("Blog post deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Blog post could not be deleted.");
    } finally {
      setBusy(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visiblePosts = posts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <section className="mt-7 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink-950">Blog posts</h2>
          <p className="mt-1 text-sm text-ink-500">Write, publish and maintain the kitchen journal.</p>
        </div>
        <button type="button" className={primaryButton} onClick={() => openEditor()}>
          <PlusIcon className="size-4" /> Add blog post
        </button>
      </div>
      {error ? <p role="alert" className="rounded-xl border border-chili-100 bg-chili-50 p-3 text-sm text-chili-700">{error}</p> : null}
      {message ? <p role="status" className="rounded-xl border border-cardamom-200 bg-cardamom-50 p-3 text-sm text-cardamom-700">{message}</p> : null}

      {draft ? (
        <form onSubmit={savePost} className="space-y-4 rounded-2xl border border-paper-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-semibold text-ink-900">{draft.id ? "Edit blog post" : "Create blog post"}</h3>
            <button type="button" className={secondaryButton} onClick={() => setDraft(null)}>Cancel</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>Title
              <input required maxLength={255} className={fieldClass} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
            </label>
            <label className={labelClass}>URL slug
              <input required maxLength={255} className={fieldClass} placeholder="fresh-spice-notes" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} />
            </label>
            <label className={labelClass}>Category
              <input required maxLength={120} className={fieldClass} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} />
            </label>
            <label className={labelClass}>Publish date
              <input required type="date" className={fieldClass} value={draft.published_at} onChange={(event) => setDraft({ ...draft, published_at: event.target.value })} />
            </label>
            <label className={labelClass}>Status
              <select className={fieldClass} value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as BlogDraft["status"] })}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
            <label className={labelClass}>Upload hero image to RustFS
              <input required={!draft.id && !photo} type="file" accept="image/*" className={`${fieldClass} file:mr-3 file:rounded-lg file:border-0 file:bg-paper-100 file:px-3 file:py-1.5`} onChange={(event) => setPhoto(event.currentTarget.files?.[0] ?? null)} />
              {photo ? <span className="mt-1 block text-xs text-ink-500">{photo.name} will be uploaded with the post.</span> : null}
              {draft.id && !photo ? <span className="mt-1 block text-xs text-ink-500">Leave empty to keep the current hero image.</span> : null}
            </label>
            {draft.image_preview ? (
              <SmartImage src={draft.image_preview} alt={`${draft.title || "Blog post"} preview`} aspect="aspect-video" sizes="(max-width: 640px) 100vw, 50vw" wrapperClassName="rounded-xl sm:col-span-2" zoom={false} />
            ) : null}
            <label className={`${labelClass} sm:col-span-2`}>Story
              <textarea required rows={10} maxLength={100000} className={fieldClass} placeholder="Write the story. Separate paragraphs with a blank line." value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} />
            </label>
          </div>
          <div className="flex justify-end">
            <button type="submit" className={primaryButton} disabled={busy}>{busy ? "Saving…" : draft.id ? "Save changes" : "Create post"}</button>
          </div>
        </form>
      ) : null}

      {loading ? <p role="status" className="text-sm text-ink-500">Loading blog posts…</p> : posts.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visiblePosts.map((post) => (
            <article key={post.id} className="overflow-hidden rounded-xl border border-paper-200 bg-white">
              <SmartImage src={post.hero_image_url} alt={post.title} aspect="aspect-video" sizes="(max-width: 768px) 100vw, 33vw" wrapperClassName="rounded-none" zoom={false} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold text-ink-950">{post.title}</h3>
                  <span className={`chip shrink-0 ${post.status === "published" ? "border-cardamom-200 bg-cardamom-50 text-cardamom-700" : "border-paper-200 bg-paper-100 text-ink-600"}`}>
                    {post.status === "published" ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-500">{post.category} · {post.published_at}</p>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink-600">{post.body}</p>
                <div className="mt-4 flex justify-end gap-2 border-t border-paper-100 pt-3">
                  <button type="button" className={secondaryButton} onClick={() => openEditor(post)}>Edit</button>
                  <button type="button" className="rounded-xl px-3 py-2 text-sm font-semibold text-chili-700 hover:bg-chili-50 disabled:opacity-50" onClick={() => void deletePost(post)} disabled={busy}>Delete</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : !loading ? <p className="rounded-2xl border border-dashed border-paper-300 bg-white px-5 py-10 text-center text-sm text-ink-500">No blog posts yet. Add a post to start the journal.</p> : null}

      {!loading && posts.length > 0 ? (
        <Pagination page={currentPage} pageSize={PAGE_SIZE} total={posts.length} itemLabel="posts" ariaLabel="Admin blog posts pagination" onPageChange={setPage} />
      ) : null}
    </section>
  );
}
