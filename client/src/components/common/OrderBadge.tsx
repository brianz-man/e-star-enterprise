import { orderBadge } from '@/utils/orderBadge'
import type { OrderStatus } from '@/types'

export const OrderBadge = ({ status }: { status: OrderStatus }) => {
  const cfg = orderBadge[status]
  return <span className={`badge ${cfg.className}`}>{cfg.label}</span>
}