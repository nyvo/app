import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from './empty'

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
    <Empty
      className={cn(
        'mx-auto max-w-sm border-0 bg-transparent p-0 px-4 text-center',
        isCompact ? 'py-8' : 'py-12',
        className,
      )}
    >
      <EmptyHeader className="gap-1">
        <EmptyTitle className="text-sm font-medium tracking-normal text-foreground">
          {title}
        </EmptyTitle>
        {description && (
          <EmptyDescription className="text-sm/normal text-foreground-muted">
            {description}
          </EmptyDescription>
        )}
      </EmptyHeader>
      {(action || inlineLink) && (
        <EmptyContent className={cn('gap-3', isCompact ? 'mt-0' : 'mt-2')}>
          {action}
          {inlineLink && <div className="text-sm">{inlineLink}</div>}
        </EmptyContent>
      )}
    </Empty>
  )
})
