import * as React from 'react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

/**
 * Reusable empty state component for displaying when lists are empty
 */
export const EmptyState = React.memo(function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {Icon && (
        <div className="mb-4 rounded-full bg-surface-secondary p-3">
          <Icon className="h-6 w-6 text-text-tertiary" />
        </div>
      )}
      <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-text-tertiary max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
})
