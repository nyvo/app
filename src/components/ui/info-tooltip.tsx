import { useState } from 'react'
import { Info } from '@/lib/icons'
import {
  TooltipProvider,
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
  // Radix tooltips are hover/focus-only, so on touch screens the content is
  // otherwise unreachable — a tap toggles the controlled state instead. With a
  // mouse the click is a no-op in practice (hover has already opened it).
  const [open, setOpen] = useState(false)
  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={cn(
              // after:-inset-2 extends the ~22px visual control to a ~38px touch target
              'motion-color relative inline-flex items-center justify-center rounded-full p-1 text-foreground-muted after:absolute after:-inset-2 hover:text-foreground focus:outline-none focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring-subtle',
              className
            )}
            aria-label="Mer informasjon"
          >
            <Info className={cn('size-3.5', iconClassName)} />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side}>
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
