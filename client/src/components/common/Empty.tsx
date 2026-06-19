import type { ReactNode } from 'react'

interface EmptyProps {
  icon?:    ReactNode
  title:    string
  message?: string
  action?:  ReactNode
}

export const Empty = ({ icon, title, message, action }: EmptyProps) => (
  <div className="flex flex-col items-center justify-center py-20 text-center px-4">
    {icon && <div className="mb-4 text-gray-300">{icon}</div>}
    <h3 className="text-lg font-semibold text-gray-800 mb-1">{title}</h3>
    {message && <p className="text-sm text-gray-500 max-w-xs mb-6">{message}</p>}
    {action}
  </div>
)