import { NavLink, Outlet, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Boxes,
  Users,
  Store,
} from 'lucide-react'
import { cn } from '@/utils/cn'

const NAV = [
  { to: '/admin',            label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/admin/orders',     label: 'Orders',     icon: ShoppingBag },
  { to: '/admin/products',   label: 'Products',   icon: Package },
  { to: '/admin/inventory',  label: 'Inventory',  icon: Boxes },
  { to: '/admin/users',      label: 'Customers',  icon: Users },
] as const

export default function AdminLayout() {
  return (
    <div className="section py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Admin Panel</p>
          <h1 className="text-2xl font-black text-gray-900">Store Management</h1>
        </div>
        <Link to="/products" className="btn btn-secondary btn-sm">
          <Store size={14} /> View Store
        </Link>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-8">
        <aside className="card p-3 h-fit">
          <nav className="space-y-1">
            {NAV.map(({ to, label, icon: Icon, ...rest }) => (
              <NavLink
                key={to}
                to={to}
                end={'end' in rest ? rest.end : false}
                className={({ isActive }) => cn(
                  'flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-xl transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-50',
                )}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
