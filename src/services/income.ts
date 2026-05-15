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
 * Fetch net income (paid minus refunded) for a seller, bucketed by day or
 * month depending on range. Also returns the previous period's total so the
 * caller can compute a % delta badge.
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
      previousTotal += amount
      const point = previousByKey.get(key)
      if (point) point.previousAmount += amount
    }
  }

  return {
    data: { range, points: scaffold.map((s) => s.point), total, previousTotal },
    error: null,
  }
}
