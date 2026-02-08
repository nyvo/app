import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface InfoTooltipProps {
  content: string
  className?: string
  iconClassName?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}

/**
 * Info icon with tooltip - for "why we ask" explanations
 */
export function InfoTooltip({
  content,
  className,
  iconClassName,
  side = 'top'
}: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center justify-center rounded-full p-0.5 text-text-tertiary hover:text-text-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
            className
          )}
          aria-label="Mer informasjon"
        >
          <Info className={cn('h-3.5 w-3.5', iconClassName)} />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-[200px]">
        {content}
      </TooltipContent>
    </Tooltip>
  )
}
