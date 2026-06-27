import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Plus, Trash2, Upload, X } from 'lucide-react'
import { adminApi } from '@/api/admin'
import { productsApi } from '@/api/products'
import { Input } from '@/components/common/Input'
import { Button } from '@/components/common/Button'
import { Spinner } from '@/components/common/Spinner'
import { getApiError } from '@/utils/getApiError'
import type { AdminCatalog, Product, ProductImage } from '@/types'
import toast from 'react-hot-toast'

type ProductFormValues = {
  name: string
  description: string
  sku: string
  price: number
  comparePrice?: number
  stockQty: number
  lowStockAt: number
  brandId: string
  categoryId: string
  isFeatured: boolean
  weight?: number
  compatibility: { brand: string; printerModel: string; printerSeries?: string }[]
}

const productSchema = z.object({
  name: z.string().min(2, 'Min 2 characters'),
  description: z.string().min(10, 'Min 10 characters'),
  sku: z.string().min(2),
  price: z.coerce.number().positive('Must be positive'),
  comparePrice: z.coerce.number().positive().optional(),
  stockQty: z.coerce.number().int().min(0),
  lowStockAt: z.coerce.number().int().min(1),
  brandId: z.string().uuid('Select a brand'),
  categoryId: z.string().uuid('Select a category'),
  isFeatured: z.boolean(),
  weight: z.coerce.number().positive().optional(),
  compatibility: z.array(z.object({
    brand: z.string().min(1),
    printerModel: z.string().min(1),
    printerSeries: z.string().optional(),
  })),
})

