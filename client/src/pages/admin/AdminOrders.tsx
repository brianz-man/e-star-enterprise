import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '@/api/admin'
import { OrderBadge } from '@/components/common/OrderBadge'
import { PaymentBadge } from '@/components/common/PaymentBadge'
import { Spinner } from '@/components/common/Spinner'
import { kes } from '@/utils/formatCurrency'
import { fmtDate } from '@/utils/formatDate'
import type { AdminOrder, OrderStatus } from '@/types'
import toast from 'react-hot-toast'

const ALL_STATUSES: (OrderStatus | '')[] = ['', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']
const EDIT_STATUSES: OrderStatus[] = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

export default function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [busy, setBusy] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const load = useCallback(async () => {
    setBusy(true)
    try {
      const r = await adminApi.orders({ page, limit: 15, status: status || undefined })
      setOrders(r.data)
      setPages(r.meta?.pages ?? 1)
    } catch {
      toast.error('Failed to load orders')
    } finally {
      setBusy(false)
    }
  }, [page, status])

  useEffect(() => { load() }, [load])

  const updateStatus = async (orderId: string, next: OrderStatus) => {
    setUpdating(orderId)
    try {
      await adminApi.updateOrderStatus(orderId, next)
      toast.success('Status updated')
      load()
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-black text-gray-900">Orders</h2>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value as OrderStatus | ''); setPage(1) }}
          className="field w-full sm:w-48 text-sm h-9"
        >
          {ALL_STATUSES.map(s => (
            <option key={s || 'all'} value={s}>{s || 'All statuses'}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {busy
          ? <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          : <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      {['Order', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Update'].map(h => (
                        <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {orders.length === 0
                      ? <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No orders found</td></tr>
                      : orders.map(o => (
                          <tr key={o.id} className="hover:bg-gray-50/50">
                            <td className="px-4 py-3">
                              <p className="font-mono text-xs font-semibold text-gray-800">#{o.orderNumber}</p>
                              <p className="text-[10px] text-gray-400">{fmtDate(o.createdAt)}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-800 text-xs">{o.user.firstName} {o.user.lastName}</p>
                              <p className="text-[10px] text-gray-400">{o.user.email}</p>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600">{o.items.length}</td>
                            <td className="px-4 py-3 font-bold text-gray-900 text-xs">{kes(o.totalAmount)}</td>
                            <td className="px-4 py-3">
                              {o.payment
                                ? <PaymentBadge status={o.payment.status} />
                                : <span className="text-xs text-gray-400">—</span>
                              }
                            </td>
                            <td className="px-4 py-3"><OrderBadge status={o.status} /></td>
                            <td className="px-4 py-3">
                              <select
                                value={o.status}
                                onChange={e => updateStatus(o.id, e.target.value as OrderStatus)}
                                disabled={updating === o.id || o.status === 'DELIVERED' || o.status === 'CANCELLED'}
                                className="field text-xs py-1 px-2 h-7 w-28"
                              >
                                <option value={o.status}>{o.status}</option>
                                {EDIT_STATUSES.filter(s => s !== o.status).map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
              </div>
              {pages > 1 && (
                <div className="flex justify-center gap-2 p-4 border-t border-gray-100">
                  {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`w-9 h-9 rounded-xl text-sm font-semibold transition-colors ${page === n ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </>
        }
      </div>
    </div>
  )
}
