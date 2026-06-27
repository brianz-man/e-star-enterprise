import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm }     from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z }           from 'zod'
import { Eye, EyeOff, Package } from 'lucide-react'
import { authApi }     from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import { useCartStore } from '@/store/cart'
import { Input }       from '@/components/common/Input'
import { Button }      from '@/components/common/Button'
import { getApiError } from '@/utils/getApiError'
import toast from 'react-hot-toast'

const schema = z.object({
  firstName: z.string().min(2, 'Min 2 characters'),
  lastName:  z.string().min(2, 'Min 2 characters'),
  email:     z.string().email('Invalid email'),
  phone:     z.string().optional(),
  password:  z.string().min(8, 'Min 8 characters').regex(/[A-Z]/, 'Needs uppercase').regex(/[0-9]/, 'Needs a number'),
})
type Form = z.infer<typeof schema>

export default function Register() {
  const [loading, setLoading] = useState(false)
  const [showPw,  setShowPw]  = useState(false)
  const { setAuth }   = useAuthStore()
  const { fetchCart } = useCartStore()
  const nav           = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: Form) => {
    setLoading(true)
    try {
      const r = await authApi.register(data)
      setAuth(r.user, r.accessToken)
      await fetchCart().catch(() => {})
      toast.success('Account created! Welcome to E-Star.')
      nav('/')
    } catch (e: unknown) {
      toast.error(getApiError(e, 'Registration failed'))
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="card w-full max-w-md p-8">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center"><Package size={22} className="text-white" /></div>
        </div>
        <h1 className="text-2xl font-black text-gray-900 text-center mb-1">Create account</h1>
        <p className="text-sm text-gray-500 text-center mb-7">Join E-Star Enterprise — it's free</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First name" placeholder="Jane" error={errors.firstName?.message} {...register('firstName')} />
            <Input label="Last name"  placeholder="Doe"  error={errors.lastName?.message}  {...register('lastName')} />
          </div>
          <Input label="Email"    type="email" placeholder="you@example.com" error={errors.email?.message}    {...register('email')} />
          <Input label="Phone"    type="tel"   placeholder="0712 345 678"    error={errors.phone?.message}    {...register('phone')} />
          <Input label="Password" type={showPw ? 'text' : 'password'} placeholder="Min 8 · uppercase · number"
            error={errors.password?.message}
            rightIcon={<button type="button" onClick={() => setShowPw(v => !v)} className="hover:text-gray-700">{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>}
            {...register('password')} />
          <Button type="submit" fullWidth size="lg" loading={loading}>Create Account</Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Have an account?{' '}<Link to="/login" className="text-brand-600 font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}