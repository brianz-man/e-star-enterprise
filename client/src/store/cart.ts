import { create } from "zustand";
import type { Cart, CartItem } from "@/types";
import { cartApi } from "@/api/cart";
import toast from "react-hot-toast";
import { getApiError } from "@/utils/getApiError";

interface CartState {
  cart: Cart | null;
  isOpen: boolean;
  isLoading: boolean;

  // Computed
  totalItems: () => number;
  totalPrice: () => number;

  // Actions
  openDrawer: () => void;
  closeDrawer: () => void;
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  resetCart: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  isOpen: false,
  isLoading: false,

  totalItems: () =>
    get().cart?.items.reduce((s: number, i: CartItem) => s + i.quantity, 0) ??
    0,

  totalPrice: () => get().cart?.total ?? 0,

  openDrawer: () => set({ isOpen: true }),
  closeDrawer: () => set({ isOpen: false }),

  fetchCart: async () => {
    set({ isLoading: true });
    try {
      set({ cart: await cartApi.get() });
    } catch (e) {
      // Keep cart loading non-blocking while surfacing the failure to the user.
      toast.error(getApiError(e, "Could not load cart"));
      console.debug("Cart fetch failed:", e);
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (productId, quantity = 1) => {
    set({ isLoading: true });

    try {
      set({ cart: await cartApi.add(productId, quantity), isOpen: true });
    } catch (error: unknown) {
      toast.error(getApiError(error, "Could not add item to cart"));
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateQuantity: async (itemId, quantity) => {
    set({ isLoading: true });
    try {
      set({ cart: await cartApi.update(itemId, quantity) });
    } catch (error: unknown) {
      toast.error(getApiError(error, "Could not update cart"));
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  removeItem: async (itemId) => {
    set({ isLoading: true });
    try {
      set({ cart: await cartApi.remove(itemId) });
    } catch (error: unknown) {
      toast.error(getApiError(error, "Could not remove item from cart"));
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  clearCart: async () => {
    set({ isLoading: true });
    try {
      await cartApi.clear();
      set({ cart: null });
    } catch (error: unknown) {
      toast.error(getApiError(error, "Could not clear cart"));
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  resetCart: () => set({ cart: null, isOpen: false }),
}));
