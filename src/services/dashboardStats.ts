import { supabase } from '@/lib/supabase'
import { formatLocalDateKey } from '@/utils/dateUtils'
import type { Signup } from '@/types/database'

export interface Delta {
  percent: number | null
  direction: 'up' | 'down' | 'flat'
}

export interface DailyPoint {
  date: string
  revenue: number
  signups: number
}

export interface MonthStats {
  revenue: number
  newCustomers: number
  totalSignups: number
  /** One entry per day of the current month. */
  series: DailyPoint[]
  deltas: {
    revenue: Delta
    newCustomers: Delta
    totalSignups: Delta
  }
}

export interface WeekStats {
  capacityFilled: { percent: number; signups: number; capacity: number }
  cancellations: number
  sessions: number
  refunds: number
  deltas: {
    capacityFilled: Delta
    cancellations: Delta
    sessions: Delta
    refunds: Delta
  }
}

function computeDelta(current: number, previous: number): Delta {
  if (previous === 0) {
    return { percent: current === 0 ? 0 : null, direction: current > 0 ? 'up' : 'flat' }
  }
  const percent = ((current - previous) / previous) * 100
  return {
    percent,
    direction: percent > 0.5 ? 'up' : percent < -0.5 ? 'down' : 'flat',
  }
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate())
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

async function fetchSignupsInRange(
  sellerId: string,
  fromIso: string,
  toIso: string
): Promise<Array<Pick<Signup, 'id' | 'buyer_id' | 'participant_email' | 'status' | 'amount_paid' | 'payment_status' | 'refunded_at' | 'created_at'>>> {
  const { data } = await supabase
    .from('signups')
    .select('id, buyer_id, participant_email, status, amount_paid, payment_status, refunded_at, created_at')
    .eq('seller_id', sellerId)
    .gte('created_at', fromIso)
    .lt('created_at', toIso)

  return (data ?? []) as unknown as Array<Pick<Signup, 'id' | 'buyer_id' | 'participant_email' | 'status' | 'amount_paid' | 'payment_status' | 'refunded_at' | 'created_at'>>
}

function aggregateMonth(signups: Awaited<ReturnType<typeof fetchSignupsInRange>>) {
  let revenue = 0
  const identities = new Set<string>()
  for (const s of signups) {
    if (s.status === 'confirmed' && s.payment_status === 'paid') {
      revenue += s.amount_paid ?? 0
    }
    const identity = s.buyer_id ?? s.participant_email
    if (identity) identities.add(identity)
  }
  return { revenue, newCustomers: identities.size, totalSignups: signups.length }
}

export async function fetchMonthStats(sellerId: string, now: Date = new Date()): Promise<MonthStats> {
  const thisMonthStart = startOfMonth(now)
  const nextMonthStart = addMonths(thisMonthStart, 1)
  const prevMonthStart = addMonths(thisMonthStart, -1)

  const [current, previous] = await Promise.all([
    fetchSignupsInRange(sellerId, thisMonthStart.toISOString(), nextMonthStart.toISOString()),
    fetchSignupsInRange(sellerId, prevMonthStart.toISOString(), thisMonthStart.toISOString()),
  ])

  const currentAgg = aggregateMonth(current)
  const previousAgg = aggregateMonth(previous)

  const revenueByKey = new Map<string, number>()
  const signupsByKey = new Map<string, number>()
  for (const s of current) {
    if (!s.created_at) continue
    const key = formatLocalDateKey(new Date(s.created_at))
    signupsByKey.set(key, (signupsByKey.get(key) ?? 0) + 1)
    if (s.status === 'confirmed' && s.payment_status === 'paid') {
      revenueByKey.set(key, (revenueByKey.get(key) ?? 0) + (s.amount_paid ?? 0))
    }
  }
  // Cumulative series capped at today. Each point = running total from the
  // 1st of the month up to and including that day. Cumulative because the
  // headline KPI ("Inntekter denne måneden") is a running total — the chart
  // should illustrate how that number was reached. Capped at today because
  // future days would otherwise plot as a flat-at-the-final-value tail that
  // reads like "revenue stalled" instead of "those days haven't happened".
  const daysInMonth = new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() + 1, 0).getDate()
  const todayKey = formatLocalDateKey(now)
  let runningRevenue = 0
  let runningSignups = 0
  const series: DailyPoint[] = []
  for (let i = 0; i < daysInMonth; i++) {
    const d = addDays(thisMonthStart, i)
    const key = formatLocalDateKey(d)
    if (key > todayKey) break
    runningRevenue += revenueByKey.get(key) ?? 0
    runningSignups += signupsByKey.get(key) ?? 0
    series.push({
      date: key,
      revenue: runningRevenue,
      signups: runningSignups,
    })
  }

  return {
    revenue: currentAgg.revenue,
    newCustomers: currentAgg.newCustomers,
    totalSignups: currentAgg.totalSignups,
    series,
    deltas: {
      revenue: computeDelta(currentAgg.revenue, previousAgg.revenue),
      newCustomers: computeDelta(currentAgg.newCustomers, previousAgg.newCustomers),
      totalSignups: computeDelta(currentAgg.totalSignups, previousAgg.totalSignups),
    },
  }
}

