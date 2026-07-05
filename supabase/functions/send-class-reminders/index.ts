// Class-reminder cron. Emails every confirmed participant the day before
// a session via the class-reminder template ("Snart er det kurs").
//
// Runs hourly; each run picks up sessions starting 20–28 hours from now
// whose reminder hasn't been stamped yet, so a session gets several retry
// windows (~24h before start) without ever double-sending.
//
// Idempotency: gated by course_sessions.reminder_sent_at — stamped once at
// least one participant was reached (or the session has no recipients),
// mirroring the seller_notified_at pattern in booking-notifications.
//
// Recipients come from the signup's own participant_email — not a profiles
// join — so guest bookings (buyer_id NULL, the common checkout path) are
// reached too. Series signups (course_session_id NULL) get a reminder for
// every session; drop-ins only for their own session.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendEmail } from '../_shared/email.ts'
import { timingSafeEqual } from '../_shared/auth.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
// Shared cron auth secret. Prefer CRON_SECRET; fall back to the legacy
// DINTERO_CRON_SECRET name during the rename transition (not Dintero-specific).
const cronSecret = Deno.env.get('CRON_SECRET') || Deno.env.get('DINTERO_CRON_SECRET') || ''

// Sessions starting inside this window (hours from now) get their reminder.
// Lower bound keeps a late cron run from reminding a class that's about to
// start; upper bound keeps the hourly runs from firing a full day early.
const WINDOW_MIN_HOURS = 20
const WINDOW_MAX_HOURS = 28
const MAX_SESSIONS_PER_RUN = 50

// Session times are stored as Oslo wall-clock (date + time, no zone), so the
// epoch of a session start depends on the DST offset in effect on that date.
function osloOffsetMinutes(date: Date): number {
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Oslo',
    timeZoneName: 'longOffset',
  })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+00:00'
  const match = label.match(/GMT([+-])(\d{2}):(\d{2})/)
  if (!match) return 0
  const sign = match[1] === '-' ? -1 : 1
  return sign * (Number(match[2]) * 60 + Number(match[3]))
}

function sessionStartEpoch(sessionDate: string, startTime: string): number | null {
  // time columns arrive as HH:MM:SS; tolerate a bare HH:MM too.
  const time = startTime.length === 5 ? `${startTime}:00` : startTime.slice(0, 8)
  const naive = new Date(`${sessionDate}T${time}Z`)
  if (Number.isNaN(naive.getTime())) return null
  // Offset computed at the naive instant is correct for our purposes — DST
  // switches at 02:00/03:00 and reminders fire ~24h out, so edge drift is ≤1h.
  return naive.getTime() - osloOffsetMinutes(naive) * 60 * 1000
}

// "i morgen, onsdag 6. juli kl. 18:00" — matches the template's PreviewProps.
function reminderStartLabel(sessionDate: string, startTime: string): string {
  const date = new Date(`${sessionDate}T12:00:00Z`)
  const dateStr = new Intl.DateTimeFormat('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
  return `i morgen, ${dateStr} kl. ${startTime.slice(0, 5)}`
}

// YYYY-MM-DD in Oslo local time, `daysAhead` days from now.
function osloDate(daysAhead: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo' }).format(
    new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000),
  )
}

