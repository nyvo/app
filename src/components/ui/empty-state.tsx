import * as React from 'react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  variant?: 'default' | 'public'
}

/**
 * Reusable empty state component for displaying when lists are empty
 */
export const EmptyState = React.memo(function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = 'default'
}: EmptyStateProps) {
  const isPublic = variant === 'public'

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {Icon && (
        <div className={cn(
          'mb-4 rounded-full p-3',
          isPublic ? 'bg-muted' : 'bg-surface-secondary'
        )}>
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
})
