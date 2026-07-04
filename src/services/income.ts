import { supabase } from '@/lib/supabase'
import { formatLocalDateKey } from '@/utils/dateUtils'

export type IncomeRange = 'week' | 'month' | 'year'

export interface IncomePoint {
  /** Bucket key — `YYYY-MM-DD` for week/month, `YYYY-MM` for year. */
  key: string
  /** Label shown in tooltip (Norwegian). */
  label: string
  /** Net income in NOK for this bucket. */
  amount: number
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
  const m = MONTH_ABBR_NB[d.getMonth()]
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${String(d.getFullYear()).slice(2)}`
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

  if (range === 'month') {
    // Calendar month-to-date: day 1 → today. Each bucket's previous counterpart
    // is the same day-offset from the 1st of the previous month, so the overlay
    // line aligns by elapsed offset rather than by calendar date.
    const periodStart = startOfDay(new Date(end.getFullYear(), end.getMonth(), 1))
    const prevMonthStart = addMonths(periodStart, -1)
    const span = end.getDate()
    const scaffold: BucketScaffold[] = []
    for (let i = 0; i < span; i++) {
      const d = addDays(periodStart, i)
      const prev = addDays(prevMonthStart, i)
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

  const span = 7
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
 * Windows: week = rolling 7 days; month = calendar month-to-date (1st →
 * today, compared against the same offsets in the previous calendar month);
 * year = rolling 12 months.
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
  } else if (range === 'month') {
    periodStart = startOfDay(new Date(end.getFullYear(), end.getMonth(), 1))
    previousStart = addMonths(periodStart, -1)
  } else {
    const span = 7
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
  // before now. For 'month' the window is month-to-date, so cap the previous
  // month at the same moment one month back (equal elapsed days). For 'week'
  // the window is already whole, so the cap is just periodStart. The overlay
  // line still shows the whole previous period — only the badge math is capped.
  const previousCutoffMs =
    range === 'year'
      ? addMonths(now, -12).getTime()
      : range === 'month'
        ? addMonths(now, -1).getTime()
        : periodStart.getTime()

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
      if (point) point.amount += amount
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
    runningCurrent += point.amount
    point.amount = runningCurrent
    runningPrevious += point.previousAmount
    point.previousAmount = runningPrevious
  }

  return {
    data: { range, points, total, previousTotal },
    error: null,
  }
}
