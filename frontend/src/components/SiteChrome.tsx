"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchOverlay } from "@/components/SearchOverlay";
import { CartDrawer } from "@/components/CartDrawer";
import { SupportBubble } from "@/components/SupportBubble";

export function SiteChrome() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      <Header />
      <SearchOverlay />
      <CartDrawer />
      <SupportBubble />
    </>
  );
}
