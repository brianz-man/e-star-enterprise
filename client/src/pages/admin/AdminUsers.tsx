import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '@/api/admin'
import { Spinner } from '@/components/common/Spinner'
import { fmtDate } from '@/utils/formatDate'
import type { AdminUser } from '@/types'
import toast from 'react-hot-toast'

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [busy, setBusy] = useState(true)

  const load = useCallback(async () => {
    setBusy(true)
    try {
      const r = await adminApi.users({ page, limit: 20 })
      setUsers(r.data)
      setPages(r.meta?.pages ?? 1)
    } catch {
      toast.error('Failed to load customers')
    } finally {
      setBusy(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-gray-900">Customers</h2>
        <p className="text-sm text-gray-500 mt-1">Registered customer accounts</p>
      </div>

      <div className="card overflow-hidden">
        {busy
          ? <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          : <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      {['Name', 'Email', 'Phone', 'Orders', 'Role', 'Joined', 'Status'].map(h => (
                        <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium text-gray-800 text-xs">{u.firstName} {u.lastName}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{u.email}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">{u.phone ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-800 font-semibold">{u._count.orders}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${u.role === 'CUSTOMER' ? 'bg-gray-100 text-gray-600' : 'bg-brand-100 text-brand-700'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(u.createdAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pages > 1 && (
                <div className="flex justify-center gap-2 p-4 border-t border-gray-100">
                  {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`w-9 h-9 rounded-xl text-sm font-semibold transition-colors ${page === n ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </>
        }
      </div>
    </div>
  )
}
