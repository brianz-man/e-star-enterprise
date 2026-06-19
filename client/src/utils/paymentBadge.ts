import type { PayStatus } from '@/types'

interface BadgeConfig { label: string; className: string }

export const paymentBadge: Record<PayStatus, BadgeConfig> = {
  PENDING:  { label: 'Pending',  className: 'bg-amber-100 text-amber-700'  },
  SUCCESS:  { label: 'Paid',     className: 'bg-green-100 text-green-700'  },
  FAILED:   { label: 'Failed',   className: 'bg-red-100   text-red-700'    },
  REFUNDED: { label: 'Refunded', className: 'bg-gray-100  text-gray-600'   },
}