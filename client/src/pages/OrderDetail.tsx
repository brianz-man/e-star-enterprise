import { useEffect, useState }  from 'react'
import { useParams, Link }      from 'react-router-dom'
import { ChevronRight, Package, MapPin, Smartphone } from 'lucide-react'
import { ordersApi }    from '@/api/orders'
import { OrderBadge }   from '@/components/common/OrderBadge'
import { PaymentBadge } from '@/components/common/PaymentBadge'
import { Spinner }      from '@/components/common/Spinner'
import { kes }          from '@/utils/formatCurrency'
import { fmtDateTime }  from '@/utils/formatDate'
import type { Order, OrderStatus } from '@/types'

const STEPS: OrderStatus[] = ['PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED']

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const [o, setO]     = useState<Order | null>(null)
  const [busy, setBusy] = useState(true)

  useEffect(() => {
    if (!id) return
    ordersApi.get(id).then(setO).catch(() => setO(null)).finally(() => setBusy(false))
  }, [id])

  if (busy) return <div className="flex justify-center py-32"><Spinner size="lg" /></div>
  if (!o)   return (
    <div className="section py-20 text-center">
      <p className="text-gray-500">Order not found.</p>
      <Link to="/account" className="btn btn-secondary btn-sm mt-4">Back to account</Link>
    </div>
  )

  const si = STEPS.indexOf(o.status)

  return (
    <div className="section py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-8 flex-wrap">
        <Link to="/account" className="hover:text-brand-600">Account</Link><ChevronRight size={12} />
        <Link to="/account" className="hover:text-brand-600">Orders</Link><ChevronRight size={12} />
        <span className="text-gray-700 font-mono">#{o.orderNumber}</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Order #{o.orderNumber}</h1>
          <p className="text-xs text-gray-400 font-mono mt-1">{fmtDateTime(o.createdAt)}</p>
        </div>
        <OrderBadge status={o.status} />
      </div>

      {/* Progress tracker */}
      {o.status !== 'CANCELLED' && (
        <div className="card p-6 mb-6">
          <div className="relative flex items-center justify-between">
            <div className="absolute left-0 right-0 top-4 h-0.5 bg-gray-100" />
            <div className="absolute left-0 top-4 h-0.5 bg-brand-600 transition-all duration-700"
              style={{ width: si > 0 ? `${(si / (STEPS.length - 1)) * 100}%` : '0%' }} />
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-col items-center gap-1.5 z-10 bg-transparent">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${i <= si ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-200 text-gray-400'}`}>
                  {i < si ? '✓' : i + 1}
                </div>
                <span className={`text-[10px] font-medium hidden sm:block ${i <= si ? 'text-brand-700' : 'text-gray-400'}`}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 card p-6">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm"><Package size={14} />Items ({o.items.length})</h2>
          <ul className="divide-y divide-gray-50">
            {o.items.map(item => (
              <li key={item.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{item.sku} · ×{item.quantity} @ {kes(item.price)}</p>
                </div>
                <p className="font-bold text-gray-900 text-sm flex-shrink-0">{kes(item.total)}</p>
              </li>
            ))}
          </ul>
          <hr className="border-gray-100 my-3" />
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{kes(o.subtotal)}</span></div>
            <div className="flex justify-between text-gray-500">
              <span>Delivery</span>
              <span className={Number(o.deliveryFee) === 0 ? 'text-green-600 font-semibold' : ''}>
                {Number(o.deliveryFee) === 0 ? 'FREE' : kes(o.deliveryFee)}
              </span>
            </div>
            <div className="flex justify-between font-black text-gray-900 text-base border-t border-gray-100 pt-2">
              <span>Total</span><span>{kes(o.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Side cards */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><MapPin size={12} />Delivery Address</h3>
            <div className="text-sm text-gray-600 space-y-0.5">
              <p className="font-semibold text-gray-800">{o.deliveryAddress.firstName} {o.deliveryAddress.lastName}</p>
              <p>{o.deliveryAddress.street}</p>
              <p>{o.deliveryAddress.town}, {o.deliveryAddress.county}</p>
              <p className="font-mono text-xs text-gray-500">{o.deliveryAddress.phone}</p>
            </div>
          </div>

          {o.payment && (
            <div className="card p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><Smartphone size={12} />Payment</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center"><span className="text-gray-500">Status</span><PaymentBadge status={o.payment.status} /></div>
                {o.payment.mpesaReceiptNo && (
                  <div className="flex justify-between"><span className="text-gray-500">Receipt</span><span className="font-mono text-xs text-gray-800">{o.payment.mpesaReceiptNo}</span></div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}