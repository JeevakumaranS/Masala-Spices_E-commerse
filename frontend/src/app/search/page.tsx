import type { Metadata } from "next";
import { getCategories, getProducts } from "@/lib/api";
import { SearchClient } from "./SearchClient";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search every Masala House blend — by spice, dish or pack size — and jump straight to the right jar.",
};

export default async function SearchPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  return (
    <>
      {/* ============================ HERO ============================ */}
      <section className="relative overflow-hidden bg-[radial-gradient(130%_100%_at_0%_0%,var(--color-saffron-50),transparent_55%),radial-gradient(110%_100%_at_100%_0%,var(--color-masala-50),transparent_50%)]">
        <div className="grain">
          <div className="shell py-14 md:py-20">
            <p className="eyebrow">Find your blend</p>
            <h1 className="display mt-4 max-w-[14ch]">Search the Masala House pantry</h1>
            <p className="lede mt-5 max-w-2xl">
              Type a spice, a dish, or a blend — we&apos;ll match it against every jar in the
              catalogue, from sambar to biryani.
            </p>
          </div>
        </div>
      </section>

      {/* ============================ SEARCH + RESULTS ============================ */}
      <section className="shell py-14 md:py-20">
        <SearchClient products={products} categories={categories} />
      </section>
    </>
  );
}
