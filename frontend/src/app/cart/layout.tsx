import type { Metadata } from "next";

/**
 * Server wrapper around the client-only cart page — client components can't
 * export `metadata`, so this gives the tab a real title.
 */
export const metadata: Metadata = {
  title: "Your bag",
  description: "Review the blends in your bag, apply a promo code and head to checkout.",
  robots: { index: false, follow: false },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
