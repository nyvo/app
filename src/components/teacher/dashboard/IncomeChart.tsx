import { useId, type ReactElement } from 'react'
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartContainer } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn, formatKroner } from '@/lib/utils'
import type { IncomePoint, IncomeRange, IncomeSeries } from '@/services/income'

interface IncomeChartProps {
  series: IncomeSeries | null
  isLoading: boolean
  range: IncomeRange
  onRangeChange: (range: IncomeRange) => void
  /** Override the default custom tooltip — used by dev preview to A/B variants. */
  tooltipContent?: ReactElement
}

const RANGE_TABS: { key: IncomeRange; label: string }[] = [
  { key: 'week', label: 'Uke' },
  { key: 'month', label: 'Måned' },
  { key: 'year', label: 'År' },
]

const CHART_CONFIG = {
  amount: { label: 'Inntekt', color: 'var(--color-primary)' },
} as const

const STROKE = 'var(--color-primary)'
const FILL = 'var(--color-primary)'

/**
 * Empty-state floor — recharts collapses an all-zero series unless we pin
 * the upper bound. Picks a low ceiling so the flat line sits naturally at
 * the bottom of the plot area.
 */
const EMPTY_DOMAIN_MAX = 1000

function formatPercent(delta: number): string {
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : ''
  const value = Math.abs(delta).toLocaleString('nb-NO', {
    maximumFractionDigits: 1,
  })
  return `${sign}${value} %`
}

/**
 * Compact edge-tick label, e.g. "29. okt" or "Mai 25". Derived from the
 * full bucket label so the date formatting logic lives in one place
 * (services/income.ts).
 */
function formatEdgeTick(label: string): string {
  // Day labels look like "tir 29. okt" — drop the leading weekday.
  const parts = label.split(' ')
  if (parts.length >= 3) return `${parts[1]} ${parts[2]}`
  return label
}

function edgeTicks(points: IncomePoint[]): string[] {
  if (points.length === 0) return []
  if (points.length === 1) return [points[0].key]
  return [points[0].key, points[points.length - 1].key]
}

interface EdgeTickProps {
  x?: number | string
  y?: number | string
  payload?: { value: string }
  points: IncomePoint[]
}

/**
 * Custom X-axis tick that aligns the first label to `start` and the last to
 * `end`, so neither edge label gets clipped by the chart container.
 */
function EdgeTick({ x, y, payload, points }: EdgeTickProps) {
  if (!payload || x == null || y == null) return null
  const point = points.find((p) => p.key === payload.value)
  if (!point) return null
  const isFirst = payload.value === points[0]?.key
  const isLast = payload.value === points[points.length - 1]?.key
  const anchor = isFirst ? 'start' : isLast ? 'end' : 'middle'
  return (
    <text
      x={x}
      y={y}
      dy={12}
      fill="var(--color-foreground-muted)"
      fontSize={11}
      textAnchor={anchor}
    >
      {formatEdgeTick(point.label)}
    </text>
  )
}

export function IncomeChart({ series, isLoading, range, onRangeChange, tooltipContent }: IncomeChartProps) {
  const gradientId = useId().replace(/:/g, '')

  const total = series?.total ?? 0
  const previousTotal = series?.previousTotal ?? 0
  const hasDelta = !isLoading && previousTotal > 0 && series !== null
  const delta = hasDelta ? ((total - previousTotal) / previousTotal) * 100 : 0
  const deltaVariant: 'success' | 'warning' | 'neutral' =
    delta > 0 ? 'success' : delta < 0 ? 'warning' : 'neutral'

  const points: IncomePoint[] = series?.points ?? buildPlaceholderPoints(range)
  const hasIncome = points.some((p) => p.amount > 0)

  return (
    <section className="rounded-xl border border-border bg-background p-6 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-base font-medium text-foreground-muted">Inntekt</p>
          <div className="mt-2 flex items-baseline gap-3">
            {isLoading ? (
              <Skeleton className="h-9 w-40" />
            ) : (
              <span className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                {formatKroner(total)}
              </span>
            )}
            {hasDelta && (
              <Badge variant={deltaVariant} size="sm" className="tabular-nums">
                {formatPercent(delta)}
              </Badge>
            )}
          </div>
        </div>
        <QuietRangeToggle value={range} onChange={onRangeChange} />
      </header>

      <div className="mt-6">
        <ChartContainer
          config={CHART_CONFIG}
          className="aspect-auto h-[220px] w-full sm:h-[260px]"
        >
          <AreaChart
            data={points}
            margin={{ top: 8, right: 8, left: 8, bottom: 18 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={FILL} stopOpacity={0.28} />
                <stop offset="100%" stopColor={FILL} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--color-border)"
              strokeDasharray="3 5"
              strokeOpacity={0.55}
            />
            <XAxis
              dataKey="key"
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              ticks={edgeTicks(points)}
              interval={0}
              tick={(tickProps) => <EdgeTick {...tickProps} points={points} />}
            />
            <YAxis
              hide
              domain={[0, (dataMax: number) => Math.max(dataMax, EMPTY_DOMAIN_MAX)]}
            />
            <Tooltip
              cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }}
              content={tooltipContent ?? <IncomeTooltip />}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke={STROKE}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              fillOpacity={1}
              activeDot={{ r: 4, strokeWidth: 2, stroke: STROKE, fill: 'var(--color-background)' }}
              isAnimationActive={!hasIncome ? false : true}
              animationDuration={400}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </section>
  )
}

/**
 * Quiet text-button toggle — no track, no active pill. Each item is just a
 * label whose tone signals state (foreground vs muted). Keeps the chart
 * header light so the big income number reads as the hero.
 */
function QuietRangeToggle({
  value,
  onChange,
}: {
  value: IncomeRange
  onChange: (range: IncomeRange) => void
}) {
  return (
    <div role="tablist" aria-label="Velg tidsrom" className="inline-flex items-center gap-1">
      {RANGE_TABS.map((opt) => {
        const isActive = opt.key === value
        return (
          <button
            key={opt.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.key)}
            className={cn(
              'rounded-md px-2 py-1 text-sm font-medium outline-none transition-colors duration-150',
              'focus-visible:ring-2 focus-visible:ring-foreground/15',
              isActive
                ? 'bg-muted text-foreground'
                : 'text-foreground-muted hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

interface TooltipPayload {
  payload?: IncomePoint
}

function IncomeTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayload[]
}) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  if (!point) return null
  return (
    <div className="min-w-[180px] rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm shadow-xl">
      <div className="text-foreground-muted">Sum hittil</div>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ backgroundColor: STROKE }} />
          <span className="font-medium text-foreground tabular-nums">
            {formatKroner(point.amount)}
          </span>
        </span>
        <span className="text-foreground-muted">{point.label}</span>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-border" />
          <span className="tabular-nums text-foreground-muted">
            {formatKroner(point.previousAmount)}
          </span>
        </span>
        <span className="text-foreground-muted">{point.previousLabel}</span>
      </div>
    </div>
  )
}

/**
 * Placeholder series used before the seller's data has loaded — keeps the
 * chart from collapsing/jumping while the real fetch is in flight.
 */
function buildPlaceholderPoints(range: IncomeRange): IncomePoint[] {
  const length = range === 'year' ? 12 : range === 'week' ? 7 : 30
  return Array.from({ length }, (_, i) => ({
    key: `placeholder-${i}`,
    label: '',
    amount: 0,
    previousLabel: '',
    previousAmount: 0,
  }))
}
