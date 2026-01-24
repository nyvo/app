import * as React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
  variant?: 'default' | 'inline' | 'card'
}

const variantClasses = {
  default: 'flex flex-col items-center justify-center h-64 text-center',
  inline: 'flex flex-col items-center justify-center py-8 px-4 text-center',
  card: 'flex flex-col items-center justify-center h-64 text-center rounded-3xl bg-white border border-gray-200',
}

/**
 * Reusable error state component with retry functionality
 * Following design system: status-error colors, rounded-full icon container
 */
export const ErrorState = React.memo(function ErrorState({
  title = 'Noe gikk galt',
  message = 'Kunne ikke laste inn dataene.',
  onRetry,
  retryLabel = 'Prøv på nytt',
  className,
  variant = 'default'
}: ErrorStateProps) {
  return (
    <div
      className={cn(variantClasses[variant], className)}
      role="alert"
      aria-live="polite"
    >
      <div className="mb-4 rounded-full bg-status-error-bg p-4 border border-status-error-border">
        <AlertCircle className="h-8 w-8 text-status-error-text stroke-[1.5]" aria-hidden="true" />
      </div>
      <h3 className="font-geist text-sm font-medium text-text-primary mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-xs mb-4">{message}</p>
      {onRetry && (
        <Button
          variant="outline-soft"
          size="compact"
          onClick={onRetry}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
    </div>
  )
})
