import { api } from './api'
import type {
  AdminCatalog,
  AdminOrder,
  AdminUser,
  ApiList,
  ApiOk,
  DashboardStats,
  InventoryProduct,
  OrderStatus,
  Product,
} from '@/types'

interface DashboardData {
  stats: DashboardStats
  recentOrders: AdminOrder[]
  lowStock: { id: string; name: string; sku: string; stockQty: number; brand: { name: string } }[]
}

export interface ProductPayload {
  name: string
  description: string
  sku: string
  price: number
  comparePrice?: number
  stockQty: number
  lowStockAt: number
  brandId: string
  categoryId: string
  isFeatured: boolean
  weight?: number
  compatibility: { brand: string; printerModel: string; printerSeries?: string }[]
}

export const adminApi = {
  dashboard: () =>
    api.get<ApiOk<DashboardData>>('/admin/dashboard').then(r => r.data.data),

  orders: (params?: { page?: number; limit?: number; status?: OrderStatus }) =>
    api.get<ApiList<AdminOrder>>('/admin/orders', { params }).then(r => r.data),

  updateOrderStatus: (id: string, status: OrderStatus) =>
    api.put<ApiOk<AdminOrder>>(`/admin/orders/${id}/status`, { status }).then(r => r.data.data),

  users: (params?: { page?: number; limit?: number }) =>
    api.get<ApiList<AdminUser>>('/admin/users', { params }).then(r => r.data),

  inventory: () =>
    api.get<ApiOk<InventoryProduct[]>>('/admin/inventory').then(r => r.data.data),

  adjustStock: (id: string, stockQty: number) =>
    api.put<ApiOk<Product>>(`/admin/products/${id}/stock`, { stockQty }).then(r => r.data.data),

  catalog: () =>
    api.get<ApiOk<AdminCatalog>>('/admin/catalog').then(r => r.data.data),

  products: (page?: number, limit?: number) =>
    api.get<ApiList<Product> | ApiOk<Product[]>>('/admin/products', { params: { page, limit } })
      .then(r => {
        // Check if response has meta property (new pagination format)
        if ('meta' in r.data) {
          return r.data as ApiList<Product>
        }
        // Fallback for old format without pagination
        return { data: r.data.data, meta: { total: r.data.data.length, page: 1, pages: 1 } } as ApiList<Product>
      }),

  product: (id: string) =>
    api.get<ApiOk<Product>>(`/admin/products/${id}`).then(r => r.data.data),
}
