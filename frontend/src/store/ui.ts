"use client";

import { create } from "zustand";

export type ToastMessage = {
  id: number;
  text: string;
  tone: "success" | "info" | "error";
  /** Optional inline action rendered next to the message. */
  action?: "cart";
};

type UIStore = {
  searchOpen: boolean;
  cartOpen: boolean;
  mobileNavOpen: boolean;
  toast: ToastMessage | null;

  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;

  openCart: () => void;
  closeCart: () => void;

  openMobileNav: () => void;
  closeMobileNav: () => void;

  showToast: (text: string, tone?: ToastMessage["tone"], action?: ToastMessage["action"]) => void;
  dismissToast: () => void;
};

let toastId = 0;

export const useUIStore = create<UIStore>((set, get) => ({
  searchOpen: false,
  cartOpen: false,
  mobileNavOpen: false,
  toast: null,

  openSearch: () => set({ searchOpen: true, mobileNavOpen: false }),
  closeSearch: () => set({ searchOpen: false }),
  toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen, mobileNavOpen: false })),

  openCart: () => set({ cartOpen: true, mobileNavOpen: false }),
  closeCart: () => set({ cartOpen: false }),

  openMobileNav: () => set({ mobileNavOpen: true }),
  closeMobileNav: () => set({ mobileNavOpen: false }),

  showToast: (text, tone = "success", action) => {
    toastId += 1;
    set({ toast: { id: toastId, text, tone, action } });
  },
  dismissToast: () => {
    // Only clear if nothing newer replaced it in the meantime.
    void get();
    set({ toast: null });
  },
}));
