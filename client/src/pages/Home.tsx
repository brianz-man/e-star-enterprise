import { useEffect, useState } from 'react'
import { Link, useNavigate }   from 'react-router-dom'
import { ArrowRight, Search, Printer, Zap, Shield, Truck } from 'lucide-react'
import { productsApi } from '@/api/products'
import { ProductCard } from '@/components/product/ProductCard'
import { Spinner }     from '@/components/common/Spinner'
import type { Product } from '@/types'

const BRANDS = ['HP','Canon','Epson','Brother','Samsung']
const WHY = [
  { icon: <Zap size={22} />,     title: '100% Genuine',       desc: 'Original products from authorised distributors only.' },
  { icon: <Truck size={22} />,   title: 'Fast Delivery',       desc: 'Same-day in Nairobi. Countrywide in 1–3 days.' },
  { icon: <Shield size={22} />,  title: 'Secure M-Pesa',       desc: 'STK Push — pay without a card.' },
  { icon: <Printer size={22} />, title: 'Find by Printer',     desc: 'Enter your printer model and we find the exact match.' },
]

export default function Home() {
  const [featured, setFeatured] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(true)
  const [q, setQ]               = useState('')
  const nav = useNavigate()

  useEffect(() => {
    productsApi.list({ featured: true, limit: 8 })
      .then(r => setFeatured(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const search = (e: React.FormEvent) => {
    e.preventDefault()
    if (q.trim()) nav(`/products?search=${encodeURIComponent(q.trim())}`)
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 text-white">
        <div className="section py-20 flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-brand-200 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Kenya's #1 Printer Supplies Store
          </span>
          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6 max-w-3xl">
            Genuine Toners &amp; Cartridges<br/>
            <span className="text-brand-300">Delivered in Kenya</span>
          </h1>
          <p className="text-brand-200 text-lg max-w-xl mb-10 leading-relaxed">
            HP, Canon, Epson, Brother, Samsung — all brands. Pay with M-Pesa. Same-day Nairobi delivery.
          </p>

          {/* Printer finder */}
          <div className="bg-white/10 border border-white/20 rounded-2xl p-6 max-w-md w-full mb-8">
            <p className="text-sm font-semibold text-brand-200 mb-3 flex items-center gap-2 justify-center">
              <Search size={14} /> Find your cartridge by printer model
            </p>
            <form onSubmit={search} className="flex gap-2">
              <input value={q} onChange={e => setQ(e.target.value)}
                placeholder="e.g. HP LaserJet P1102"
                className="field flex-1 bg-white/10 border-white/30 text-white placeholder-white/50 focus:border-white focus:ring-white/20" />
              <button type="submit" className="btn btn-primary px-4">
                <ArrowRight size={16} />
              </button>
            </form>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/products" className="btn btn-primary btn-lg">Shop All Products <ArrowRight size={16} /></Link>
            <a href="https://wa.me/254700000000" target="_blank" rel="noreferrer"
              className="btn btn-secondary btn-lg bg-white/10 border-white/30 text-white hover:bg-white/20">
              WhatsApp Us
            </a>
          </div>
        </div>
      </section>

      {/* Brands */}
      <section className="py-8 bg-white border-b border-gray-100">
        <div className="section">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 mb-5">Authorised supplier for</p>
          <div className="flex flex-wrap justify-center gap-3">
            {BRANDS.map(b => (
              <Link key={b} to={`/products?brand=${b.toLowerCase()}`}
                className="px-5 py-2.5 bg-gray-50 hover:bg-brand-50 border border-gray-200 hover:border-brand-200 rounded-xl font-semibold text-sm text-gray-700 hover:text-brand-700 transition-all hover:scale-105">
                {b}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="py-16 bg-gray-50">
        <div className="section">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
              <p className="text-gray-500 text-sm mt-1">Best-selling toners and cartridges</p>
            </div>
            <Link to="/products" className="text-brand-600 text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {loading
            ? <div className="flex justify-center py-20"><Spinner size="lg" /></div>
            : <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {featured.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
          }
        </div>
      </section>

      {/* Why */}
      <section className="py-16 bg-white">
        <div className="section">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">Why E-Star Enterprise?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {WHY.map(w => (
              <div key={w.title} className="text-center group">
                <div className="w-12 h-12 bg-brand-50 border border-brand-100 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-brand-600 group-hover:text-white transition-all duration-200">
                  {w.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-sm">{w.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}