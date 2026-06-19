import type { OrderStatus } from '@/types'

interface BadgeConfig { label: string; className: string }

export const orderBadge: Record<OrderStatus, BadgeConfig> = {
  PENDING:    { label: 'Pending',    className: 'bg-amber-100  text-amber-700'  },
  CONFIRMED:  { label: 'Confirmed',  className: 'bg-blue-100   text-blue-700'   },
  PROCESSING: { label: 'Processing', className: 'bg-purple-100 text-purple-700' },
  SHIPPED:    { label: 'Shipped',    className: 'bg-cyan-100   text-cyan-700'   },
  DELIVERED:  { label: 'Delivered',  className: 'bg-green-100  text-green-700'  },
  CANCELLED:  { label: 'Cancelled',  className: 'bg-red-100    text-red-700'    },
}