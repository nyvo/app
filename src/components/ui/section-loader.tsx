import { cn } from '@/lib/utils'
import { Spinner } from './spinner'

interface SectionLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
  className?: string
}

const containerSizes = {
  sm: 'h-24',
  md: 'h-40',
  lg: 'h-64',
}

const spinnerSizes = {
  sm: 'lg' as const,
  md: 'lg' as const,
  lg: 'xl' as const,
}

function SectionLoader({
  size = 'md',
  message,
  className
}: SectionLoaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        containerSizes[size],
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Spinner size={spinnerSizes[size]} />
      {message && (
        <p className="mt-3 text-xs text-muted-foreground">{message}</p>
      )}
      <span className="sr-only">{message || 'Laster'}</span>
    </div>
  )
}

export { SectionLoader }
