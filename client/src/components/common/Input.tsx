import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:    string
  error?:    string
  hint?:     string
  leftIcon?:  ReactNode
  rightIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className, id, ...rest }, ref) => {
    const elId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={elId} className="block text-sm font-semibold text-gray-700">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={elId}
            className={cn('field', leftIcon && 'pl-10', rightIcon && 'pr-10', error && 'error', className)}
            {...rest}
          />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    )
  },
)
Input.displayName = 'Input'