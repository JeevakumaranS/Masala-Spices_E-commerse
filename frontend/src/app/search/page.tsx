import type { Metadata } from "next";
import { getCategories, getProducts } from "@/lib/api";
import { SearchClient } from "./SearchClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search every Masala House blend — by spice, dish or pack size — and jump straight to the right jar.",
};

export default async function SearchPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  return (
    <section className="shell py-8 md:py-10">
      <SearchClient products={products} categories={categories} />
    </section>
  );
}
