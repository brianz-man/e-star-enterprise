import { useEffect, useState, useCallback } from 'react'
import { useSearchParams }  from 'react-router-dom'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { productsApi }  from '@/api/products'
import { ProductCard }  from '@/components/product/ProductCard'
import { Spinner }      from '@/components/common/Spinner'
import { Empty }        from '@/components/common/Empty'
import type { Product, SortOption } from '@/types'

const BRANDS    = ['hp','canon','epson','brother','samsung']
const CATS      = [['toners','Laser Toners'],['ink-cartridges','Ink Cartridges'],['drum-units','Drum Units']]
const SORT_OPTS: { value: SortOption; label: string }[] = [
  { value:'newest',    label:'Newest' },
  { value:'price_asc', label:'Price ↑' },
  { value:'price_desc',label:'Price ↓' },
  { value:'name_asc',  label:'A–Z' },
]

export default function Products() {
  const [sp, setSp]      = useSearchParams()
  const [items, setItems] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [busy,  setBusy]  = useState(true)

  const page   = Number(sp.get('page')   || 1)
  const search = sp.get('search')   || ''
  const brand  = sp.get('brand')    || ''
  const cat    = sp.get('category') || ''
  const sort   = (sp.get('sort') || 'newest') as SortOption

  const setParam = (k: string, v: string) => {
    const n = new URLSearchParams(sp)
    if (v) n.set(k, v)
    else n.delete(k)
    if (k !== 'page') n.delete('page')
    setSp(n)
  }

  const setPage = (p: number) => {
    const n = new URLSearchParams(sp)
    n.set('page', String(p))
    setSp(n)
  }

  const load = useCallback(async () => {
    setBusy(true)
    try {
      const r = await productsApi.list({ page, limit: 20, sort, search: search||undefined, brand: brand||undefined, category: cat||undefined })
      setItems(r.data)
      setTotal(r.meta?.total ?? 0)
      setPages(r.meta?.pages ?? 1)
    } catch {} finally { setBusy(false) }
  }, [page, search, brand, cat, sort])

  useEffect(() => { load() }, [load])

  const chips = [
    search && { k: 'search',   l: `"${search}"` },
    brand  && { k: 'brand',    l: brand.toUpperCase() },
    cat    && { k: 'category', l: cat },
  ].filter(Boolean) as { k: string; l: string }[]

  return (
    <div className="section py-8">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input key={search} defaultValue={search}
            onKeyDown={e => e.key === 'Enter' && setParam('search', (e.target as HTMLInputElement).value)}
            placeholder="Search products or printer model…"
            className="field pl-9 text-sm h-10" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {SORT_OPTS.map(o => (
            <button key={o.value} onClick={() => setParam('sort', o.value)}
              className={`btn btn-sm ${sort === o.value ? 'btn-primary' : 'btn-secondary'}`}>
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <SlidersHorizontal size={14} />{total} results
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="w-48 flex-shrink-0 hidden md:block space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Brand</p>
            <ul className="space-y-1">
              <li><button onClick={() => setParam('brand', '')} className={`text-sm w-full text-left px-2 py-1.5 rounded-lg transition-colors ${!brand ? 'text-brand-700 font-semibold bg-brand-50' : 'text-gray-600 hover:bg-gray-50'}`}>All Brands</button></li>
              {BRANDS.map(b => (
                <li key={b}><button onClick={() => setParam('brand', b)} className={`text-sm w-full text-left px-2 py-1.5 rounded-lg transition-colors capitalize ${brand === b ? 'text-brand-700 font-semibold bg-brand-50' : 'text-gray-600 hover:bg-gray-50'}`}>{b}</button></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Category</p>
            <ul className="space-y-1">
              <li><button onClick={() => setParam('category', '')} className={`text-sm w-full text-left px-2 py-1.5 rounded-lg transition-colors ${!cat ? 'text-brand-700 font-semibold bg-brand-50' : 'text-gray-600 hover:bg-gray-50'}`}>All Categories</button></li>
              {CATS.map(([v, l]) => (
                <li key={v}><button onClick={() => setParam('category', v)} className={`text-sm w-full text-left px-2 py-1.5 rounded-lg transition-colors ${cat === v ? 'text-brand-700 font-semibold bg-brand-50' : 'text-gray-600 hover:bg-gray-50'}`}>{l}</button></li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Grid */}
        <div className="flex-1">
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {chips.map(c => (
                <span key={c.k} className="inline-flex items-center gap-1.5 badge bg-brand-100 text-brand-700">
                  {c.l}<button onClick={() => setParam(c.k, '')}><X size={11} /></button>
                </span>
              ))}
            </div>
          )}

          {busy
            ? <div className="flex justify-center py-24"><Spinner size="lg" /></div>
            : items.length === 0
              ? <Empty title="No products found" message="Try different filters." action={<button onClick={() => setSp({})} className="btn btn-secondary btn-sm">Clear filters</button>} />
              : <>
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {items.map(p => <ProductCard key={p.id} product={p} />)}
                  </div>
                  {pages > 1 && (
                    <div className="flex justify-center gap-2 mt-10">
                      {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
                        <button key={n} onClick={() => setPage(n)}
                          className={`w-9 h-9 rounded-xl text-sm font-semibold transition-colors ${page === n ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  )}
                </>
          }
        </div>
      </div>
    </div>
  )
}