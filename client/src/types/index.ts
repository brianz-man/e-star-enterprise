// ─── Enums ────────────────────────────────────────────────────────────────────
export type Role        = 'CUSTOMER' | 'ADMIN' | 'SUPERADMIN'
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
export type PayStatus   = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'
export type PayProvider = 'MPESA' | 'CARD'
export type SortOption  = 'newest' | 'price_asc' | 'price_desc' | 'name_asc'

// ─── Entities ─────────────────────────────────────────────────────────────────
export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  role: Role
  isVerified: boolean
  isActive: boolean
  createdAt: string
}

export interface Brand    { id: string; name: string; slug: string; logoUrl?: string }
export interface Category { id: string; name: string; slug: string; description?: string; parentId?: string; children?: Category[] }

export interface ProductImage {
  id: string; url: string; publicId: string
  isPrimary: boolean; altText?: string; sortOrder: number
}
export interface PrinterCompatibility {
  id: string; brand: string; printerModel: string; printerSeries?: string
}
export interface Review {
  id: string; rating: number; title?: string; body?: string
  createdAt: string; isVisible: boolean
  user: { firstName: string; lastName: string }
}
export interface Product {
  id: string; name: string; slug: string; description: string; sku: string
  price: number | string        // Prisma Decimal comes as string over JSON
  comparePrice?: number | string | null
  stockQty: number; lowStockAt: number
  isActive: boolean; isFeatured: boolean
  brand: Brand; category: Category
  images: ProductImage[]
  compatibility: PrinterCompatibility[]
  reviews?: Review[]
  avgRating?: number | null
  reviewCount?: number
  createdAt: string; updatedAt: string
}

export interface CartItem { id: string; quantity: number; product: Product; addedAt: string }
export interface Cart     { id: string; items: CartItem[]; total: number }

export interface DeliveryAddress {
  firstName: string; lastName: string; phone: string
  county: string; town: string; street: string; postalCode?: string
}
export interface Address extends DeliveryAddress {
  id: string; userId: string; label: string; isDefault: boolean; createdAt: string
}
export interface OrderItem {
  id: string; name: string; sku: string
  quantity: number; price: number | string; total: number | string
}
export interface PaymentSummary {
  status: PayStatus; amount: number | string
  mpesaReceiptNo: string | null; paidAt: string | null
}
export interface Order {
  id: string; orderNumber: string; status: OrderStatus
  subtotal: number | string; deliveryFee: number | string; totalAmount: number | string
  deliveryAddress: DeliveryAddress; notes?: string
  items: OrderItem[]; payment?: PaymentSummary | null
  createdAt: string; updatedAt: string
}

// ─── API shapes ───────────────────────────────────────────────────────────────
export interface ApiOk<T>    { success: true;  data: T }
export interface ApiList<T>  { success: true;  data: T[]; meta?: { total: number; page: number; pages: number } }
export interface ApiAuth     { success: true;  accessToken: string; user: User }
export interface ApiRefresh  { success: true;  accessToken: string }

// ─── Query params ─────────────────────────────────────────────────────────────
export interface ProductQuery {
  page?: number; limit?: number
  brand?: string; category?: string; search?: string
  sort?: SortOption; featured?: boolean
  minPrice?: number; maxPrice?: number
}

// ─── Admin shapes ─────────────────────────────────────────────────────────────
export interface DashboardStats {
  totalOrders: number; totalRevenue: number | string
  totalUsers: number; totalProducts: number
}
export interface AdminOrder extends Order {
  user: { firstName: string; lastName: string; email: string; phone?: string }
}

export interface AdminUser {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  role: Role
  isActive: boolean
  createdAt: string
  _count: { orders: number }
}

export interface InventoryProduct extends Product {
  brand: { id?: string; name: string }
  category: { id?: string; name: string }
}

export interface AdminCatalog {
  brands: Brand[]
  categories: Category[]
}