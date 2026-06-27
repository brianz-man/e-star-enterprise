import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
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
  email:    z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
})
type Form = z.infer<typeof schema>

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [showPw,  setShowPw]  = useState(false)
  const { setAuth }    = useAuthStore()
  const { fetchCart }  = useCartStore()
  const nav            = useNavigate()
  const from           = (useLocation().state as { from?: { pathname?: string } } | null)?.from?.pathname || '/'

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: Form) => {
    setLoading(true)
    try {
      const r = await authApi.login(data)
      setAuth(r.user, r.accessToken)
      await fetchCart().catch(() => {})
      toast.success(`Welcome back, ${r.user.firstName}!`)
      nav(from, { replace: true })
    } catch (e: unknown) {
      toast.error(getApiError(e, 'Invalid email or password'))
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-brand-900 to-brand-700 items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #60a5fa 0%, transparent 70%)' }} />
        <div className="relative text-white text-center">
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center"><Package size={28} className="text-white" /></div>
            <div>
              <div className="font-black text-3xl tracking-tight">E-Star Enterprise</div>
              <div className="text-brand-200 text-sm">Printer Supplies · Kenya</div>
            </div>
          </div>
          <h2 className="text-3xl font-black mb-4 leading-tight">Kenya's #1<br/>Printer Supplies</h2>
          <p className="text-brand-200 text-sm max-w-xs mx-auto leading-relaxed">Genuine HP, Canon, Epson &amp; more. Pay with M-Pesa. Fast delivery.</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 bg-gray-50">
        <div className="card w-full max-w-md p-8">
          <div className="flex justify-center mb-6 lg:hidden">
            <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center"><Package size={22} className="text-white" /></div>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-1">Welcome back</h1>
          <p className="text-sm text-gray-500 mb-7">Sign in to your E-Star account</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Email address" type="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
            <Input label="Password" type={showPw ? 'text' : 'password'} placeholder="••••••••"
              error={errors.password?.message}
              rightIcon={<button type="button" onClick={() => setShowPw(v => !v)} className="hover:text-gray-700 transition-colors">{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>}
              {...register('password')} />
            <Button type="submit" fullWidth size="lg" loading={loading}>Sign In</Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            No account?{' '}<Link to="/register" className="text-brand-600 font-semibold hover:underline">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}