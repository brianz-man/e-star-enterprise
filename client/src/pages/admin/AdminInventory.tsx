import { useEffect, useState } from 'react'
import { adminApi } from '@/api/admin'
import { Spinner } from '@/components/common/Spinner'
import { Button } from '@/components/common/Button'
import { kes } from '@/utils/formatCurrency'
import type { InventoryProduct } from '@/types'
import toast from 'react-hot-toast'

export default function AdminInventory() {
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [busy, setBusy] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [stockVal, setStockVal] = useState('')
  const [saving, setSaving] = useState<string | null>(null)

  const load = () => {
    setBusy(true)
    adminApi.inventory()
      .then(setProducts)
      .catch(() => toast.error('Failed to load inventory'))
      .finally(() => setBusy(false))
  }

  useEffect(load, [])

  const startEdit = (p: InventoryProduct) => {
    setEditing(p.id)
    setStockVal(String(p.stockQty))
  }

  const saveStock = async (id: string) => {
    const qty = Number(stockVal)
    if (isNaN(qty) || qty < 0) { toast.error('Enter a valid quantity'); return }
    setSaving(id)
    try {
      await adminApi.adjustStock(id, qty)
      toast.success('Stock updated')
      setEditing(null)
      load()
    } catch {
      toast.error('Failed to update stock')
    } finally {
      setSaving(null)
    }
  }

  if (busy) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-gray-900">Inventory</h2>
        <p className="text-sm text-gray-500 mt-1">Adjust stock levels for active products</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {['Product', 'SKU', 'Brand', 'Category', 'Price', 'Stock', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-800 text-xs max-w-[200px] truncate">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.sku}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{p.brand.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{p.category.name}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-gray-900">{kes(p.price)}</td>
                  <td className="px-4 py-3">
                    {editing === p.id
                      ? <input
                          type="number"
                          min={0}
                          value={stockVal}
                          onChange={e => setStockVal(e.target.value)}
                          className="field w-20 text-xs h-8 py-1"
                        />
                      : <span className={`badge ${p.stockQty <= p.lowStockAt ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                          {p.stockQty}
                        </span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    {editing === p.id
                      ? <div className="flex gap-1">
                          <Button size="sm" loading={saving === p.id} onClick={() => saveStock(p.id)}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                        </div>
                      : <Button size="sm" variant="secondary" onClick={() => startEdit(p)}>Adjust</Button>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
