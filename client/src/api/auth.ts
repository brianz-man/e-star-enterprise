import { api } from './api'
import type { ApiAuth, ApiOk, User } from '@/types'

export interface RegisterInput {
  firstName: string; lastName: string
  email: string; password: string; phone?: string
}
export interface LoginInput { email: string; password: string }
export interface VerifyEmailInput { token: string }
export interface ForgotPasswordInput { email: string }
export interface ResetPasswordInput { token: string; password: string }

export const authApi = {
  register: (data: RegisterInput) =>
    api.post<ApiAuth>('/auth/register', data).then(r => r.data),

  login: (data: LoginInput) =>
    api.post<ApiAuth>('/auth/login', data).then(r => r.data),

  refresh: () =>
    api.post<{ success: boolean; accessToken: string }>('/auth/refresh').then(r => r.data),

  logout: () =>
    api.post<ApiOk<null>>('/auth/logout').then(r => r.data),

  me: () =>
    api.get<{ success: boolean; user: User }>('/auth/me').then(r => r.data.user),

  sendVerificationEmail: () =>
    api.post<ApiOk<null>>('/auth/send-verification').then(r => r.data),

  verifyEmail: (data: VerifyEmailInput) =>
    api.post<ApiOk<null>>('/auth/verify-email', data).then(r => r.data),

  forgotPassword: (data: ForgotPasswordInput) =>
    api.post<ApiOk<null>>('/auth/forgot-password', data).then(r => r.data),

  resetPassword: (data: ResetPasswordInput) =>
    api.post<ApiOk<null>>('/auth/reset-password', data).then(r => r.data),
}