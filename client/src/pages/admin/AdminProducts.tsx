import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { adminApi } from '@/api/admin'
import { productsApi } from '@/api/products'
import { Spinner } from '@/components/common/Spinner'
import { Button } from '@/components/common/Button'
import { kes } from '@/utils/formatCurrency'
import type { Product } from '@/types'
import toast from 'react-hot-toast'

interface PaginationMeta {
  total: number
  page: number
  pages: number
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [meta, setMeta] = useState<PaginationMeta>({ total: 0, page: 1, pages: 0 })
  const [busy, setBusy] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback((page = 1) => {
    setBusy(true)
    adminApi.products(page)
      .then(data => {
        // Check if the response includes metadata
        if (data && typeof data === 'object' && 'meta' in data) {
          const { data: products, meta } = data as any
          setProducts(products)
          setMeta(meta)
        } else {
          // Fallback for old API response format
          setProducts(data)
          setMeta({ total: (data as any).length, page: 1, pages: 1 })
        }
      })
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setBusy(false))
  }, [])

  useEffect(() => { load(1) }, [load])

  const deactivate = async (id: string, name: string) => {
    if (!confirm(`Deactivate "${name}"? It will be hidden from the store.`)) return
    setDeleting(id)
    try {
      await productsApi.remove(id)
      toast.success('Product deactivated')
      load(meta.page)
    } catch {
      toast.error('Failed to deactivate product')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-gray-900">Products</h2>
          <p className="text-sm text-gray-500 mt-1">{meta.total} products in catalog</p>
        </div>
        <Link to="/admin/products/new"><Button leftIcon={<Plus size={16} />}>Add Product</Button></Link>
      </div>

      <div className="card overflow-hidden">
        {busy
          ? <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          : <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    {['Product', 'SKU', 'Brand', 'Price', 'Stock', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.length === 0
                    ? <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No products yet</td></tr>
                    : products.map(p => {
                        const img = p.images?.[0]
                        return (
                          <tr key={p.id} className={`hover:bg-gray-50/50 ${!p.isActive ? 'opacity-60' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
                                  {img && <img src={img.url} alt="" className="w-full h-full object-cover" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-800 text-xs truncate max-w-[180px]">{p.name}</p>
                                  {p.isFeatured && <span className="badge bg-amber-100 text-amber-700 mt-0.5">Featured</span>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.sku}</td>
                            <td className="px-4 py-3 text-xs text-gray-600">{p.brand.name}</td>
                            <td className="px-4 py-3 text-xs font-semibold">{kes(p.price)}</td>
                            <td className="px-4 py-3">
                              <span className={`badge ${p.stockQty <= p.lowStockAt ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                {p.stockQty}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`badge ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {p.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                <Link to={`/admin/products/${p.id}/edit`} className="btn btn-ghost btn-sm px-2">
                                  <Pencil size={14} />
                                </Link>
                                {p.isActive && (
                                  <button
                                    onClick={() => deactivate(p.id, p.name)}
                                    disabled={deleting === p.id}
                                    className="btn btn-ghost btn-sm px-2 text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                  }
                </tbody>
              </table>

              {/* Pagination Controls */}
              {meta.pages > 1 && (
                <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-gray-100 bg-gray-50">
                  <div className="text-sm text-gray-600">
                    Page <span className="font-semibold">{meta.page}</span> of <span className="font-semibold">{meta.pages}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => load(meta.page - 1)}
                      disabled={meta.page === 1}
                      className="btn btn-ghost btn-sm px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {[...Array(meta.pages)].map((_, i) => {
                      const pageNum = i + 1
                      return (
                        <button
                          key={pageNum}
                          onClick={() => load(pageNum)}
                          className={`btn btn-sm px-2.5 ${
                            pageNum === meta.page
                              ? 'bg-brand-600 text-white'
                              : 'btn-ghost text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => load(meta.page + 1)}
                      disabled={meta.page === meta.pages}
                      className="btn btn-ghost btn-sm px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
        }
      </div>
    </div>
  )
}
