import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

interface GuardProps {
  children:   React.ReactNode
  adminOnly?: boolean
}

export const Guard = ({ children, adminOnly = false }: GuardProps) => {
  const { isAuth, user } = useAuthStore()
  const location         = useLocation()

  if (!isAuth) return <Navigate to="/login" state={{ from: location }} replace />
  if (adminOnly && user?.role === 'CUSTOMER') return <Navigate to="/" replace />

  return <>{children}</>
}