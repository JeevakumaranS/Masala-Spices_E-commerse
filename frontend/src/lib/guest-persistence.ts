"use client";

import {
  fetchGuestCart,
  fetchGuestWatchlist,
  syncGuestCart,
  syncGuestWatchlist,
} from "@/lib/guest-api";
import { useCartStore } from "@/store/cart";
import { useWatchlistStore } from "@/store/watchlist";
import { useUIStore } from "@/store/ui";

const CART_MIGRATION_KEY = "masala-house-cart-server-sync-v1";
const WATCHLIST_MIGRATION_KEY = "masala-house-watchlist-server-sync-v1";

let initialization: Promise<void> | null = null;

export function initializeGuestPersistence(): Promise<void> {
  if (initialization) return initialization;
  initialization = (async () => {
    try {
      const serverCart = await fetchGuestCart();
      const serverWatchlist = await fetchGuestWatchlist();
      const localCart = useCartStore.getState().lines;
      const localWatchlist = useWatchlistStore.getState().slugs;
      const cartMigrated = localStorage.getItem(CART_MIGRATION_KEY) === "1";
      const watchlistMigrated = localStorage.getItem(WATCHLIST_MIGRATION_KEY) === "1";

      if (!cartMigrated && serverCart.length === 0 && localCart.length > 0) {
        await syncGuestCart(localCart);
        localStorage.setItem(CART_MIGRATION_KEY, "1");
      } else {
        useCartStore.setState({ lines: serverCart });
        localStorage.setItem(CART_MIGRATION_KEY, "1");
      }
      if (!watchlistMigrated && serverWatchlist.length === 0 && localWatchlist.length > 0) {
        await syncGuestWatchlist(localWatchlist);
        localStorage.setItem(WATCHLIST_MIGRATION_KEY, "1");
      } else {
        useWatchlistStore.setState({ slugs: serverWatchlist });
        localStorage.setItem(WATCHLIST_MIGRATION_KEY, "1");
      }
    } catch (error) {
      console.error("Guest data initialization failed.", error);
      useUIStore.getState().showToast(
        "Your bag and watchlist could not be loaded. Please check your connection.",
        "error",
      );
      initialization = null;
    }
  })();
  return initialization;
}
