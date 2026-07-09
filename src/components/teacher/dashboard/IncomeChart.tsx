import { useEffect, useId, useState, type ReactElement } from 'react'
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartContainer } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { FramedCard, FramedCardPanel } from '@/components/teacher/FramedCard'
import { SegmentedTabs } from '@/components/teacher/SegmentedTabs'
import { cn, formatKroner } from '@/lib/utils'
import type { IncomePoint, IncomeRange, IncomeSeries } from '@/services/income'

interface IncomeChartProps {
  series: IncomeSeries | null
  isLoading: boolean
  /** A background refetch (range switch, revalidation) is in flight — dims
   *  the plot so stale data under a freshly-selected tab reads as refreshing,
   *  not final. Distinct from `isLoading`, which is the very first fetch. */
  isFetching?: boolean
  range: IncomeRange
  onRangeChange: (range: IncomeRange) => void
  /** Override the default custom tooltip — used by dev preview to A/B variants. */
  tooltipContent?: ReactElement
}

// Labels disclose the actual rolling window (services/income.ts) — no
// ratified design reference mandates "Uke/Måned/År", and that phrasing read
// as calendar-aligned periods the rolling windows don't match.
const RANGE_TABS: { key: IncomeRange; label: string }[] = [
  { key: 'week', label: '7 dager' },
  { key: 'month', label: '30 dager' },
  { key: 'year', label: '12 mnd' },
]

/* Series ink stays azure (--primary) — ratified exception to the
   --category-* chart-hue rule (design-language.md §Charts); user-reverted
   2026-07-07, applies only to this chart. Do not "fix" to category-1. */
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

