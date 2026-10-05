"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Recipe } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { Reveal } from "@/components/ui/Reveal";
import { SmartImage } from "@/components/ui/SmartImage";
import {
  ChevronDownIcon,
  ClockIcon,
  CloseIcon,
  LeafIcon,
  SearchIcon,
} from "@/components/ui/icons";

type TimeBucket = "u30" | "30-60" | "60+";
const PAGE_SIZE = 12;

const TIME_BUCKETS: { value: TimeBucket; label: string }[] = [
  { value: "u30", label: "Under 30 minutes" },
  { value: "30-60", label: "30–60 minutes" },
  { value: "60+", label: "Over 60 minutes" },
];

/** Filter options are derived from whatever the API actually returned. */
function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim() !== ""))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function inTimeBucket(minutes: number, bucket: TimeBucket): boolean {
  if (bucket === "u30") return minutes < 30;
  if (bucket === "30-60") return minutes >= 30 && minutes <= 60;
  return minutes > 60;
}

function FilterSelect({
  value,
  onClick,
  options,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onClick: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onClick(event.target.value)}
        aria-label={ariaLabel}
        className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-paper-200 bg-white px-3 pr-9 text-sm font-medium text-ink-700 shadow-xs transition-colors hover:border-paper-300 focus:border-masala-400 focus:outline-none focus:ring-2 focus:ring-masala-100"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-400" />
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      href={`/recipes/${recipe.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-paper-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-paper-300 hover:shadow-md"
    >
      <SmartImage
        src={recipe.hero_image_url}
        alt={recipe.title}
        aspect="aspect-[4/3]"
        zoom
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[0.62rem] font-semibold tracking-[0.14em] text-masala-600 uppercase">
          {recipe.cuisine}
        </p>
        <h3 className="mt-1.5 font-display text-base leading-snug font-semibold text-ink-950 transition-colors group-hover:text-masala-800">
          {recipe.title}
        </h3>
        <p className="mt-auto flex items-center gap-1.5 pt-3 text-xs text-ink-500">
          <ClockIcon className="size-3.5 shrink-0 text-masala-600" />
          <span className="truncate">
            {recipe.cook_time_minutes} mins · {recipe.dish_type}
          </span>
        </p>
      </div>
    </Link>
  );
}

/**
 * Client half of the recipes index: search and filter controls plus the
 * recipe grid. Receives the (server-fetched) recipes as plain props.
 */
export function RecipeBrowser({ recipes }: { recipes: Recipe[] }) {
  const cuisines = useMemo(() => uniqueSorted(recipes.map((r) => r.cuisine)), [recipes]);
  const dishTypes = useMemo(() => uniqueSorted(recipes.map((r) => r.dish_type)), [recipes]);

  const [cuisine, setCuisine] = useState<string | null>(null);
  const [dishType, setDishType] = useState<string | null>(null);
  const [time, setTime] = useState<TimeBucket | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const hasFilters = cuisine !== null || dishType !== null || time !== null || search.trim() !== "";

  const clearFilters = () => {
    setCuisine(null);
    setDishType(null);
    setTime(null);
    setSearch("");
    setPage(1);
  };

  const filtered = recipes.filter((recipe) => {
    if (cuisine !== null && recipe.cuisine !== cuisine) return false;
    if (dishType !== null && recipe.dish_type !== dishType) return false;
    if (time !== null && !inTimeBucket(recipe.cook_time_minutes, time)) return false;
    const query = search.trim().toLocaleLowerCase();
    if (
      query &&
      ![
        recipe.title,
        recipe.cuisine,
        recipe.dish_type,
        ...recipe.ingredients,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query)
    ) {
      return false;
    }
    return true;
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleRecipes = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const timeOptions = TIME_BUCKETS.map(({ value, label }) => ({ value, label }));

  return (
    <>
      <section className="border-b border-paper-200 bg-paper-100 py-6 md:py-8">
        <div className="shell">
          <h1 className="font-display text-2xl font-bold text-ink-950 md:text-3xl">
            Find a recipe
          </h1>
          {recipes.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-5">
              <label className="relative col-span-2 sm:col-span-2 lg:col-span-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-ink-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search recipes"
                  aria-label="Search recipes and ingredients"
                  className="h-10 w-full rounded-xl border border-paper-200 bg-white pr-3 pl-9 text-sm text-ink-900 shadow-xs placeholder:text-ink-400 focus:border-masala-400 focus:outline-none focus:ring-2 focus:ring-masala-100"
                />
              </label>
              <FilterSelect
                value={cuisine ?? ""}
                onClick={(value) => {
                  setCuisine(value || null);
                  setPage(1);
                }}
                options={cuisines.map((value) => ({ value, label: value }))}
                placeholder="All cuisines"
                ariaLabel="Filter by cuisine"
              />
              <FilterSelect
                value={dishType ?? ""}
                onClick={(value) => {
                  setDishType(value || null);
                  setPage(1);
                }}
                options={dishTypes.map((value) => ({ value, label: value }))}
                placeholder="All dish types"
                ariaLabel="Filter by dish type"
              />
              <FilterSelect
                value={time ?? ""}
                onClick={(value) => {
                  setTime(TIME_BUCKETS.find((bucket) => bucket.value === value)?.value ?? null)
                  setPage(1);
                }}
                options={timeOptions}
                placeholder="Any cook time"
                ariaLabel="Filter by cooking time"
              />
              {hasFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-paper-200 bg-white px-3 text-sm font-semibold text-masala-700 transition-colors hover:border-masala-200 hover:bg-masala-50"
                >
                  <CloseIcon className="size-4" />
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {/* ============================ GRID ============================ */}
      <section className="shell py-6 md:py-8">
        {recipes.length === 0 ? (
          <EmptyState
            icon={<LeafIcon className="size-7" />}
            eyebrow="No recipes yet"
            title="The recipe book is still simmering"
            description="We haven't received any recipes from the kitchen API. The journal has plenty to read meanwhile."
            action={{ label: "Read the journal", href: "/blog" }}
          />
        ) : (
          <>
            {hasFilters && filtered.length > 0 ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs font-medium text-masala-700 transition-colors hover:text-masala-900"
                >
                  <CloseIcon className="size-3" />
                  Clear
                </button>
              </div>
            ) : null}

            {filtered.length === 0 ? (
              <div className="mt-6 flex flex-col items-center">
                <EmptyState
                  className="w-full"
                  eyebrow="No matches"
                  title="Nothing fits those filters"
                  description="Try a different cuisine or cook time — or clear the filters to see every recipe again."
                />
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 flex items-center gap-1.5 text-xs font-medium text-masala-700 transition-colors hover:text-masala-900"
                >
                  <CloseIcon className="size-3.5" />
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleRecipes.map((recipe, index) => (
                  <Reveal key={recipe.slug} delay={(index % 3) * 80} className="h-full">
                    <RecipeCard recipe={recipe} />
                  </Reveal>
                ))}
              </div>
            )}
            {filtered.length > 0 ? (
              <Pagination
                page={currentPage}
                pageSize={PAGE_SIZE}
                total={filtered.length}
                itemLabel="recipes"
                ariaLabel="Recipes pagination"
                onPageChange={setPage}
              />
            ) : null}
          </>
        )}
      </section>
    </>
  );
}
