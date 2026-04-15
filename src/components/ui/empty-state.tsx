import * as React from 'react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  variant?: 'default' | 'public' | 'compact'
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
  const isCompact = variant === 'compact'

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-4 text-center',
        isCompact ? 'py-8' : 'py-12',
        className
      )}
    >
      {Icon && (
        <div className={cn(
          'mb-4 flex items-center justify-center rounded-lg border border-border',
          isCompact ? 'size-10' : 'size-12',
          isPublic ? 'bg-muted' : 'bg-background'
        )}>
          <Icon className={cn(isCompact ? 'size-4' : 'size-5', 'text-muted-foreground')} />
        </div>
      )}
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      {description && (
        <p className={cn('mt-1 text-muted-foreground', isCompact ? 'text-sm max-w-xs' : 'text-sm max-w-sm')}>
          {description}
        </p>
      )}
      {action && <div className={cn(isCompact ? 'mt-4' : 'mt-6')}>{action}</div>}
    </div>
  )
})
