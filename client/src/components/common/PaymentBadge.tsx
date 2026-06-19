import { paymentBadge } from '@/utils/paymentBadge'
import type { PayStatus } from '@/types'

export const PaymentBadge = ({ status }: { status: PayStatus }) => {
  const cfg = paymentBadge[status]
  return <span className={`badge ${cfg.className}`}>{cfg.label}</span>
}