import type { Metadata } from "next";

/** Server wrapper around the client-only order lookup page. */
export const metadata: Metadata = {
  title: "Order status",
  description: "Look up where your Masala House order is — order number plus the phone you ordered with.",
  robots: { index: false, follow: false },
};

export default function OrderStatusLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