export function IncomeChart({
  series,
  isLoading,
  isFetching = false,
  range,
  onRangeChange,
  tooltipContent,
}: IncomeChartProps) {
  const gradientId = useId().replace(/:/g, '')

  // The area draw-in should only play on the chart's very first paint — not on
  // every range-tab click or realtime refetch. Flipped in an effect (not read
  // from a ref during render — trips react-hooks/refs) right after the first
  // commit, before any tab click can fire, so every render after that reads
  // `true` and recharts skips the animation.
  const [hasAnimated, setHasAnimated] = useState(false)
  useEffect(() => {
    setHasAnimated(true)
  }, [])

  const total = series?.total ?? 0
  const previousTotal = series?.previousTotal ?? 0
  const hasDelta = !isLoading && previousTotal > 0 && series !== null
  const delta = hasDelta ? ((total - previousTotal) / previousTotal) * 100 : 0
  const deltaVariant: 'success' | 'warning' | 'neutral' =
    delta > 0 ? 'success' : delta < 0 ? 'warning' : 'neutral'

  const points: IncomePoint[] = series?.points ?? buildPlaceholderPoints(range)
  // `amount` is null for future days (month range) — treat those as 0 here.
  const hasIncome = points.some((p) => (p.amount ?? 0) > 0)
  // The faint previous-period overlay only renders when the previous period
  // actually carried income — so the both-zero empty state keeps just the
  // current flat neutral line.
  const hasPrevious = points.some((p) => p.previousAmount > 0)
  // Compute the Y domain explicitly across BOTH series so the overlay is never
  // clipped. (recharts folds every series on the axis into `dataMax`, but the
  // overlay has no fill, so being explicit here removes any doubt.)
  const dataMax = points.reduce(
    (max, p) => Math.max(max, p.amount ?? 0, hasPrevious ? p.previousAmount : 0),
    0,
  )
  const domainMax = Math.max(dataMax, EMPTY_DOMAIN_MAX)
  // Zero state per the analytics convention (Patreon/Airbnb earnings): the
  // frame, grid and flat zero-line stay so layout never jumps — only a short
  // muted message lands in the plot centre.
  const showEmptyMessage = !isLoading && series !== null && !hasIncome

  return (
    <FramedCard
      title="Inntekt"
      action={
        <SegmentedTabs
          value={range}
          onChange={onRangeChange}
          tabs={RANGE_TABS}
          ariaLabel="Velg tidsrom"
          size="md"
        />
      }
    >
      <FramedCardPanel className="p-5 sm:p-6">
        <div className="flex items-baseline gap-3">
          {isLoading ? (
            <Skeleton className="h-9 w-40" />
          ) : (
            <span className="text-3xl font-medium text-foreground tabular-nums">
              {formatKroner(total)}
            </span>
          )}
          {hasDelta && (
            <Badge
              variant={deltaVariant}
              size="sm"
              className="tabular-nums"
              title="mot forrige periode"
              aria-label={`${formatPercent(delta)} mot forrige periode`}
            >
              {formatPercent(delta)}
            </Badge>
          )}
        </div>

        <div className={cn('relative mt-6 transition-opacity', isFetching && 'opacity-60')}>
        {showEmptyMessage && (
          <p
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-sm text-foreground-muted"
            role="status"
          >
            Ingen inntekt i denne perioden
          </p>
        )}
        <ChartContainer
          config={CHART_CONFIG}
          className="aspect-auto h-[220px] w-full sm:h-[260px]"
        >
          <AreaChart
            data={points}
            margin={{ top: 8, right: 8, left: 8, bottom: 18 }}
            accessibilityLayer
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
            <YAxis hide domain={[0, domainMax]} />
            <Tooltip
              cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }}
              content={tooltipContent ?? <IncomeTooltip />}
            />
            {hasPrevious && (
              // Quiet hairline-grey previous-period line, drawn BEHIND the main
              // area (declared first). No fill, no dots — a faint reference.
              <Area
                type="monotone"
                dataKey="previousAmount"
                stroke="var(--color-border)"
                strokeWidth={1.5}
                fill="none"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            )}
            <Area
              // Monotone, deliberately: this is a merchant-facing summary
              // (Shopify/Airbnb earnings register), not a financial ops tool —
              // trajectory over precision, which lives in the tooltip. On a
              // cumulative series monotone interpolation cannot overshoot or
              // dip below real values, so the soft curve stays honest.
              type="monotone"
              dataKey="amount"
              // Stop the line at today: month buckets after today carry null,
              // and recharts breaks the area on null points (default behaviour,
              // stated explicitly here) rather than bridging to the axis end.
              connectNulls={false}
              // Flat zero-line stays neutral (reference: Airbnb earnings) —
              // a saturated line under "no income" reads as data.
              stroke={hasIncome ? STROKE : 'var(--color-border)'}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              fillOpacity={1}
              activeDot={{ r: 4, strokeWidth: 2, stroke: STROKE, fill: 'var(--color-background)' }}
              isAnimationActive={hasIncome && !hasAnimated}
              animationDuration={400}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ChartContainer>
        </div>
      </FramedCardPanel>
    </FramedCard>
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
  // With two series (overlay + main) payload has multiple entries; both share
  // the same point object, so read the point from whichever entry carries it.
  const point = payload.find((entry) => entry?.payload)?.payload
  if (!point) return null
  // A future day (month range) has no current-period figure yet — show only the
  // previous-period row so the tooltip never implies a zero we don't have.
  const hasCurrent = point.amount != null
  return (
    <div className="min-w-[180px] rounded-xl border border-border bg-background px-3 py-2.5 text-sm shadow-soft">
      <div className="text-xs font-medium text-foreground-muted">Sum hittil</div>
      {/* Two tiers: the header is the quiet tier; both value rows share the
          same treatment — the markers alone tell the series apart. */}
      {hasCurrent && (
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <span className="size-3 rounded-sm bg-primary" />
            <span className="font-medium text-foreground tabular-nums">
              {formatKroner(point.amount)}
            </span>
          </span>
          <span className="text-foreground-muted">{point.label}</span>
        </div>
      )}
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-sm bg-border" />
          <span className="font-medium text-foreground tabular-nums">
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
