import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag, TrendingUp, Users, Package, AlertTriangle, ChevronRight } from 'lucide-react'
import { adminApi } from '@/api/admin'
import { OrderBadge } from '@/components/common/OrderBadge'
import { Spinner } from '@/components/common/Spinner'
import { kes } from '@/utils/formatCurrency'
import { fmtDate } from '@/utils/formatDate'
import type { OrderStatus } from '@/types'
import toast from 'react-hot-toast'

const statusOptions: OrderStatus[] = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

export default function AdminDashboard() {
  const [data, setData] = useState<Awaited<ReturnType<typeof adminApi.dashboard>> | null>(null)
  const [busy, setBusy] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const load = () => {
    setBusy(true)
    adminApi.dashboard()
      .then(setData)
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setBusy(false))
  }

  useEffect(load, [])

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    setUpdating(orderId)
    try {
      await adminApi.updateOrderStatus(orderId, status)
      toast.success('Order status updated')
      load()
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdating(null)
    }
  }

  if (busy) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>

  const stats = data?.stats
  const cards = [
    { label: 'Total Orders', value: stats?.totalOrders ?? 0, icon: ShoppingBag, color: 'bg-blue-50 text-blue-600' },
    { label: 'Revenue (KES)', value: kes(stats?.totalRevenue ?? 0), icon: TrendingUp, color: 'bg-green-50 text-green-600' },
    { label: 'Customers', value: stats?.totalUsers ?? 0, icon: Users, color: 'bg-purple-50 text-purple-600' },
    { label: 'Active Products', value: stats?.totalProducts ?? 0, icon: Package, color: 'bg-amber-50 text-amber-600' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="card p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.color}`}>
              <c.icon size={20} />
            </div>
            <p className="text-2xl font-black text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900">Recent Orders</h2>
            <Link to="/admin/orders" className="text-xs text-brand-600 font-semibold flex items-center gap-1 hover:gap-2 transition-all">
              All orders <ChevronRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  {['Order', 'Customer', 'Amount', 'Status', 'Action'].map(h => (
                    <th key={h} className="text-left pb-3 pr-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(data?.recentOrders ?? []).map(o => (
                  <tr key={o.id}>
                    <td className="py-3 pr-3 font-mono text-xs text-gray-600">#{o.orderNumber}</td>
                    <td className="py-3 pr-3">
                      <p className="font-medium text-gray-800 text-xs">{o.user?.firstName} {o.user?.lastName}</p>
                      <p className="text-[10px] text-gray-400">{fmtDate(o.createdAt)}</p>
                    </td>
                    <td className="py-3 pr-3 font-bold text-gray-900 text-xs">{kes(o.totalAmount)}</td>
                    <td className="py-3 pr-3"><OrderBadge status={o.status} /></td>
                    <td className="py-3">
                      <select
                        value={o.status}
                        onChange={e => updateStatus(o.id, e.target.value as OrderStatus)}
                        disabled={updating === o.id || o.status === 'DELIVERED' || o.status === 'CANCELLED'}
                        className="field text-xs py-1 px-2 h-7 w-28"
                      >
                        <option value={o.status}>{o.status}</option>
                        {statusOptions.filter(s => s !== o.status).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
              <AlertTriangle size={15} className="text-amber-500" />Low Stock
            </h2>
            <Link to="/admin/inventory" className="text-xs text-brand-600 font-semibold">Manage</Link>
          </div>
          {(data?.lowStock ?? []).length === 0
            ? <p className="text-sm text-gray-400">All products well-stocked</p>
            : <ul className="space-y-3">
                {(data?.lowStock ?? []).map(p => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.brand.name} · {p.sku}</p>
                    </div>
                    <span className={`badge flex-shrink-0 ${p.stockQty === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {p.stockQty === 0 ? 'OUT' : p.stockQty}
                    </span>
                  </li>
                ))}
              </ul>
          }
        </div>
      </div>
    </div>
  )
}
