import type { Metadata } from "next";
import { ProductCard } from "@/components/ProductCard";
import { OfferPromoCard } from "@/components/OfferPromoCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { getActiveOffers, getAllCombos } from "@/lib/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Offers & combos",
  description: "Browse current Masala House offers and curated combo packs.",
};

export default async function OffersPage() {
  const [combos, offers] = await Promise.all([getAllCombos(), getActiveOffers()]);
  const activeCombos = combos.filter((combo) => combo.is_combo && combo.status === "active");

  return (
    <>
      <section className="border-b border-paper-200 bg-paper-100 py-10 md:py-14">
        <div className="shell">
          <p className="eyebrow">Current deals</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink-950 md:text-4xl">
            Offers & combos
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-600">
            Browse active coupon offers and curated combo packs from the kitchen.
          </p>
        </div>
      </section>

      <section className="border-t border-paper-200 bg-paper-50 py-8 md:py-10" aria-labelledby="combo-packs-heading">
        <div className="shell">
          <div className="mb-5 flex items-baseline justify-between gap-3">
            <h2 id="combo-packs-heading" className="font-display text-2xl font-semibold text-ink-950">Combo packs</h2>
            <span className="text-sm text-ink-500">{activeCombos.length}</span>
          </div>
          {activeCombos.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {activeCombos.map((combo) => (
                <ProductCard key={combo.id} product={combo} density="compact" className="h-full" />
              ))}
            </div>
          ) : (
            <EmptyState title="No combo packs available yet" description="The kitchen is preparing its next set of curated bundles." />
          )}
        </div>
      </section>

      <section className="shell py-8 md:py-10" aria-labelledby="active-offers-heading">
        <div className="mb-5 flex items-baseline justify-between gap-3">
          <h2 id="active-offers-heading" className="font-display text-2xl font-semibold text-ink-950">Active offers</h2>
          <span className="text-sm text-ink-500">{offers.length}</span>
        </div>
        {offers.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => <OfferPromoCard key={offer.code} offer={offer} />)}
          </div>
        ) : (
          <EmptyState title="No active offers right now" description="Check back soon for the next kitchen offer." />
        )}
      </section>
    </>
  );
}
