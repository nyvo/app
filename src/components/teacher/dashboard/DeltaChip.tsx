import { cn } from '@/lib/utils'
import type { Delta } from '@/services/dashboardStats'

interface DeltaChipProps {
  delta: Delta
  /** When true, a decrease is treated as positive (cancellations, refunds). */
  invert?: boolean
}

export function DeltaChip({ delta, invert = false }: DeltaChipProps) {
  if (delta.percent === null || delta.direction === 'flat') {
    return <span className="text-xs font-medium text-foreground-muted">—</span>
  }

  const isPositive = invert ? delta.direction === 'down' : delta.direction === 'up'
  const sign = delta.percent > 0 ? '+' : ''
  const rounded = Math.round(delta.percent)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums',
        isPositive ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'
      )}
    >
      {sign}
      {rounded}&nbsp;%
    </span>
  )
}
