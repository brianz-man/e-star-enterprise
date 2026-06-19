import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Search, Menu, X, Package, User, LogOut, LayoutDashboard, ChevronDown } from 'lucide-react'
import { useAuth, useIsAdmin } from '@/hooks/auth'
import { useCartCount, useCart } from '@/hooks/cart'
import { authApi } from '@/api/auth'
import toast from 'react-hot-toast'

export const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropOpen,   setDropOpen]   = useState(false)
  const [q, setQ]                   = useState('')
  const { user, isAuth, clearAuth } = useAuth()
  const count                       = useCartCount()
  const { openDrawer, resetCart }   = useCart()
  const isAdmin                     = useIsAdmin()
  const nav                         = useNavigate()
  const dropRef                     = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (q.trim()) { nav(`/products?search=${encodeURIComponent(q.trim())}`); setQ(''); setMobileOpen(false) }
  }

  const handleLogout = async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    clearAuth(); resetCart()
    toast.success('Signed out')
    nav('/')
    setDropOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="section flex items-center h-16 gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Package size={16} className="text-white" />
          </div>
          <span className="font-bold text-xl text-brand-900 hidden sm:block">E-Star</span>
        </Link>

        {/* Nav links — desktop */}
        <nav className="hidden lg:flex items-center gap-1 ml-2">
          {[['Products', '/products'], ['Toners', '/products?category=toners'], ['Ink Cartridges', '/products?category=ink-cartridges'], [' Deals', '/products?featured=true']].map(([l, h]) => (
            <Link key={h} to={h} className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors">
              {l}
            </Link>
          ))}
        </nav>

        {/* Search — desktop */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-sm mx-4">
          <div className="relative w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search or printer model…"
              className="field pl-9 py-2 text-sm h-9" />
          </div>
        </form>

        <div className="flex items-center gap-2 ml-auto">
          {/* Cart */}
          <button onClick={openDrawer} className="relative p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors">
            <ShoppingCart size={20} />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-0.5 bg-brand-600 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </button>

          {/* Auth — desktop */}
          {isAuth ? (
            <div ref={dropRef} className="relative hidden md:block">
              <button onClick={() => setDropOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center">
                  <span className="text-brand-700 text-xs font-bold">{user?.firstName[0]}{user?.lastName[0]}</span>
                </div>
                <span className="text-sm font-medium text-gray-700 hidden lg:block">{user?.firstName}</span>
                <ChevronDown size={12} className={`text-gray-400 transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <p className="text-xs text-gray-500">Signed in as</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">{user?.email}</p>
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    <Link to="/account" onClick={() => setDropOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                      <User size={14} /> My Account
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" onClick={() => setDropOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-brand-700 font-medium rounded-xl hover:bg-brand-50 transition-colors">
                        <LayoutDashboard size={14} /> Admin Panel
                      </Link>
                    )}
                    <hr className="border-gray-100 my-1" />
                    <button onClick={handleLogout} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 rounded-xl hover:bg-red-50 transition-colors">
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link to="/login"    className="btn btn-ghost btn-sm">Sign In</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
            </div>
          )}

          {/* Mobile toggle */}
          <button onClick={() => setMobileOpen(v => !v)} className="md:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-1">
          <form onSubmit={handleSearch} className="mb-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products…" className="field pl-9 text-sm" />
            </div>
          </form>
          {[['All Products', '/products'], ['Toners', '/products?category=toners'], ['Ink Cartridges', '/products?category=ink-cartridges'], [' Deals', '/products?featured=true']].map(([l, h]) => (
            <Link key={h} to={h} onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">{l}</Link>
          ))}
          {isAuth ? (
            <>
              <Link to="/account" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 text-sm text-gray-700 rounded-xl hover:bg-gray-50">My Account</Link>
              {isAdmin && <Link to="/admin" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 text-sm text-brand-600 font-medium rounded-xl hover:bg-brand-50">Admin Panel</Link>}
              <button onClick={() => { setMobileOpen(false); handleLogout() }} className="block w-full text-left px-3 py-2.5 text-sm text-red-600 rounded-xl hover:bg-red-50">Sign Out</button>
            </>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link to="/login"    onClick={() => setMobileOpen(false)} className="btn btn-secondary btn-sm flex-1 justify-center">Sign In</Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="btn btn-primary  btn-sm flex-1 justify-center">Sign Up</Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}