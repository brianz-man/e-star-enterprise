import { useCartStore } from '@/store/cart'

// Convenience re-export
export const useCart      = () => useCartStore()
export const useCartCount = () => useCartStore(s => s.totalItems())
export const useCartTotal = () => useCartStore(s => s.totalPrice())