async function aggregateWeek(
  sellerId: string,
  fromIso: string,
  toIso: string
) {
  const [signupsRes, sessionsRes, capacityRes] = await Promise.all([
    supabase
      .from('signups')
      .select('id, status, payment_status, refunded_at, created_at')
      .eq('seller_id', sellerId)
      .gte('created_at', fromIso)
      .lt('created_at', toIso),
    supabase
      .from('course_sessions')
      .select('id, course:courses!inner(seller_id)')
      .gte('session_date', fromIso.slice(0, 10))
      .lt('session_date', toIso.slice(0, 10))
      .eq('course.seller_id', sellerId),
    supabase
      .from('courses')
      .select('id, max_participants')
      .eq('seller_id', sellerId)
      .in('status', ['active', 'upcoming']),
  ])

  const signups = (signupsRes.data ?? []) as unknown as Array<{
    status: Signup['status']
    payment_status: Signup['payment_status']
    refunded_at: string | null
  }>
  const sessions = (sessionsRes.data ?? []) as unknown as Array<{ id: string }>
  const courses = (capacityRes.data ?? []) as unknown as Array<{ id: string; max_participants: number | null }>

  const confirmedCount = signups.filter((s) => s.status === 'confirmed').length
  const cancellations = signups.filter((s) => s.status === 'cancelled').length
  const refunds = signups.filter((s) => s.payment_status === 'refunded' || !!s.refunded_at).length
  const capacity = courses.reduce((sum, c) => sum + (c.max_participants ?? 0), 0)
  const capacityFilled = capacity > 0 ? (confirmedCount / capacity) * 100 : 0

  return {
    confirmedCount,
    cancellations,
    refunds,
    sessions: sessions.length,
    capacity,
    capacityFilled,
  }
}

export async function fetchWeekStats(sellerId: string, now: Date = new Date()): Promise<WeekStats> {
  const endExclusive = addDays(now, 1)
  const thisStart = addDays(endExclusive, -7)
  const prevStart = addDays(thisStart, -7)

  const [current, previous] = await Promise.all([
    aggregateWeek(sellerId, thisStart.toISOString(), endExclusive.toISOString()),
    aggregateWeek(sellerId, prevStart.toISOString(), thisStart.toISOString()),
  ])

  return {
    capacityFilled: {
      percent: current.capacityFilled,
      signups: current.confirmedCount,
      capacity: current.capacity,
    },
    cancellations: current.cancellations,
    sessions: current.sessions,
    refunds: current.refunds,
    deltas: {
      capacityFilled: computeDelta(current.capacityFilled, previous.capacityFilled),
      cancellations: computeDelta(current.cancellations, previous.cancellations),
      sessions: computeDelta(current.sessions, previous.sessions),
      refunds: computeDelta(current.refunds, previous.refunds),
    },
  }
}
