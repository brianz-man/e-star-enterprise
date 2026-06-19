import { api } from './api'
import type { Order, ApiOk, DeliveryAddress } from '@/types'

export interface CreateOrderPayload {
  deliveryAddress: DeliveryAddress
  addressId?: string
  notes?: string
}

export const ordersApi = {
  create: (data: CreateOrderPayload) =>
    api.post<ApiOk<Order>>('/orders', data).then(r => r.data.data),

  list: () =>
    api.get<{ success: boolean; data: Order[] }>('/orders').then(r => r.data.data),

  get: (id: string) =>
    api.get<ApiOk<Order>>(`/orders/${id}`).then(r => r.data.data),
}