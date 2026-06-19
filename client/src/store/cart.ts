import { create } from 'zustand'
import type { Cart, CartItem } from '@/types'
import { cartApi } from '@/api/cart'

interface CartState {
  cart:       Cart | null
  isOpen:     boolean
  isLoading:  boolean

  // Computed
  totalItems: () => number
  totalPrice: () => number

  // Actions
  openDrawer:     () => void
  closeDrawer:    () => void
  fetchCart:      () => Promise<void>
  addItem:        (productId: string, quantity?: number) => Promise<void>
  updateQuantity: (itemId: string, quantity: number)    => Promise<void>
  removeItem:     (itemId: string)                      => Promise<void>
  clearCart:      () => Promise<void>
  resetCart:      () => void
}

export const useCartStore = create<CartState>((set, get) => ({
  cart:      null,
  isOpen:    false,
  isLoading: false,

  totalItems: () =>
    get().cart?.items.reduce((s: number, i: CartItem) => s + i.quantity, 0) ?? 0,

  totalPrice: () =>
    get().cart?.total ?? 0,

  openDrawer:  () => set({ isOpen: true }),
  closeDrawer: () => set({ isOpen: false }),

  fetchCart: async () => {
    set({ isLoading: true })
    try   { set({ cart: await cartApi.get() }) }
    catch (e) {
      // Silently fail if user not logged in — this is called on app init
      console.debug('Cart fetch failed:', e)
    }
    finally { set({ isLoading: false }) }
  },

  addItem: async (productId, quantity = 1) => {
    set({ isLoading: true })
    try   { set({ cart: await cartApi.add(productId, quantity), isOpen: true }) }
    catch (e) {
      set({ isLoading: false })
      throw e // Let component handle the error with toast
    }
  },

  updateQuantity: async (itemId, quantity) => {
    set({ isLoading: true })
    try   { set({ cart: await cartApi.update(itemId, quantity) }) }
    catch (e) {
      set({ isLoading: false })
      throw e
    }
  },

  removeItem: async (itemId) => {
    set({ isLoading: true })
    try   { set({ cart: await cartApi.remove(itemId) }) }
    catch (e) {
      set({ isLoading: false })
      throw e
    }
  },

  clearCart: async () => {
    set({ isLoading: true })
    try   { await cartApi.clear(); set({ cart: null }) }
    catch (e) {
      set({ isLoading: false })
      throw e
    }
  },

  resetCart: () => set({ cart: null, isOpen: false }),
}))