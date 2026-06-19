import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Layout }  from '@/components/layout/Layout'
import { Guard }   from './Guard'
import { Spinner } from '@/components/common/Spinner'

const Home             = lazy(() => import('@/pages/Home'))
const Products         = lazy(() => import('@/pages/Products'))
const ProductDetail    = lazy(() => import('@/pages/ProductDetail'))
const Login            = lazy(() => import('@/pages/Login'))
const Register         = lazy(() => import('@/pages/Register'))
const Checkout         = lazy(() => import('@/pages/Checkout'))
const Account          = lazy(() => import('@/pages/Account'))
const OrderDetail      = lazy(() => import('@/pages/OrderDetail'))
const NotFound         = lazy(() => import('@/pages/NotFound'))

const AdminLayout      = lazy(() => import('@/components/admin/AdminLayout'))
const AdminDashboard   = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminOrders      = lazy(() => import('@/pages/admin/AdminOrders'))
const AdminProducts    = lazy(() => import('@/pages/admin/AdminProducts'))
const AdminProductForm = lazy(() => import('@/pages/admin/AdminProductForm'))
const AdminInventory   = lazy(() => import('@/pages/admin/AdminInventory'))
const AdminUsers       = lazy(() => import('@/pages/admin/AdminUsers'))

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Spinner size="lg" />
  </div>
)

export const AppRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Public */}
      <Route path="/"               element={<Layout><Home /></Layout>} />
      <Route path="/products"       element={<Layout><Products /></Layout>} />
      <Route path="/products/:slug" element={<Layout><ProductDetail /></Layout>} />
      <Route path="/login"          element={<Login />} />
      <Route path="/register"       element={<Register />} />

      {/* Protected */}
      <Route path="/checkout"           element={<Guard><Layout><Checkout /></Layout></Guard>} />
      <Route path="/account"            element={<Guard><Layout><Account /></Layout></Guard>} />
      <Route path="/account/orders/:id" element={<Guard><Layout><OrderDetail /></Layout></Guard>} />

      {/* Admin */}
      <Route path="/admin" element={<Guard adminOnly><Layout><AdminLayout /></Layout></Guard>}>
        <Route index element={<AdminDashboard />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="products/new" element={<AdminProductForm />} />
        <Route path="products/:id/edit" element={<AdminProductForm />} />
        <Route path="inventory" element={<AdminInventory />} />
        <Route path="users" element={<AdminUsers />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Layout><NotFound /></Layout>} />
    </Routes>
  </Suspense>
)
