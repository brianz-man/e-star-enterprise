import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/auth'

let isRefreshing = false
let queue: Array<(token: string) => void> = []

const drainQueue = (token: string) => { queue.forEach(cb => cb(token)); queue = [] }

export const api: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request: attach Bearer token ────────────────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response: auto-refresh on 401, retry original ───────────────────────────
api.interceptors.response.use(
  r => r,
  async err => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (err.response?.status !== 401 || original._retry) return Promise.reject(err)

    original._retry = true

    if (isRefreshing) {
      return new Promise(resolve => {
        queue.push(token => {
          original.headers.Authorization = `Bearer ${token}`
          resolve(api(original))
        })
      })
    }

    isRefreshing = true
    try {
      const { data } = await axios.post<{ success: boolean; accessToken: string }>(
        '/api/v1/auth/refresh',
        {},
        { withCredentials: true },
      )
      const newToken = data.accessToken
      useAuthStore.getState().setToken(newToken)
      original.headers.Authorization = `Bearer ${newToken}`
      drainQueue(newToken)
      return api(original)
    } catch {
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  },
)
