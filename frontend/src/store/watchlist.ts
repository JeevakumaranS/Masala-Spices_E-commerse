"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { persistGuestWatchlist } from "@/lib/guest-api";

type WatchlistState = {
  slugs: string[];
  toggle: (slug: string) => void;
  remove: (slug: string) => void;
  clear: () => void;
};

function validSlugs(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((slug): slug is string => typeof slug === "string"))]
    : [];
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      slugs: [],
      toggle: (slug) => {
        set((state) => ({
          slugs: state.slugs.includes(slug)
            ? state.slugs.filter((savedSlug) => savedSlug !== slug)
            : [...state.slugs, slug],
        }));
        persistGuestWatchlist(get().slugs);
      },
      remove: (slug) => {
        set((state) => ({ slugs: state.slugs.filter((savedSlug) => savedSlug !== slug) }));
        persistGuestWatchlist(get().slugs);
      },
      clear: () => {
        set({ slugs: [] });
        persistGuestWatchlist([]);
      },
    }),
    {
      name: "masala-house-wishlist-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ slugs: state.slugs }),
      version: 1,
      migrate: (persistedState: unknown) => {
        if (Array.isArray(persistedState)) {
          return { slugs: validSlugs(persistedState) };
        }
        if (persistedState && typeof persistedState === "object") {
          return {
            slugs: validSlugs((persistedState as { slugs?: unknown }).slugs),
          };
        }
        return { slugs: [] };
      },
    },
  ),
);

export function useWatchlistHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
