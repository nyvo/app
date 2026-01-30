import { cn } from '@/lib/utils'
import { Spinner } from './spinner'

interface PageLoaderProps {
  message?: string
  variant?: 'default' | 'fullscreen' | 'overlay'
  className?: string
}

const variantClasses = {
  default: 'flex items-center justify-center h-64',
  fullscreen: 'flex items-center justify-center h-screen',
  overlay: 'absolute inset-0 z-30 flex items-center justify-center bg-white',
}

function PageLoader({
  message,
  variant = 'default',
  className
}: PageLoaderProps) {
  return (
    <div
      className={cn(variantClasses[variant], className)}
      role="status"
      aria-live="polite"
    >
      <div className="text-center">
        <Spinner size="xl" className="mx-auto" />
        {message && (
          <p className="mt-4 text-sm text-muted-foreground">{message}</p>
        )}
        <span className="sr-only">{message || 'Laster'}</span>
      </div>
    </div>
  )
}

export { PageLoader }
