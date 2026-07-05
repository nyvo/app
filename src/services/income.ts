import { supabase } from '@/lib/supabase'
import { formatLocalDateKey } from '@/utils/dateUtils'

export type IncomeRange = 'week' | 'month' | 'year'

export interface IncomePoint {
  /** Bucket key — `YYYY-MM-DD` for week/month, `YYYY-MM` for year. */
  key: string
  /** Label shown in tooltip (Norwegian). */
  label: string
  /**
   * Cumulative net income in NOK through this bucket. Nullable so a range
   * with a fixed frame could stop the line early (`null` = no data yet); the
   * current rolling windows always produce numbers. Chart/tooltip handle null.
   */
  amount: number | null
  /** Label of the same offset in the previous period, e.g. "ons 8. okt". */
  previousLabel: string
  /** Net income in NOK at the same offset one period earlier. */
  previousAmount: number
}

export interface IncomeSeries {
  range: IncomeRange
  points: IncomePoint[]
  total: number
  previousTotal: number
}

interface IncomeRow {
  amount_paid: number | null
  refund_amount: number | null
  created_at: string | null
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | null
}

const MONTH_ABBR_NB = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const
const DAY_ABBR_NB = ['søn', 'man', 'tir', 'ons', 'tor', 'fre', 'lør'] as const

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + n)
  return next
}

function addMonths(d: Date, n: number): Date {
  const next = new Date(d)
  next.setMonth(next.getMonth() + n)
  return next
}

function dayLabel(d: Date): string {
  return `${DAY_ABBR_NB[d.getDay()]} ${d.getDate()}. ${MONTH_ABBR_NB[d.getMonth()]}`
}

