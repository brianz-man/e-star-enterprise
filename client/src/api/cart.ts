import { api } from './api'
import type { Cart, ApiOk } from '@/types'

const unwrap = <T>(p: Promise<{ data: ApiOk<T> }>) => p.then(r => r.data.data)

export const cartApi = {
  get:    ()                              => unwrap<Cart>(api.get('/cart')),
  add:    (productId: string, quantity = 1) => unwrap<Cart>(api.post('/cart/items', { productId, quantity })),
  update: (itemId: string, quantity: number) => unwrap<Cart>(api.put(`/cart/items/${itemId}`, { quantity })),
  remove: (itemId: string)               => unwrap<Cart>(api.delete(`/cart/items/${itemId}`)),
  clear:  ()                             => api.delete<ApiOk<{ items: []; total: 0 }>>('/cart').then(r => r.data.data),
}