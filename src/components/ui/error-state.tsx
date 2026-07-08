import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
  /**
   * default — bare, lives directly on the page canvas (use inside an existing card)
   * inline  — bare with reduced vertical padding (small slots)
   * card    — wraps itself in a bordered surface (when not already inside a card)
   */
  variant?: 'default' | 'inline' | 'card'
}

const variantClasses = {
  default: 'flex flex-col items-center justify-center p-6 text-center',
  inline: 'flex flex-col items-center justify-center py-8 px-4 text-center',
  card: 'flex flex-col items-center justify-center rounded-lg border border-border p-6 text-center',
}

/**
 * Section-level error per Studio § 13.4 — bounded retry inside a single widget.
 * Text-driven; no chromatic icon. Prefer this over a page-level error when only
 * one card or list has failed.
 */
export const ErrorState = React.memo(function ErrorState({
  title = 'Kunne ikke laste innholdet',
  message = 'Sjekk nettforbindelsen og prøv igjen.',
  onRetry,
  retryLabel = 'Prøv igjen',
  className,
  variant = 'default'
}: ErrorStateProps) {
  return (
    <div
      className={cn(variantClasses[variant], className)}
      role="status"
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-foreground-muted max-w-sm">{message}</p>
      {onRetry && (
        <Button
          variant="default"
          onClick={onRetry}
          className="mt-4"
        >
          {retryLabel}
        </Button>
      )}
    </div>
  )
})