function monthLabel(d: Date): string {
  // Lowercase abbreviation to match dayLabel and Norwegian month convention.
  return `${MONTH_ABBR_NB[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}


interface BucketScaffold {
  point: IncomePoint
  /** Bucket key for the same offset one period earlier. */
  previousKey: string
}

/**
 * Build the empty bucket scaffold for a range. Each bucket carries both the
 * current-period key/label AND the corresponding previous-period key/label
 * (same day-of-week / same month one period back) so we can overlay a faint
 * previous-period line aligned by offset, the way Time2Book does.
 */
function buildBuckets(range: IncomeRange, end: Date): BucketScaffold[] {
  if (range === 'year') {
    const start = startOfDay(new Date(end.getFullYear(), end.getMonth() - 11, 1))
    const scaffold: BucketScaffold[] = []
    for (let i = 0; i < 12; i++) {
      const d = addMonths(start, i)
      const prev = addMonths(d, -12)
      scaffold.push({
        point: {
          key: monthKey(d),
          label: monthLabel(d),
          amount: 0,
          previousLabel: monthLabel(prev),
          previousAmount: 0,
        },
        previousKey: monthKey(prev),
      })
    }
    return scaffold
  }

  // Rolling windows (week = 7 days, month = 30 days), both ending today —
  // the chart is a TREND line, so it always spans its full width at constant
  // density. The toggle labels say "7 dager"/"30 dager" so the window is
  // honest (a calendar-month frame was tried and rejected: it left the line
  // stranded at ~10% width early in the month).
  const span = range === 'week' ? 7 : 30
  const start = addDays(startOfDay(end), -(span - 1))
  const scaffold: BucketScaffold[] = []
  for (let i = 0; i < span; i++) {
    const d = addDays(start, i)
    const prev = addDays(d, -span)
    scaffold.push({
      point: {
        key: formatLocalDateKey(d),
        label: dayLabel(d),
        amount: 0,
        previousLabel: dayLabel(prev),
        previousAmount: 0,
      },
      previousKey: formatLocalDateKey(prev),
    })
  }
  return scaffold
}

function bucketKeyForDate(range: IncomeRange, iso: string): string | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return range === 'year' ? monthKey(d) : formatLocalDateKey(d)
}

function netAmount(row: IncomeRow): number {
  const paid = row.amount_paid ?? 0
  const refunded = row.refund_amount ?? 0
  return Math.max(0, paid - refunded)
}

/**
 * Sum of the platform take (free-tier 5% payout deduction) charged this
 * calendar month. Feeds the "plattformgebyr denne måneden" line under the
 * income chart — the free seller's self-serve Pro crossover math. Refunded
 * rows are excluded: their fee was returned with the refund.
 */
export async function fetchPlatformFeeMonth(
  sellerId: string,
): Promise<{ data: number; error: Error | null }> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const { data, error } = await supabase
    .from('signups')
    .select('platform_fee_nok')
    .eq('seller_id', sellerId)
    .eq('payment_status', 'paid')
    .gt('platform_fee_nok', 0)
    .gte('created_at', monthStart.toISOString())

  if (error) {
    return { data: 0, error: error as Error }
  }
  const total = ((data ?? []) as { platform_fee_nok: number | null }[]).reduce(
    (sum, row) => sum + (row.platform_fee_nok ?? 0),
    0,
  )
  return { data: total, error: null }
}

/**
 * Fetch net income (paid minus refunded) for a seller, bucketed by day or
 * month depending on range. Also returns the previous period's total so the
 * caller can compute a % delta badge.
 *
 * Windows: week = rolling 7 days; month = rolling 30 days (the toggle is
 * labeled "30 dager" — a calendar-month frame was tried and rejected);
 * year = rolling 12 months. All windows end today, so the trend line always
 * spans the chart's full width at constant density.
 *
 * Bucketing is by `created_at` (when the booking was made) — matches the
 * "revenue earned" mental model rather than the "money landed" one.
 */
export async function fetchIncomeSeries(
  sellerId: string,
  range: IncomeRange,
): Promise<{ data: IncomeSeries | null; error: Error | null }> {
  const now = new Date()
  const end = startOfDay(now)

  let periodStart: Date
  let previousStart: Date
  if (range === 'year') {
    periodStart = new Date(end.getFullYear(), end.getMonth() - 11, 1)
    previousStart = new Date(periodStart.getFullYear() - 1, periodStart.getMonth(), 1)
  } else {
    const span = range === 'week' ? 7 : 30
    periodStart = addDays(end, -(span - 1))
    previousStart = addDays(periodStart, -span)
  }

  const { data, error } = await supabase
    .from('signups')
    .select('amount_paid, refund_amount, created_at, payment_status')
    .eq('seller_id', sellerId)
    .in('payment_status', ['paid', 'refunded'])
    .gte('created_at', previousStart.toISOString())

  if (error) {
    return { data: null, error: error as Error }
  }

  const rows = (data ?? []) as IncomeRow[]
  const scaffold = buildBuckets(range, now)
  const currentByKey = new Map(scaffold.map((s) => [s.point.key, s.point]))
  const previousByKey = new Map(scaffold.map((s) => [s.previousKey, s.point]))

  let total = 0
  let previousTotal = 0
  const periodStartMs = periodStart.getTime()
  // Cap the previous total at the same elapsed point as the current window so
  // the % badge compares equal amounts of elapsed time. For 'year' the current
  // window is only ~11.1 months (12 partial months), so counting a full 12
  // previous months biased the badge down; cut the previous total at 12 months
  // before now. Week/month are whole rolling windows of equal length, so the
  // cap is just periodStart. The overlay line still shows the whole previous
  // period — only the badge math is capped.
  const previousCutoffMs =
    range === 'year' ? addMonths(now, -12).getTime() : periodStart.getTime()

  for (const row of rows) {
    if (!row.created_at) continue
    const ts = new Date(row.created_at).getTime()
    if (Number.isNaN(ts)) continue
    const amount = netAmount(row)
    if (amount === 0) continue

    const key = bucketKeyForDate(range, row.created_at)
    if (!key) continue

    if (ts >= periodStartMs) {
      total += amount
      const point = currentByKey.get(key)
      // Buckets start at 0 here; the null tail is assigned in the cumulative pass.
      if (point) point.amount = (point.amount ?? 0) + amount
    } else {
      // Bucket into the overlay regardless (it shows the full previous period)…
      const point = previousByKey.get(key)
      if (point) point.previousAmount += amount
      // …but only count toward the badge total within the capped window.
      if (ts <= previousCutoffMs) previousTotal += amount
    }
  }

  // Convert per-bucket amounts into a cumulative running total. Revenue is
  // a stock-like figure on a hero card — the user's question is "where am I
  // for this period?" not "what days did I sell?". Cumulative climbs to the
  // period total at the right edge, plateaus on zero-income days (honest),
  // and never produces the stalagmite-spike pattern of sparse daily data.
  // Period-over-period comparison lives on the % delta badge, not in
  // chart dips. Stripe's "Gross volume" uses the same pattern.
  const points = scaffold.map((s) => s.point)
  let runningCurrent = 0
  let runningPrevious = 0
  for (const point of points) {
    runningPrevious += point.previousAmount
    point.previousAmount = runningPrevious
    runningCurrent += point.amount ?? 0
    point.amount = runningCurrent
  }

  return {
    data: { range, points, total, previousTotal },
    error: null,
  }
}
