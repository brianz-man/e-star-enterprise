import { useAuthStore } from '@/store/auth'

// Convenience re-export — pages import from here, not store directly
export const useAuth = () => useAuthStore()
export const useUser = () => useAuthStore(s => s.user)
export const useIsAuth = () => useAuthStore(s => s.isAuth)
export const useIsAdmin = () => {
  const role = useAuthStore(s => s.user?.role)
  return role === 'ADMIN' || role === 'SUPERADMIN'
}