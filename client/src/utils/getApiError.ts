import type { AxiosError } from 'axios'

interface ApiErrorBody {
  error?: string
  message?: string
}

export function getApiError(err: unknown, fallback = 'Something went wrong'): string {
  if (!err || typeof err !== 'object') return fallback

  const axiosErr = err as AxiosError<ApiErrorBody>
  const body = axiosErr.response?.data
  if (body?.error) return body.error
  if (body?.message) return body.message
  if (axiosErr.message) return axiosErr.message

  return fallback
}
