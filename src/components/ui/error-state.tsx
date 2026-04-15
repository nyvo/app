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
  card: 'flex flex-col items-center justify-center h-64 rounded-lg border border-border bg-surface text-center',
}

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
      <div className="mb-4 flex size-12 items-center justify-center rounded-lg border border-status-error-border/70 bg-status-error-bg/60">
        <AlertCircle className="h-6 w-6 text-status-error-text stroke-[1.5]" aria-hidden="true" />
      </div>
      <h3 className="text-base font-medium mb-1 text-foreground">{title}</h3>
      <p className="text-sm mb-4 max-w-xs text-muted-foreground">{message}</p>
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
