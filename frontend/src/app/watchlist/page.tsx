import type { Metadata } from "next";
import { getProducts } from "@/lib/api";
import { WatchlistClient } from "./WatchlistClient";

export const metadata: Metadata = {
  title: "Your watchlist",
  description: "Your saved Masala House spice blends.",
};

export default async function WatchlistPage() {
  const products = await getProducts();

  return (
    <section className="shell py-10 md:py-14">
      <p className="eyebrow">Saved for later</p>
      <h1 className="display mt-3">Your watchlist</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-600">
        Keep your favourite blends close and find them here whenever you’re ready.
      </p>
      <WatchlistClient products={products} />
    </section>
  );
}
