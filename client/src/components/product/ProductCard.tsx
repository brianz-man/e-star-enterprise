import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Star } from 'lucide-react'
import { useCart }    from '@/hooks/cart'
import { useIsAuth }  from '@/hooks/auth'
import { StockBadge } from '@/components/common/StockBadge'
import { kes, discountPct } from '@/utils/formatCurrency'
import type { Product } from '@/types'
import toast from 'react-hot-toast'

export const ProductCard = ({ product }: { product: Product }) => {
  const { addItem, isLoading } = useCart()
  const isAuth = useIsAuth()
  const nav    = useNavigate()

  const img      = product.images.find(i => i.isPrimary) ?? product.images[0]
  const discount = product.comparePrice ? discountPct(product.price, product.comparePrice) : null

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isAuth) { nav('/login'); return }
    try   { await addItem(product.id, 1); toast.success('Added to cart!') }
    catch { toast.error('Could not add to cart') }
  }

  return (
    <Link
      to={`/products/${product.slug}`}
      className="card group flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Image */}
      <div className="aspect-square bg-gray-50 rounded-t-2xl overflow-hidden relative">
        {img
          ? <img src={img.url} alt={product.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center"><ShoppingCart size={36} className="text-gray-200" /></div>
        }
        {discount && (
          <span className="absolute top-2.5 left-2.5 badge bg-red-500 text-white">-{discount}%</span>
        )}
        {product.isFeatured && !discount && (
          <span className="absolute top-2.5 right-2.5 badge bg-amber-400 text-white">⭐ Top Pick</span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">{product.brand.name}</p>
        <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 flex-1 mb-2">{product.name}</h3>

        {product.avgRating != null && product.avgRating > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <Star size={12} className="text-amber-400 fill-amber-400" />
            <span className="text-xs text-gray-500">{product.avgRating} ({product.reviewCount})</span>
          </div>
        )}

        <StockBadge qty={product.stockQty} />

        <div className="flex items-baseline gap-2 mt-2 mb-3">
          <span className="font-bold text-brand-700 text-base">{kes(product.price)}</span>
          {product.comparePrice && (
            <span className="text-xs text-gray-400 line-through">{kes(product.comparePrice)}</span>
          )}
        </div>

        <button
          onClick={handleAdd}
          disabled={product.stockQty === 0 || isLoading}
          className="btn btn-primary btn-sm w-full"
        >
          <ShoppingCart size={13} />
          {product.stockQty === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </Link>
  )
}