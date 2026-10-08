import { apiClient } from "@/lib/http";
import type { CartLine } from "@/store/cart";
import { useUIStore } from "@/store/ui";

type ServerCartLine = CartLine;

let cartQueue: Promise<void> = Promise.resolve();
let watchlistQueue: Promise<void> = Promise.resolve();
let guestSessionRequest: Promise<void> | null = null;

export function ensureGuestSession(): Promise<void> {
  if (!guestSessionRequest) {
    guestSessionRequest = apiClient.get("/api/guest/session")
      .then(() => undefined)
      .catch((error: unknown) => {
        guestSessionRequest = null;
        throw error;
      });
  }
  return guestSessionRequest;
}

function reportSyncFailure(error: unknown) {
  console.error("Guest data could not be synchronized with the server.", error);
  useUIStore.getState().showToast(
    "Your saved bag or watchlist could not be synced. Please check your connection and try again.",
    "error",
  );
}

export async function fetchGuestCart(): Promise<ServerCartLine[]> {
  await ensureGuestSession();
  const response = await apiClient.get<ServerCartLine[]>("/api/cart");
  return response.data;
}

export function syncGuestCart(lines: CartLine[]): Promise<ServerCartLine[]> {
  const items = lines.map(({ id, variantId, qty }) => ({
    product_id: id,
    variant_id: variantId,
    qty,
  }));
  const operation = cartQueue.then(async () => {
    await ensureGuestSession();
    return apiClient.put<ServerCartLine[]>("/api/cart", { items });
  });
  cartQueue = operation.then(() => undefined, () => undefined);
  return operation.then(async (response) => {
    const { useCartStore } = await import("@/store/cart");
    useCartStore.setState({ lines: response.data });
    return response.data;
  });
}

export function persistGuestCart(lines: CartLine[]): void {
  void syncGuestCart(lines).catch(async (error: unknown) => {
    reportSyncFailure(error);
    try {
      const current = await fetchGuestCart();
      const { useCartStore } = await import("@/store/cart");
      useCartStore.setState({ lines: current });
    } catch (recoveryError) {
      console.error("The server cart could not be reloaded after a sync failure.", recoveryError);
    }
  });
}

export async function fetchGuestWatchlist(): Promise<string[]> {
  await ensureGuestSession();
  const response = await apiClient.get<string[]>("/api/watchlist");
  return response.data;
}

export function syncGuestWatchlist(slugs: string[]): Promise<string[]> {
  const operation = watchlistQueue.then(async () => {
    await ensureGuestSession();
    return apiClient.put<string[]>("/api/watchlist", { slugs });
  });
  watchlistQueue = operation.then(() => undefined, () => undefined);
  return operation.then(async (response) => {
    const { useWatchlistStore } = await import("@/store/watchlist");
    useWatchlistStore.setState({ slugs: response.data });
    return response.data;
  });
}

export function persistGuestWatchlist(slugs: string[]): void {
  void syncGuestWatchlist(slugs).catch(async (error: unknown) => {
    reportSyncFailure(error);
    try {
      const current = await fetchGuestWatchlist();
      const { useWatchlistStore } = await import("@/store/watchlist");
      useWatchlistStore.setState({ slugs: current });
    } catch (recoveryError) {
      console.error("The server watchlist could not be reloaded after a sync failure.", recoveryError);
    }
  });
}
