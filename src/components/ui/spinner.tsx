import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
}

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: keyof typeof sizeClasses
}

const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ size = 'md', className, ...props }, ref) => {
    return (
      <Loader2
        ref={ref}
        className={cn(
          'animate-spin text-text-tertiary',
          sizeClasses[size],
          className
        )}
        aria-hidden="true"
        {...props}
      />
    )
  }
)
Spinner.displayName = 'Spinner'

export { Spinner }
