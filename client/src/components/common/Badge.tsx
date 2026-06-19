import { cn } from '@/utils/cn'

interface BadgeProps { children: React.ReactNode; className?: string }

export const Badge = ({ children, className }: BadgeProps) => (
  <span className={cn('badge', className)}>{children}</span>
)