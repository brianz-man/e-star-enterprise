import { useEffect, useState, type ReactNode } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { ChevronRight, ShoppingCart, Star, Check, Truck, Shield, Package } from 'lucide-react'
import { productsApi } from '@/api/products'
import { useCart }     from '@/hooks/cart'
import { useIsAuth }   from '@/hooks/auth'
import { StockBadge }  from '@/components/common/StockBadge'
import { Spinner }     from '@/components/common/Spinner'
import { Button }      from '@/components/common/Button'
import { kes, discountPct } from '@/utils/formatCurrency'
import { fmtDate }     from '@/utils/formatDate'
import type { Product } from '@/types'
import toast from 'react-hot-toast'

export default function ProductDetail() {
  const { slug }  = useParams<{ slug: string }>()
  const [p, setP] = useState<Product | null>(null)
  const [busy, setBusy]   = useState(true)
  const [imgIdx, setImgIdx] = useState(0)
  const [qty,    setQty]    = useState(1)
  const [adding, setAdding] = useState(false)
  const { addItem } = useCart()
  const isAuth      = useIsAuth()
  const nav         = useNavigate()
  const location    = useLocation()

  useEffect(() => {
    if (!slug) return
    productsApi.get(slug).then(setP).catch(() => setP(null)).finally(() => setBusy(false))
  }, [slug])

  const handleAdd = async () => {
    if (!isAuth) { nav('/login', { state: { from: location } }); return }
    setAdding(true)
    try   { await addItem(p!.id, qty); toast.success('Added to cart!') }
    catch { toast.error('Could not add to cart') }
    finally { setAdding(false) }
  }

  if (busy) return <div className="flex justify-center py-32"><Spinner size="lg" /></div>
  if (!p)   return (
    <div className="section py-20 text-center">
      <Package size={56} className="text-gray-200 mx-auto mb-4" />
      <p className="text-gray-500 mb-4">Product not found.</p>
      <Link to="/products" className="btn btn-secondary btn-sm">Browse products</Link>
    </div>
  )

  const imgs = [...p.images].sort((a, b) => (a.isPrimary ? -1 : b.isPrimary ? 1 : a.sortOrder - b.sortOrder))
  const disc = p.comparePrice ? discountPct(p.price, p.comparePrice) : null

  return (
    <div className="section py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-8 flex-wrap">
        <Link to="/" className="hover:text-brand-600 transition-colors">Home</Link><ChevronRight size={12} />
        <Link to="/products" className="hover:text-brand-600 transition-colors">Products</Link><ChevronRight size={12} />
        <Link to={`/products?brand=${p.brand.slug}`} className="hover:text-brand-600 transition-colors">{p.brand.name}</Link><ChevronRight size={12} />
        <span className="text-gray-700 font-medium truncate max-w-[200px]">{p.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Images */}
        <div className="space-y-3">
          <div className="aspect-square bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden flex items-center justify-center">
            {imgs[imgIdx]
              ? <img src={imgs[imgIdx].url} alt={p.name} className="w-full h-full object-contain p-6" />
              : <Package size={64} className="text-gray-200" />
            }
          </div>
          {imgs.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {imgs.map((im, i) => (
                <button key={im.id} onClick={() => setImgIdx(i)}
                  className={`w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${i === imgIdx ? 'border-brand-600' : 'border-gray-200 hover:border-gray-300'}`}>
                  <img src={im.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link to={`/products?brand=${p.brand.slug}`} className="badge bg-brand-100 text-brand-700 hover:bg-brand-200 transition-colors">{p.brand.name}</Link>
              <Link to={`/products?category=${p.category.slug}`} className="badge bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">{p.category.name}</Link>
            </div>
            <h1 className="text-2xl font-black text-gray-900 leading-tight">{p.name}</h1>
            <p className="text-xs text-gray-400 font-mono mt-1">SKU: {p.sku}</p>
          </div>

          {p.avgRating != null && p.avgRating > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => <Star key={s} size={15} className={s <= Math.round(p.avgRating!) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />)}
              </div>
              <span className="text-sm text-gray-500">{p.avgRating} · {p.reviewCount} reviews</span>
            </div>
          )}

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-brand-700">{kes(p.price)}</span>
            {p.comparePrice && <>
              <span className="text-lg text-gray-400 line-through">{kes(p.comparePrice)}</span>
              <span className="badge bg-red-100 text-red-700">Save {disc}%</span>
            </>}
          </div>

          <StockBadge qty={p.stockQty} />

          {p.stockQty > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => setQty(v => Math.max(1, v - 1))} className="w-10 h-11 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors text-lg">−</button>
                <span className="w-12 text-center font-bold text-gray-800">{qty}</span>
                <button onClick={() => setQty(v => Math.min(p.stockQty, v + 1))} className="w-10 h-11 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors text-lg">+</button>
              </div>
              <Button onClick={handleAdd} loading={adding} size="lg" fullWidth leftIcon={<ShoppingCart size={18} />}>
                Add to Cart
              </Button>
            </div>
          )}

          {/* Trust pills */}
          <div className="grid grid-cols-3 gap-3">
            {[[<Truck size={14} />, 'Fast Delivery', 'Nairobi same-day'], [<Shield size={14} />, 'M-Pesa', 'Secure STK Push'], [<Check size={14} />, 'Genuine', 'Authorised supply']].map(([icon, t, s]) => (
              <div key={String(t)} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                <div className="text-brand-600 flex justify-center mb-1">{icon as ReactNode}</div>
                <p className="text-xs font-semibold text-gray-800">{String(t)}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{String(s)}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Description</p>
            <p className="text-sm text-gray-600 leading-relaxed">{p.description}</p>
          </div>

          {p.compatibility?.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Compatible Printers</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {p.compatibility.map(c => (
                  <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 text-sm bg-gray-50">
                    <span className="w-1.5 h-1.5 bg-brand-600 rounded-full flex-shrink-0" />
                    <span className="text-gray-700 font-medium text-xs">{c.printerModel}</span>
                    {c.printerSeries && <span className="text-gray-400 text-[10px] font-mono">· {c.printerSeries}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      {p.reviews && p.reviews.length > 0 && (
        <div className="mt-16 border-t border-gray-100 pt-12">
          <h2 className="text-xl font-black text-gray-900 mb-8">Customer Reviews</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {p.reviews.map(r => (
              <div key={r.id} className="card p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} size={13} className={s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />)}</div>
                  <span className="text-[10px] text-gray-400 font-mono">{fmtDate(r.createdAt)}</span>
                </div>
                {r.title && <p className="font-semibold text-gray-900 text-sm mb-1">{r.title}</p>}
                {r.body  && <p className="text-sm text-gray-600 leading-relaxed">{r.body}</p>}
                <p className="text-xs text-gray-400 mt-2">— {r.user.firstName} {r.user.lastName[0]}.</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}