import type { Metadata } from "next";

/** Server wrapper around the client-only checkout page (titles need a server file). */
export const metadata: Metadata = {
  title: "Checkout",
  description: "Add your delivery details and place your order — no online payment, with admin confirmation by phone.",
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