export default function AdminProductForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const nav = useNavigate()

  const [catalog, setCatalog] = useState<AdminCatalog | null>(null)
  const [images, setImages] = useState<ProductImage[]>([])
  const [busy, setBusy] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as Resolver<ProductFormValues>,
    defaultValues: {
      stockQty: 0,
      lowStockAt: 5,
      isFeatured: false,
      compatibility: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'compatibility' })

  useEffect(() => {
    adminApi.catalog()
      .then(setCatalog)
      .catch(() => toast.error('Failed to load brands/categories'))
  }, [])

  useEffect(() => {
    if (!isEdit || !id) return
    setBusy(true)
    adminApi.product(id)
      .then((p: Product) => {
        setImages(p.images ?? [])
        reset({
          name: p.name,
          description: p.description,
          sku: p.sku,
          price: Number(p.price),
          comparePrice: p.comparePrice ? Number(p.comparePrice) : undefined,
          stockQty: p.stockQty,
          lowStockAt: p.lowStockAt,
          brandId: p.brand.id,
          categoryId: p.category.id,
          isFeatured: p.isFeatured,
          weight: p.weight ?? undefined,
          compatibility: (p.compatibility ?? []).map(c => ({
            brand: c.brand,
            printerModel: c.printerModel,
            printerSeries: c.printerSeries,
          })),
        })
      })
      .catch(() => toast.error('Product not found'))
      .finally(() => setBusy(false))
  }, [id, isEdit, reset])

  const onSubmit = async (data: ProductFormValues) => {
    setSaving(true)
    try {
      const payload = {
        ...data,
        sku: data.sku.toUpperCase(),
        comparePrice: data.comparePrice || undefined,
        weight: data.weight || undefined,
      }
      if (isEdit && id) {
        await productsApi.update(id, payload)
        toast.success('Product updated')
        nav('/admin/products')
      } else {
        const created = await productsApi.create(payload)
        toast.success('Product created — add images next')
        nav(`/admin/products/${created.id}/edit`)
      }
    } catch (e: unknown) {
      toast.error(getApiError(e, 'Failed to save product'))
    } finally {
      setSaving(false)
    }
  }

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setUploading(true)
    try {
      const img = await productsApi.uploadImage(id, file)
      setImages(prev => [...prev, { ...img, publicId: '', isPrimary: prev.length === 0, sortOrder: prev.length }])
      toast.success('Image uploaded')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const removeImage = async (imageId: string) => {
    if (!id || !confirm('Delete this image?')) return
    try {
      await productsApi.deleteImage(id, imageId)
      setImages(prev => prev.filter(i => i.id !== imageId))
      toast.success('Image removed')
    } catch {
      toast.error('Failed to delete image')
    }
  }

  if (busy) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/products" className="btn btn-ghost btn-sm px-2"><ArrowLeft size={16} /></Link>
        <h2 className="text-xl font-black text-gray-900">{isEdit ? 'Edit Product' : 'New Product'}</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h3 className="font-bold text-gray-900 text-sm">Basic Info</h3>
          <Input label="Product name" error={errors.name?.message} {...register('name')} />
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
            <textarea {...register('description')} rows={4} className="field resize-none" />
            {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="SKU" placeholder="HP-CE285A" error={errors.sku?.message} {...register('sku')} />
            <Input label="Weight (kg, optional)" type="number" step="0.01" error={errors.weight?.message as string} {...register('weight')} />
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h3 className="font-bold text-gray-900 text-sm">Pricing & Stock</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Price (KES)" type="number" error={errors.price?.message} {...register('price')} />
            <Input label="Compare price (optional)" type="number" error={errors.comparePrice?.message as string} {...register('comparePrice')} />
            <Input label="Stock quantity" type="number" error={errors.stockQty?.message} {...register('stockQty')} />
            <Input label="Low stock alert at" type="number" error={errors.lowStockAt?.message} {...register('lowStockAt')} />
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h3 className="font-bold text-gray-900 text-sm">Classification</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Brand</label>
              <select {...register('brandId')} className="field text-sm">
                <option value="">Select brand</option>
                {catalog?.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              {errors.brandId && <p className="text-xs text-red-600 mt-1">{errors.brandId.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
              <select {...register('categoryId')} className="field text-sm">
                <option value="">Select category</option>
                {catalog?.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.categoryId && <p className="text-xs text-red-600 mt-1">{errors.categoryId.message}</p>}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
            <input type="checkbox" {...register('isFeatured')} className="rounded border-gray-300 text-brand-600" />
            Featured product (shown on homepage)
          </label>
        </div>

        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm">Printer Compatibility</h3>
            <Button type="button" size="sm" variant="secondary" onClick={() => append({ brand: '', printerModel: '' })}>
              <Plus size={14} /> Add
            </Button>
          </div>
          {fields.length === 0
            ? <p className="text-sm text-gray-400">No compatibility entries — add printer models this product works with.</p>
            : fields.map((field, i) => (
                <div key={field.id} className="grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start">
                  <Input placeholder="Brand (HP)" error={errors.compatibility?.[i]?.brand?.message} {...register(`compatibility.${i}.brand`)} />
                  <Input placeholder="Model (P1102)" error={errors.compatibility?.[i]?.printerModel?.message} {...register(`compatibility.${i}.printerModel`)} />
                  <Input placeholder="Series (optional)" {...register(`compatibility.${i}.printerSeries`)} />
                  <button type="button" onClick={() => remove(i)} className="btn btn-ghost btn-sm px-2 text-red-600 mt-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
          }
        </div>

        {isEdit && id && (
          <div className="card p-6 space-y-4">
            <h3 className="font-bold text-gray-900 text-sm">Images</h3>
            <div className="flex flex-wrap gap-3">
              {images.map(img => (
                <div key={img.id} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 group">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
              <label className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/50 transition-colors">
                {uploading ? <Spinner size="sm" /> : <><Upload size={18} className="text-gray-400" /><span className="text-[10px] text-gray-400 mt-1">Upload</span></>}
                <input type="file" accept="image/*" className="hidden" onChange={uploadImage} disabled={uploading} />
              </label>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" loading={saving} size="lg">
            {isEdit ? 'Save Changes' : 'Create Product'}
          </Button>
          <Link to="/admin/products"><Button type="button" variant="secondary" size="lg">Cancel</Button></Link>
        </div>
      </form>
    </div>
  )
}
