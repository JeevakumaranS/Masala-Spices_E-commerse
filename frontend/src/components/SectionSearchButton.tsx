"use client";

import { SearchIcon } from "@/components/ui/icons";
import { useUIStore } from "@/store/ui";

export function SectionSearchButton({ label }: { label: string }) {
  const openSearch = useUIStore((state) => state.openSearch);

  return (
    <button
      type="button"
      onClick={openSearch}
      aria-label={`Search ${label}`}
      title={`Search ${label}`}
      className="grid size-9 shrink-0 place-items-center rounded-full border border-paper-200 bg-white text-masala-700 transition hover:border-masala-300 hover:bg-masala-50"
    >
      <SearchIcon className="size-4" />
    </button>
  );
}
