import { api } from './api'

export interface PaymentStatusData {
  orderId: string
  orderNumber: string
  orderStatus: string
  payment: {
    status: string
    amount: number | string
    mpesaReceiptNo: string | null
    paidAt: string | null
  } | null
}

export const paymentsApi = {
  initiate: (orderId: string, phone: string) =>
    api.post<{ success: boolean; message: string; data: { checkoutRequestId: string } }>(
      '/payments/mpesa/initiate',
      { orderId, phone },
    ).then(r => r.data),

  status: (orderId: string) =>
    api.get<{ success: boolean; data: PaymentStatusData }>(
      `/payments/${orderId}/status`,
    ).then(r => r.data.data),
}