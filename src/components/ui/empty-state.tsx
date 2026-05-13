import * as React from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
  /** Optional inline arrow link below the primary action — per § 6.
   *  Use this for secondary paths so they don't compete with the CTA. */
  inlineLink?: React.ReactNode
  className?: string
  variant?: 'default' | 'compact'
}

/**
 * Empty state per Studio § 6 / § 13.5 — text-driven, no icon, no illustration.
 * Three pieces in order: what is this (title) → why does it matter (description)
 * → what should I do next (action). Secondary path is an inline arrow link
 * below the primary, never a ghost button beside it.
 */
export const EmptyState = React.memo(function EmptyState({
  title,
  description,
  action,
  inlineLink,
  className,
  variant = 'default',
}: EmptyStateProps) {
  const isCompact = variant === 'compact'

  return (
    <div
      className={cn(
        'flex flex-col items-center px-4 text-center mx-auto max-w-sm',
        isCompact ? 'py-8' : 'py-12',
        className,
      )}
    >
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-foreground-muted">{description}</p>
      )}
      {action && <div className={cn(isCompact ? 'mt-4' : 'mt-6')}>{action}</div>}
      {inlineLink && (
        <div className="mt-3 text-sm">{inlineLink}</div>
      )}
    </div>
  )
})
