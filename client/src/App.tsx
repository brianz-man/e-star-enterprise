import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { Toaster }       from 'react-hot-toast'
import { AppRoutes }     from '@/routes'
import { useAuthStore }  from '@/store/auth'
import { useCartStore }  from '@/store/cart'

export default function App() {
  const isAuth    = useAuthStore(s => s.isAuth)
  const fetchCart = useCartStore(s => s.fetchCart)

  // Bootstrap cart whenever auth state is truthy
  useEffect(() => {
    if (isAuth) fetchCart()
  }, [isAuth, fetchCart])

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { borderRadius: '12px', fontSize: '14px', fontFamily: 'Inter, sans-serif' },
        }}
      />
      <AppRoutes />
    </BrowserRouter>
  )
}