import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/auth'

let isRefreshing = false
let queue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

const drainQueue = (token: string) => {
  queue.forEach(({ resolve }) => resolve(token))
  queue = []
}
const rejectQueue = (err: unknown) => {
  queue.forEach(({ reject }) => reject(err))
  queue = []
}

export const api: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': undefined  },
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
      // Queue this request behind the in-flight refresh. Storing both
      // resolve AND reject (not just resolve) is what makes this safe: if
      // the refresh call itself fails below, rejectQueue() settles every
      // queued promise with the error instead of leaving them pending
      // forever — otherwise, whatever component fired this request would
      // be stuck "loading" indefinitely with no error and no data.
      return new Promise((resolve, reject) => {
        queue.push({
          resolve: token => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(api(original))
          },
          reject,
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
    } catch (refreshErr) {
      useAuthStore.getState().clearAuth()
      rejectQueue(refreshErr)
      window.location.href = '/login'
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  },
)