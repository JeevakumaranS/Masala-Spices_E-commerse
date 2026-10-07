"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { SearchOverlay } from "@/components/SearchOverlay";
import { CartDrawer } from "@/components/CartDrawer";
import { SupportBubble } from "@/components/SupportBubble";
import { initializeGuestPersistence } from "@/lib/guest-persistence";

export function SiteChrome() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith("/admin")) void initializeGuestPersistence();
  }, [pathname]);

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
