import { useState, useEffect } from 'react'
import { useNavigate }   from 'react-router-dom'
import { useForm }       from 'react-hook-form'
import { zodResolver }   from '@hookform/resolvers/zod'
import { z }             from 'zod'
import { MapPin, Smartphone, CheckCircle, Loader2, ShoppingBag } from 'lucide-react'
import { ordersApi }     from '@/api/orders'
import { paymentsApi }   from '@/api/payments'
import { useCart }       from '@/hooks/cart'
import { useAuth }       from '@/hooks/auth'
import { Input }         from '@/components/common/Input'
import { Button }        from '@/components/common/Button'
import { Spinner }       from '@/components/common/Spinner'
import { kes }           from '@/utils/formatCurrency'
import { getApiError }   from '@/utils/getApiError'
import type { Order }    from '@/types'
import toast from 'react-hot-toast'

const schema = z.object({
  firstName:  z.string().min(2),
  lastName:   z.string().min(2),
  phone:      z.string().min(9),
  county:     z.string().min(2),
  town:       z.string().min(2),
  street:     z.string().min(3),
  postalCode: z.string().optional(),
  notes:      z.string().max(500).optional(),
})
type Form = z.infer<typeof schema>
type Step = 'address' | 'payment' | 'done'

export default function Checkout() {
  const { cart, resetCart } = useCart()
  const { user }  = useAuth()
  const nav       = useNavigate()
  const [step, setStep]     = useState<Step>('address')
  const [order, setOrder]   = useState<Order | null>(null)
  const [mpPhone, setMpPhone] = useState(user?.phone ?? '')
  const [creating, setCreating] = useState(false)
  const [paying,   setPaying]   = useState(false)
  const [polling,  setPolling]  = useState(false)

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: user?.firstName, lastName: user?.lastName, phone: user?.phone ?? '' },
  })

  useEffect(() => {
    if (step === 'address' && (!cart || cart.items.length === 0)) nav('/')
  }, [cart, nav, step])

  useEffect(() => {
    if (user?.firstName) setValue('firstName', user.firstName)
    if (user?.lastName)  setValue('lastName',  user.lastName)
    if (user?.phone)     { setValue('phone', user.phone); setMpPhone(user.phone) }
  }, [user, setValue])

  // Poll payment status
  useEffect(() => {
    if (!polling || !order) return
    const id = setInterval(async () => {
      try {
        const s = await paymentsApi.status(order.id)
        if (s?.payment?.status === 'SUCCESS') { clearInterval(id); setPolling(false); setStep('done') }
        if (s?.payment?.status === 'FAILED')  { clearInterval(id); setPolling(false); toast.error('Payment failed. Please try again.') }
      } catch { /* ignore */ }
    }, 3000)
    return () => clearInterval(id)
  }, [polling, order])

  const createOrder = async (data: Form) => {
    const { notes, postalCode, ...addr } = data
    setCreating(true)
    try {
      const o = await ordersApi.create({ deliveryAddress: { ...addr, postalCode }, notes })
      resetCart()
      setOrder(o); setStep('payment')
    } catch (e: unknown) {
      toast.error(getApiError(e, 'Failed to create order'))
    } finally { setCreating(false) }
  }

  const pay = async () => {
    if (!order) return
    setPaying(true)
    try {
      await paymentsApi.initiate(order.id, mpPhone)
      toast.success('M-Pesa prompt sent! Enter your PIN.')
      setPolling(true)
    } catch (e: unknown) {
      toast.error(getApiError(e, 'M-Pesa initiation failed'))
    } finally { setPaying(false) }
  }

  if (step === 'address' && (!cart || cart.items.length === 0)) {
    return <div className="flex justify-center py-32"><Spinner size="lg" /></div>
  }

  const subtotal = step === 'address' && cart
    ? cart.total
    : Number(order?.subtotal ?? 0)
  const fee = step === 'address' && cart
    ? (subtotal >= 5000 ? 0 : 300)
    : Number(order?.deliveryFee ?? 0)
  const total = step === 'address' && cart
    ? subtotal + fee
    : Number(order?.totalAmount ?? 0)

  const summaryItems = step === 'address' && cart
    ? cart.items.map(item => ({
        key: item.id,
        name: item.product.name,
        quantity: item.quantity,
        lineTotal: Number(item.product.price) * item.quantity,
        imageUrl: item.product.images.find(i => i.isPrimary)?.url ?? item.product.images[0]?.url,
      }))
    : (order?.items ?? []).map(item => ({
        key: item.id,
        name: item.name,
        quantity: item.quantity,
        lineTotal: Number(item.total),
        imageUrl: undefined as string | undefined,
      }))

  return (
    <div className="section py-10">
      <h1 className="text-2xl font-black text-gray-900 mb-8">Checkout</h1>
      <div className="grid lg:grid-cols-3 gap-8">

        {/* Steps */}
        <div className="lg:col-span-2 space-y-4">

          {/* Address */}
          <div className={`card p-6 ${step !== 'address' ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-2.5 mb-5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${step === 'address' ? 'bg-brand-600 text-white' : 'bg-green-100 text-green-700'}`}>
                {step === 'address' ? '1' : <CheckCircle size={16} />}
              </div>
              <h2 className="font-bold text-gray-900 flex items-center gap-2"><MapPin size={15} /> Delivery Address</h2>
            </div>
            {step === 'address' && (
              <form onSubmit={handleSubmit(createOrder)} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input label="First name" error={errors.firstName?.message} {...register('firstName')} />
                  <Input label="Last name"  error={errors.lastName?.message}  {...register('lastName')} />
                </div>
                <Input label="Phone" type="tel" placeholder="0712 345 678" error={errors.phone?.message} {...register('phone')} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="County" placeholder="Nairobi"   error={errors.county?.message} {...register('county')} />
                  <Input label="Town"   placeholder="Westlands" error={errors.town?.message}   {...register('town')} />
                </div>
                <Input label="Street" placeholder="Waiyaki Way" error={errors.street?.message} {...register('street')} />
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes (optional)</label>
                  <textarea {...register('notes')} rows={2} placeholder="Call before delivery…" className="field resize-none" />
                </div>
                <Button type="submit" loading={creating} size="lg">Continue to Payment</Button>
              </form>
            )}
          </div>

          {/* Payment */}
          {(step === 'payment' || step === 'done') && (
            <div className="card p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${step === 'payment' ? 'bg-brand-600 text-white' : 'bg-green-100 text-green-700'}`}>
                  {step === 'done' ? <CheckCircle size={16} /> : '2'}
                </div>
                <h2 className="font-bold text-gray-900 flex items-center gap-2"><Smartphone size={15} /> M-Pesa Payment</h2>
              </div>
              {step === 'payment' && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                    <p className="text-sm font-semibold text-green-800">Order #{order?.orderNumber}</p>
                    <p className="text-sm text-green-700">Total: <strong>{kes(order?.totalAmount ?? 0)}</strong></p>
                  </div>
                  <Input label="M-Pesa phone number" type="tel" placeholder="0712 345 678"
                    value={mpPhone} onChange={e => setMpPhone(e.target.value)}
                    hint="An STK Push prompt will be sent to this number" />
                  {polling && (
                    <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
                      <Loader2 size={16} className="animate-spin shrink-0" />
                      Waiting for M-Pesa confirmation — enter your PIN on your phone…
                    </div>
                  )}
                  {!polling && (
                    <Button onClick={pay} loading={paying} fullWidth size="lg">
                      <Smartphone size={18} /> Pay {kes(total)} with M-Pesa
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Success */}
          {step === 'done' && (
            <div className="card p-10 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Order Confirmed!</h2>
              <p className="text-gray-500 font-mono text-sm mb-1">#{order?.orderNumber}</p>
              <p className="text-gray-500 text-sm mb-8">You'll receive an SMS update. Thank you for shopping with E-Star!</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => nav('/account')} variant="secondary">View My Orders</Button>
                <Button onClick={() => nav('/products')}>Continue Shopping</Button>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="card p-6 h-fit">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm"><ShoppingBag size={14} />Order Summary</h2>
          <ul className="space-y-3 mb-4">
            {summaryItems.map(item => (
                <li key={item.key} className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-50 shrink-0 border border-gray-100">
                    {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{item.name}</p>
                    <p className="text-[10px] text-gray-400">× {item.quantity}</p>
                  </div>
                  <p className="text-xs font-bold text-gray-900">{kes(item.lineTotal)}</p>
                </li>
              ))}
          </ul>
          <hr className="border-gray-100 mb-3" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{kes(subtotal)}</span></div>
            <div className="flex justify-between text-gray-500">
              <span>Delivery</span>
              <span className={fee === 0 ? 'text-green-600 font-semibold' : ''}>{fee === 0 ? 'FREE ' : kes(fee)}</span>
            </div>
            <hr className="border-gray-100" />
            <div className="flex justify-between font-black text-gray-900 text-base"><span>Total</span><span>{kes(total)}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}