import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User } from '@/types'

interface AuthState {
  user:        User | null
  accessToken: string | null
  isAuth:      boolean

  setAuth:   (user: User, token: string) => void
  setToken:  (token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      user:        null,
      accessToken: null,
      isAuth:      false,

      setAuth:   (user, accessToken) => set({ user, accessToken, isAuth: true }),
      setToken:  accessToken          => set({ accessToken }),
      clearAuth: ()                   => set({ user: null, accessToken: null, isAuth: false }),
    }),
    {
      name:    'estar-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: s => ({
        user: s.user,
        isAuth: s.isAuth,
      }),
    },
  ),
)