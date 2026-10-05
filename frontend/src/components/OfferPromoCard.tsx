import Link from "next/link";
import type { ActiveOffer } from "@/lib/types";
import { formatINR } from "@/lib/format";
import { ArrowRightIcon } from "@/components/ui/icons";

function offerValue(offer: ActiveOffer): string {
  if (offer.kind === "percentage") return `${offer.discount_value}% off`;
  if (offer.kind === "fixed") return `${formatINR(offer.discount_value)} off`;
  if (offer.kind === "buy_x_get_y") {
    return `Buy ${offer.buy_quantity}, get ${offer.free_quantity} free`;
  }
  return offer.label;
}

export function OfferPromoCard({ offer }: { offer: ActiveOffer }) {
  return (
    <Link
      href="/cart"
      className="group flex w-full flex-col rounded-xl border border-paper-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-masala-300 hover:shadow-md"
    >
      <p className="text-[0.62rem] font-semibold leading-tight tracking-[0.12em] text-saffron-700 uppercase">Featured offer</p>
      <span className="mt-2 inline-flex w-fit max-w-full break-all rounded-lg bg-saffron-100 px-2 py-1 font-mono text-xs font-bold text-ink-900">
        {offer.code}
      </span>
      <h3 className="mt-2 font-display text-sm leading-snug font-semibold text-ink-950">
        {offer.label}
      </h3>
      <div className="mt-8 min-h-0">
        <p className="text-xs font-semibold leading-tight text-masala-700">{offerValue(offer)}</p>
        <p className="mt-1 text-[0.65rem] leading-tight text-ink-500">
          Minimum order {formatINR(offer.minimum_order)}
          {offer.max_discount ? ` · Up to ${formatINR(offer.max_discount)}` : ""}
        </p>
        {offer.first_order_only ? <p className="mt-1 text-[0.65rem] leading-tight text-ink-500">First order only</p> : null}
      </div>
      <span className="mt-2 inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-masala-700 transition group-hover:text-masala-900">
        Use in cart <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