Deno.serve(async (req: Request) => {
  const auth = req.headers.get('authorization') || ''
  const providedSecret = req.headers.get('x-cron-secret') || ''
  const hasServiceRole = timingSafeEqual(auth, `Bearer ${supabaseServiceKey}`)
  const hasCronSecret = timingSafeEqual(providedSecret, cronSecret)

  if (!hasServiceRole && !hasCronSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Cheap date prefilter (today..+2 days covers the 20–28h window in any
    // timezone drift); the precise window check happens in JS below.
    const { data: sessions, error: sessionsError } = await supabase
      .from('course_sessions')
      .select(`
        id, course_id, session_date, start_time,
        course:courses(id, title, location, status, seller:sellers(name))
      `)
      .is('reminder_sent_at', null)
      .eq('status', 'upcoming')
      .gte('session_date', osloDate(0))
      .lte('session_date', osloDate(2))
      // Soonest-first: without an ORDER BY, which rows fill the LIMIT page is
      // planner-dependent, and out-of-window rows could starve in-window
      // sessions indefinitely once the range holds > MAX_SESSIONS_PER_RUN rows.
      .order('session_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(MAX_SESSIONS_PER_RUN)

    if (sessionsError) {
      return new Response(`Failed to load sessions: ${sessionsError.message}`, { status: 500 })
    }

    const now = Date.now()
    const summary = { checked: sessions?.length || 0, sessions: 0, sent: 0, failed: 0, expired: 0 }

    for (const session of sessions || []) {
      const course = session.course as unknown as {
        id: string
        title: string
        location: string | null
        status: string
        seller: { name: string } | null
      } | null
      // Live courses only. NOTE: 'published' is not a course_status value
      // (draft/upcoming/active/completed/cancelled) — the old
      // `status !== 'published'` check skipped EVERY session, so no reminder
      // could ever send.
      if (!course || (course.status !== 'upcoming' && course.status !== 'active')) continue

      const startEpoch = sessionStartEpoch(session.session_date, session.start_time)
      if (startEpoch === null) continue
      const hoursUntil = (startEpoch - now) / (60 * 60 * 1000)
      if (hoursUntil < WINDOW_MIN_HOURS) {
        // The window has permanently passed (all hourly retries missed, or the
        // class already started) — a "day before" reminder now would be wrong.
        // Stamp it so it stops occupying the LIMIT page on every future run.
        summary.expired += 1
        await supabase
          .from('course_sessions')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', session.id)
        continue
      }
      if (hoursUntil > WINDOW_MAX_HOURS) continue

      const { data: signups, error: signupsError } = await supabase
        .from('signups')
        .select('id, participant_name, participant_email, course_session_id')
        .eq('course_id', course.id)
        .eq('status', 'confirmed')
        .or(`course_session_id.is.null,course_session_id.eq.${session.id}`)

      if (signupsError) {
        console.error('[send-class-reminders] signups query error', {
          sessionId: session.id,
          error: signupsError,
        })
        continue
      }

      summary.sessions += 1
      const courseStart = reminderStartLabel(session.session_date, session.start_time)
      const studioName = course.seller?.name ?? ''
      let anySucceeded = false
      let attempted = 0
      let first = true

      // Sequential with a small gap — Resend's default limit is ~2 req/s, and
      // a tight loop over a full class 429s mid-list.
      for (const s of signups || []) {
        if (!s.participant_email) continue
        if (!first) await new Promise((r) => setTimeout(r, 550))
        first = false
        attempted += 1
        const result = await sendEmail({
          template: 'class-reminder',
          to: s.participant_email,
          props: {
            buyerName: s.participant_name || 'Hei',
            studioName,
            courseTitle: course.title,
            courseStart,
            courseLocation: course.location ?? undefined,
          },
        })
        if (result.error) {
          summary.failed += 1
          console.error('[send-class-reminders] email failed', {
            to: s.participant_email,
            sessionId: session.id,
            error: result.error,
          })
        } else {
          anySucceeded = true
          summary.sent += 1
        }
      }

      // Stamp when at least one send landed, or there was nobody to remind.
      // The old rule (stamp only if EVERY send succeeded) meant a single
      // permanently-rejected address kept the session unstamped through all ~8
      // hourly windows, re-sending to everyone else each run. Now one bad
      // address costs that one recipient their reminder (logged above) instead
      // of spamming the whole class. A TOTAL failure (every attempt failed,
      // e.g. Resend down) leaves the session unstamped so the next run retries.
      if (anySucceeded || attempted === 0) {
        await supabase
          .from('course_sessions')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', session.id)
      }
    }

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown'
    return new Response(`Reminder sweep error: ${message}`, { status: 500 })
  }
})
