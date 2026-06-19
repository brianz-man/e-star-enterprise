import { X, Trash2, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart, useCartTotal } from '@/hooks/cart'
import { useIsAuth } from '@/hooks/auth'
import { Spinner } from '@/components/common/Spinner'
import { Button }  from '@/components/common/Button'
import { kes }     from '@/utils/formatCurrency'
import toast from 'react-hot-toast'

export const CartDrawer = () => {
  const { cart, isOpen, isLoading, closeDrawer, updateQuantity, removeItem } = useCart()
  const total  = useCartTotal()
  const isAuth = useIsAuth()

  const handleUpdateQuantity = async (itemId: string, qty: number) => {
    try {
      await updateQuantity(itemId, qty)
    } catch {
      toast.error('Could not update cart')
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeItem(itemId)
      toast.success('Item removed')
    } catch {
      toast.error('Could not remove item')
    }
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={closeDrawer} />
      )}

      <div className={`fixed right-0 top-0 h-full w-full sm:w-[400px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-brand-600" />
            <h2 className="font-semibold text-gray-900">Shopping Cart</h2>
            {(cart?.items.length ?? 0) > 0 && (
              <span className="badge bg-brand-100 text-brand-700">{cart!.items.length}</span>
            )}
          </div>
          <button onClick={closeDrawer} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading && (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          )}

          {!isLoading && (!cart || cart.items.length === 0) && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag size={52} className="text-gray-200 mb-4" />
              <p className="font-semibold text-gray-700 mb-1">Your cart is empty</p>
              <p className="text-sm text-gray-400 mb-6">Add some products to get started</p>
              <Button variant="secondary" onClick={closeDrawer}>Browse Products</Button>
            </div>
          )}

          {!isLoading && cart && cart.items.length > 0 && (
            <ul className="space-y-3">
              {cart.items.map(item => {
                const img = item.product.images.find(i => i.isPrimary) ?? item.product.images[0]
                return (
                  <li key={item.id} className="flex gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
                      {img
                        ? <img src={img.url} alt={item.product.name} className="w-full h-full object-cover" />
                        : <ShoppingBag size={18} className="m-auto mt-3.5 text-gray-300" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{item.product.sku}</p>
                      <p className="text-sm font-bold text-brand-700 mt-1">{kes(item.product.price)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => item.quantity > 1 ? handleUpdateQuantity(item.id, item.quantity - 1) : handleRemoveItem(item.id)}
                            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors text-sm"
                          >−</button>
                          <span className="w-8 text-center font-medium text-gray-800 text-sm">{item.quantity}</span>
                          <button
                            onClick={() => {
                              if (item.quantity < item.product.stockQty) {
                                handleUpdateQuantity(item.id, item.quantity + 1)
                              }
                            }}
                            disabled={item.quantity >= item.product.stockQty}
                            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors text-sm disabled:opacity-40"
                          >+</button>
                        </div>
                        <button onClick={() => handleRemoveItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {cart && cart.items.length > 0 && (
          <div className="border-t border-gray-100 p-5 space-y-3 bg-gray-50/50">
            {total < 5000 && (
              <p className="text-xs text-center text-gray-500">
                Add <strong className="text-brand-600">{kes(5000 - total)}</strong> more for free delivery
              </p>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-bold text-gray-900">{kes(total)}</span>
            </div>
            {isAuth
              ? <Link to="/checkout" onClick={closeDrawer}><Button fullWidth size="lg">Proceed to Checkout</Button></Link>
              : <Link to="/login" onClick={closeDrawer}><Button variant="secondary" fullWidth>Sign in to Checkout</Button></Link>
            }
            <Button variant="ghost" fullWidth onClick={closeDrawer} className="text-sm">Continue Shopping</Button>
          </div>
        )}
      </div>
    </>
  )
}
