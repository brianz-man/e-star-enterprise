import { useEffect, useState } from 'react'
import { Link, useNavigate }   from 'react-router-dom'
import { Package, User, LogOut, ChevronRight } from 'lucide-react'
import { useAuth }    from '@/hooks/auth'
import { authApi }    from '@/api/auth'
import { ordersApi }  from '@/api/orders'
import { OrderBadge } from '@/components/common/OrderBadge'
import { Spinner }    from '@/components/common/Spinner'
import { Empty }      from '@/components/common/Empty'
import { kes }        from '@/utils/formatCurrency'
import { fmtDate }    from '@/utils/formatDate'
import { useCartStore } from '@/store/cart'
import type { Order }   from '@/types'
import toast from 'react-hot-toast'

export default function Account() {
  const { user, clearAuth } = useAuth()
  const { resetCart }       = useCartStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [busy,   setBusy]   = useState(true)
  const nav = useNavigate()

  useEffect(() => {
    ordersApi.list().then(setOrders).catch(() => {}).finally(() => setBusy(false))
  }, [])

  const logout = async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    clearAuth(); resetCart()
    toast.success('Signed out'); nav('/')
  }

  return (
    <div className="section py-10">
      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <aside className="lg:col-span-1">
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-100">
              <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
                <span className="text-brand-700 font-black text-lg">{user?.firstName[0]}{user?.lastName[0]}</span>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
            <nav className="space-y-1">
              <Link to="/account" className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-brand-700 bg-brand-50 rounded-xl">
                <User size={14} />My Account<ChevronRight size={12} className="ml-auto text-gray-300" />
              </Link>
              <Link to="/account" className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                <Package size={14} />My Orders<ChevronRight size={12} className="ml-auto text-gray-300" />
              </Link>
              <button onClick={logout} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 rounded-xl hover:bg-red-50 transition-colors w-full">
                <LogOut size={14} />Sign Out
              </button>
            </nav>
          </div>
        </aside>

        {/* Orders */}
        <div className="lg:col-span-3">
          <h1 className="text-2xl font-black text-gray-900 mb-6">My Orders</h1>
          {busy
            ? <div className="flex justify-center py-20"><Spinner size="lg" /></div>
            : orders.length === 0
              ? <Empty icon={<Package size={52} />} title="No orders yet" message="You haven't placed any orders."
                  action={<Link to="/products" className="btn btn-primary btn-sm">Start Shopping</Link>} />
              : <div className="space-y-3">
                  {orders.map(o => (
                    <Link key={o.id} to={`/account/orders/${o.id}`}
                      className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-md transition-shadow">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900 font-mono text-sm">#{o.orderNumber}</span>
                          <OrderBadge status={o.status} />
                        </div>
                        <p className="text-xs text-gray-400">{fmtDate(o.createdAt)} · {o.items.length} item{o.items.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-brand-700">{kes(o.totalAmount)}</span>
                        <ChevronRight size={15} className="text-gray-300" />
                      </div>
                    </Link>
                  ))}
                </div>
          }
        </div>
      </div>
    </div>
  )
}