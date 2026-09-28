"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { SmartImage } from "@/components/ui/SmartImage";
import { ClockIcon, CloseIcon, LeafIcon } from "@/components/ui/icons";

type TimeBucket = "u30" | "30-60" | "60+";

const TIME_BUCKETS: { value: TimeBucket; label: string }[] = [
  { value: "u30", label: "Under 30 mins" },
  { value: "30-60", label: "30–60 mins" },
  { value: "60+", label: "60+ mins" },
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

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron-400",
        active
          ? "border-saffron-400 bg-saffron-400 text-ink-950"
          : "border-white/15 bg-white/[0.07] text-paper-200 hover:border-saffron-400/50 hover:bg-white/[0.1] hover:text-saffron-200",
      )}
    >
      {label}
    </button>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[0.68rem] font-bold tracking-[0.16em] text-paper-400 uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      href={`/recipes/${recipe.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-paper-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-paper-300 hover:shadow-lg"
    >
      <SmartImage
        src={recipe.hero_image_url}
        alt={recipe.title}
        aspect="aspect-video"
        zoom
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />
      <div className="flex flex-1 flex-col p-5">
        <p className="eyebrow">{recipe.cuisine}</p>
        <h3 className="mt-2.5 font-display text-xl leading-snug font-semibold text-ink-950 transition-colors group-hover:text-masala-800">
          {recipe.title}
        </h3>
        <p className="mt-auto flex items-center gap-1.5 pt-4 text-sm text-ink-500">
          <ClockIcon className="size-4 shrink-0 text-masala-600" />
          <span className="truncate">
            {recipe.cook_time_minutes} mins · {recipe.dish_type}
          </span>
        </p>
      </div>
    </Link>
  );
}

/**
 * Client half of the recipes index: dark hero band with filter chips plus the
 * recipe grid. Receives the (server-fetched) recipes as plain props.
 */
export function RecipeBrowser({ recipes }: { recipes: Recipe[] }) {
  const cuisines = useMemo(() => uniqueSorted(recipes.map((r) => r.cuisine)), [recipes]);
  const dishTypes = useMemo(() => uniqueSorted(recipes.map((r) => r.dish_type)), [recipes]);

  const [cuisine, setCuisine] = useState<string | null>(null);
  const [dishType, setDishType] = useState<string | null>(null);
  const [time, setTime] = useState<TimeBucket | null>(null);

  const hasFilters = cuisine !== null || dishType !== null || time !== null;

  const clearFilters = () => {
    setCuisine(null);
    setDishType(null);
    setTime(null);
  };

  const filtered = recipes.filter((recipe) => {
    if (cuisine !== null && recipe.cuisine !== cuisine) return false;
    if (dishType !== null && recipe.dish_type !== dishType) return false;
    if (time !== null && !inTimeBucket(recipe.cook_time_minutes, time)) return false;
    return true;
  });

  return (
    <>
      {/* ============================ HERO + FILTERS ============================ */}
      <section className="relative overflow-hidden bg-ink-950 py-14 md:py-20">
        <div className="grain">
          <div className="shell">
            <p className="eyebrow text-saffron-300">Cook with confidence</p>
            <h1 className="display mt-4 max-w-[15ch] text-paper-50">
              Recipes that put the jar to work.
            </h1>
            <p className="lede mt-5 max-w-2xl text-paper-300">
              Written for home cooks — measured in spoons, not scales, and timed for a
              weeknight. Filter by cuisine, dish type, or how long you&apos;ve got.
            </p>

            {recipes.length > 0 ? (
              <div className="mt-9 flex flex-col gap-3.5 border-t border-white/10 pt-7">
                {cuisines.length > 1 ? (
                  <FilterRow label="Cuisine">
                    <FilterChip
                      label="All"
                      active={cuisine === null}
                      onClick={() => setCuisine(null)}
                    />
                    {cuisines.map((value) => (
                      <FilterChip
                        key={value}
                        label={value}
                        active={cuisine === value}
                        onClick={() => setCuisine(cuisine === value ? null : value)}
                      />
                    ))}
                  </FilterRow>
                ) : null}

                {dishTypes.length > 1 ? (
                  <FilterRow label="Dish type">
                    <FilterChip
                      label="All"
                      active={dishType === null}
                      onClick={() => setDishType(null)}
                    />
                    {dishTypes.map((value) => (
                      <FilterChip
                        key={value}
                        label={value}
                        active={dishType === value}
                        onClick={() => setDishType(dishType === value ? null : value)}
                      />
                    ))}
                  </FilterRow>
                ) : null}

                <FilterRow label="Cook time">
                  <FilterChip
                    label="Any"
                    active={time === null}
                    onClick={() => setTime(null)}
                  />
                  {TIME_BUCKETS.map((bucket) => (
                    <FilterChip
                      key={bucket.value}
                      label={bucket.label}
                      active={time === bucket.value}
                      onClick={() => setTime(time === bucket.value ? null : bucket.value)}
                    />
                  ))}
                </FilterRow>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* ============================ GRID ============================ */}
      <section className="shell py-14 md:py-20">
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p role="status" className="text-sm text-ink-500">
                Showing{" "}
                <span className="font-semibold text-ink-900">{filtered.length}</span> of{" "}
                {recipes.length} recipes
              </p>
              {hasFilters && filtered.length > 0 ? (
                <button type="button" className="btn btn-secondary btn-sm" onClick={clearFilters}>
                  <CloseIcon className="size-3.5" />
                  Clear filters
                </button>
              ) : null}
            </div>

            {filtered.length === 0 ? (
              <div className="mt-6 flex flex-col items-center">
                <EmptyState
                  className="w-full"
                  eyebrow="No matches"
                  title="Nothing fits those filters"
                  description="Try a different cuisine or cook time — or clear the filters to see every recipe again."
                />
                <button type="button" className="btn btn-primary mt-5" onClick={clearFilters}>
                  <CloseIcon className="size-4" />
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((recipe, index) => (
                  <Reveal key={recipe.slug} delay={(index % 3) * 80} className="h-full">
                    <RecipeCard recipe={recipe} />
                  </Reveal>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
