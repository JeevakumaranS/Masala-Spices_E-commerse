"use client";

import { FormEvent, useEffect, useState } from "react";
import { adminRequest, uploadHomepageMedia } from "@/lib/admin";
import type { Recipe } from "@/lib/types";
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
const PAGE_SIZE = 10;

type RecipeDraft = {
  id?: string;
  title: string;
  slug: string;
  cook_time_minutes: string;
  cuisine: string;
  dish_type: string;
  ingredients: string;
  steps: string;
  hero_image_url: string;
  image_preview: string;
  video_url: string;
};

function asRecipes(payload: Recipe[] | { items?: Recipe[] }): Recipe[] {
  return Array.isArray(payload) ? payload : payload.items ?? [];
}

export function RecipesManagement({ token }: { token: string }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);

  const loadRecipes = async () => {
    const payload = await adminRequest<{ items?: Recipe[] } | Recipe[]>("/api/recipes", token);
    setRecipes(asRecipes(payload));
  };

  useEffect(() => {
    let cancelled = false;
    void adminRequest<{ items?: Recipe[] } | Recipe[]>("/api/recipes", token)
      .then((payload) => {
        if (!cancelled) setRecipes(asRecipes(payload));
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Recipes could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const openEditor = (recipe?: Recipe) => {
    setPhoto(null);
    setError("");
    setMessage("");
    setDraft(recipe ? {
      id: recipe.id,
      title: recipe.title,
      slug: recipe.slug,
      cook_time_minutes: String(recipe.cook_time_minutes),
      cuisine: recipe.cuisine,
      dish_type: recipe.dish_type,
      ingredients: recipe.ingredients.join("\n"),
      steps: recipe.steps.join("\n"),
      hero_image_url: recipe.hero_image_key || recipe.hero_image_url,
      image_preview: recipe.hero_image_url,
      video_url: recipe.video_url ?? "",
    } : {
      title: "",
      slug: "",
      cook_time_minutes: "30",
      cuisine: "",
      dish_type: "",
      ingredients: "",
      steps: "",
      hero_image_url: "",
      image_preview: "",
      video_url: "",
    });
  };

  const saveRecipe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft) return;
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
        cook_time_minutes: Number(draft.cook_time_minutes),
        cuisine: draft.cuisine.trim(),
        dish_type: draft.dish_type.trim(),
        ingredients: draft.ingredients.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
        steps: draft.steps.split(/\r?\n/).map((step) => step.trim()).filter(Boolean),
        hero_image_url: imageReference,
        video_url: draft.video_url.trim() || null,
      };
      const previousSlug = draft.id ? recipes.find((recipe) => recipe.id === draft.id)?.slug : undefined;
      await adminRequest(
        draft.id ? `/api/admin/recipes/${draft.id}` : "/api/admin/recipes",
        token,
        { method: draft.id ? "PUT" : "POST", body: JSON.stringify(payload) },
      );
      await loadRecipes();
      setDraft(null);
      setPhoto(null);
      setMessage(previousSlug && previousSlug !== payload.slug
        ? "Recipe updated. Homepage selection followed the new URL slug."
        : draft.id ? "Recipe updated." : "Recipe created.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Recipe could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const deleteRecipe = async (recipe: Recipe) => {
    if (!window.confirm(`Delete “${recipe.title}”? This also removes it from the homepage selection.`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await adminRequest(`/api/admin/recipes/${recipe.id}`, token, { method: "DELETE" });
      setRecipes((current) => current.filter((item) => item.id !== recipe.id));
      if (draft?.id === recipe.id) setDraft(null);
      setMessage("Recipe deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Recipe could not be deleted.");
    } finally {
      setBusy(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(recipes.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleRecipes = recipes.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <section className="mt-7 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink-950">Recipes</h2>
          <p className="mt-1 text-sm text-ink-500">Create and maintain recipe details. Homepage recipe selection is managed separately.</p>
        </div>
        <button type="button" className={primaryButton} onClick={() => openEditor()}>
          <PlusIcon className="size-4" />
          Add recipe
        </button>
      </div>
      {error ? <p role="alert" className="rounded-xl border border-chili-100 bg-chili-50 p-3 text-sm text-chili-700">{error}</p> : null}
      {message ? <p role="status" className="rounded-xl border border-cardamom-200 bg-cardamom-50 p-3 text-sm text-cardamom-700">{message}</p> : null}

      {draft ? (
        <form onSubmit={saveRecipe} className="space-y-4 rounded-2xl border border-paper-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-semibold text-ink-900">{draft.id ? "Edit recipe" : "Create recipe"}</h3>
            <button type="button" className={secondaryButton} onClick={() => { setDraft(null); setPhoto(null); }}>Cancel</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>Recipe title
              <input required maxLength={255} className={fieldClass} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
            </label>
            <label className={labelClass}>URL slug
              <input required maxLength={255} pattern="[a-zA-Z0-9-]+" className={fieldClass} placeholder="easy-coconut-sambar" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} />
            </label>
            <label className={labelClass}>Cooking time (minutes)
              <input required type="number" min="1" max="1440" className={fieldClass} value={draft.cook_time_minutes} onChange={(event) => setDraft({ ...draft, cook_time_minutes: event.target.value })} />
            </label>
            <label className={labelClass}>Cuisine
              <input required maxLength={120} className={fieldClass} placeholder="South Indian" value={draft.cuisine} onChange={(event) => setDraft({ ...draft, cuisine: event.target.value })} />
            </label>
            <label className={labelClass}>Dish type
              <input required maxLength={120} className={fieldClass} placeholder="Main course, breakfast…" value={draft.dish_type} onChange={(event) => setDraft({ ...draft, dish_type: event.target.value })} />
            </label>
            <label className={labelClass}>Recipe video URL
              <input type="url" maxLength={2048} className={fieldClass} placeholder="https://…" value={draft.video_url} onChange={(event) => setDraft({ ...draft, video_url: event.target.value })} />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>Recipe photo URL
              <input required={!photo && !draft.hero_image_url.trim()} type="url" maxLength={2048} className={fieldClass} placeholder="Optional when uploading a photo" value={draft.hero_image_url.startsWith("homepage/") ? "" : draft.hero_image_url} onChange={(event) => setDraft({ ...draft, hero_image_url: event.target.value, image_preview: event.target.value })} />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>Upload recipe photo to RustFS
              <input type="file" accept="image/*" className={`${fieldClass} file:mr-3 file:rounded-lg file:border-0 file:bg-paper-100 file:px-3 file:py-1.5`} onChange={(event) => setPhoto(event.currentTarget.files?.[0] ?? null)} />
              {photo ? <span className="mt-1 block text-xs text-ink-500">{photo.name} will replace the current photo.</span> : null}
            </label>
            {draft.image_preview ? (
              <SmartImage src={draft.image_preview} alt={`${draft.title || "Recipe"} preview`} aspect="aspect-video" sizes="(max-width: 640px) 100vw, 50vw" wrapperClassName="rounded-xl sm:col-span-2" zoom={false} />
            ) : null}
            <label className={`${labelClass} sm:col-span-2`}>Ingredients (one per line)
              <textarea required rows={5} className={fieldClass} placeholder={"Toor dal\nSambar masala\nCoconut"} value={draft.ingredients} onChange={(event) => setDraft({ ...draft, ingredients: event.target.value })} />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>Cooking steps (one per line, in order)
              <textarea required rows={6} className={fieldClass} placeholder={"Cook the dal until soft.\nAdd vegetables and masala.\nFinish with tempering."} value={draft.steps} onChange={(event) => setDraft({ ...draft, steps: event.target.value })} />
            </label>
          </div>
          <div className="flex justify-end">
            <button type="submit" className={primaryButton} disabled={busy}>{busy ? "Saving…" : draft.id ? "Save recipe" : "Create recipe"}</button>
          </div>
        </form>
      ) : null}

      {loading ? <p role="status" className="text-sm text-ink-500">Loading recipes…</p> : recipes.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleRecipes.map((recipe) => (
            <article key={recipe.id} className="rounded-xl border border-paper-200 bg-white p-3">
              <SmartImage src={recipe.hero_image_url} alt={recipe.title} aspect="aspect-video" sizes="(max-width: 768px) 100vw, 33vw" wrapperClassName="rounded-lg" zoom={false} />
              <h3 className="mt-3 font-semibold text-ink-900">{recipe.title}</h3>
              <p className="mt-1 text-xs text-ink-600">{recipe.cuisine} · {recipe.dish_type} · {recipe.cook_time_minutes} min</p>
              <p className="mt-2 line-clamp-2 text-xs text-ink-500">{recipe.ingredients.join(", ")}</p>
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" className={secondaryButton} onClick={() => openEditor(recipe)}>Edit</button>
                <button type="button" className="rounded-xl px-3 py-2 text-sm font-semibold text-chili-700 hover:bg-chili-50 disabled:opacity-50" onClick={() => void deleteRecipe(recipe)} disabled={busy}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      ) : !loading ? <p className="rounded-2xl border border-dashed border-paper-300 bg-white px-5 py-10 text-center text-sm text-ink-500">No recipes yet. Add a recipe to get started.</p> : null}
      {!loading && recipes.length > 0 ? (
        <Pagination
          page={currentPage}
          pageSize={PAGE_SIZE}
          total={recipes.length}
          itemLabel="recipes"
          ariaLabel="Admin recipes pagination"
          onPageChange={setPage}
        />
      ) : null}
    </section>
  );
}
