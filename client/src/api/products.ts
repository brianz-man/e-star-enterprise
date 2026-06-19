import { api } from './api'
import type { Product, ApiList, ApiOk, ProductQuery } from '@/types'

export const productsApi = {
  list: (params: ProductQuery = {}) =>
    api.get<ApiList<Product>>('/products', { params }).then(r => r.data),

  get: (slug: string) =>
    api.get<ApiOk<Product>>(`/products/${slug}`).then(r => r.data.data),

  create: (data: unknown) =>
    api.post<ApiOk<Product>>('/products', data).then(r => r.data.data),

  update: (id: string, data: unknown) =>
    api.put<ApiOk<Product>>(`/products/${id}`, data).then(r => r.data.data),

  remove: (id: string) =>
    api.delete<ApiOk<null>>(`/products/${id}`).then(r => r.data),

  uploadImage: (id: string, file: File) => {
    const form = new FormData()
    form.append('image', file)
    return api.post<ApiOk<{ id: string; url: string }>>(
      `/products/${id}/images`, form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    ).then(r => r.data.data)
  },

  deleteImage: (productId: string, imageId: string) =>
    api.delete<ApiOk<null>>(`/products/${productId}/images/${imageId}`).then(r => r.data),
}