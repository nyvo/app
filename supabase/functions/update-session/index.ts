// Teacher-initiated single-session reschedule.
//
// Updates a course_sessions row's date and time, then notifies every
// confirmed signup on the parent course via the session-rescheduled
// email template. Best-effort notification: a failed email does not
// roll back the update.
//
// notify_only mode: the save_course_schedule RPC already committed the
// session change transactionally — this function then only fans out the
// emails, using the caller-provided old date/time (the row already holds
// the new values). No write happens in that mode.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  verifyAuth,
  verifyOrgMembership,
  handleCors,
  errorResponse,
  successResponse,
} from '../_shared/auth.ts'
import { sendEmail } from '../_shared/email.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface UpdateSessionRequest {
  session_id: string
  new_date: string       // YYYY-MM-DD
  new_start_time: string // HH:MM or HH:MM:SS
  new_end_time?: string  // HH:MM or HH:MM:SS — optional
  // notify_only: skip the write (already committed by save_course_schedule);
  // old_* carry the pre-change values for the email copy.
  notify_only?: boolean
  old_date?: string
  old_start_time?: string
}

function weekdayDate(input: string): string {
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return input
  return new Intl.DateTimeFormat('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

function shortTime(input: string | null | undefined): string {
  if (!input) return ''
  return input.slice(0, 5)
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, req)
  }

  const auth = await verifyAuth(req)
  if (!auth.authenticated || !auth.userId) {
    return errorResponse(auth.error || 'Unauthorized', 401, req)
  }

  let body: UpdateSessionRequest
  try {
    body = await req.json()
  } catch {
    return errorResponse('Invalid JSON', 400, req)
  }

  if (!body.session_id || !body.new_date || !body.new_start_time) {
    return errorResponse('Missing session_id, new_date, or new_start_time', 400, req)
  }
  if (body.notify_only && (!body.old_date || !body.old_start_time)) {
    return errorResponse('notify_only requires old_date and old_start_time', 400, req)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // 1. Read the existing session + parent course (for ownership + old values)
  const { data: session, error: sessionError } = await supabase
    .from('course_sessions')
    .select(`
      id, course_id, session_date, start_time, end_time,
      course:courses(id, title, location, seller_id, seller:sellers(name))
    `)
    .eq('id', body.session_id)
    .single()

  if (sessionError || !session) {
    return errorResponse('Session not found', 404, req)
  }

  const course = session.course as unknown as {
    id: string
    title: string
    location: string | null
    seller_id: string
    seller: { name: string } | null
  } | null

  if (!course) {
    return errorResponse('Course not found for this session', 404, req)
  }

  // 2. Verify the teacher is a member of the course's seller
  const authz = await verifyOrgMembership(auth.userId, course.seller_id)
  if (!authz.authorized) {
    return errorResponse(authz.error || 'Forbidden', 403, req)
  }

  // 3. Capture old values for the email, then update (skipped in notify_only —
  // the RPC already committed the change, so the row holds the NEW values and
  // the caller supplies the old ones).
  const oldDate = body.notify_only ? body.old_date! : session.session_date
  const oldStart = shortTime(body.notify_only ? body.old_start_time! : session.start_time)

  if (!body.notify_only) {
    // Only touch end_time when the caller actually sent it. `?? null` wiped a
    // previously-set end time whenever new_end_time was omitted (it's optional,
    // and some callers only move the date/start). undefined = leave as-is;
    // explicit null still clears it.
    const updatePayload: Record<string, unknown> = {
      session_date: body.new_date,
      start_time: body.new_start_time,
    }
    if (body.new_end_time !== undefined) {
      updatePayload.end_time = body.new_end_time
    }
    const { error: updateError } = await supabase
      .from('course_sessions')
      .update(updatePayload)
      .eq('id', body.session_id)

    if (updateError) {
      console.error('[update-session] update error', updateError)
      return errorResponse('Could not update session', 500, req)
    }
  }

  // 4. Notify confirmed signups — best-effort. The update is already committed.
  let notified = 0
  let failed = 0
  try {
    // Recipients come from the signup's own participant_email — not a
    // profiles join — so guest bookings (buyer_id NULL, the common
    // checkout path) are reached too.
    const { data: signups, error: signupsError } = await supabase
      .from('signups')
      .select('id, participant_name, participant_email')
      .eq('course_id', course.id)
      .eq('status', 'confirmed')

    if (signupsError) {
      console.error('[update-session] signups query error', signupsError)
    } else if (signups && signups.length > 0) {
      const newDateLabel = weekdayDate(body.new_date)
      const newStartLabel = shortTime(body.new_start_time)
      const oldDateLabel = weekdayDate(oldDate)
      const studioName = course.seller?.name ?? ''

      // Sequential with a small gap — Resend's default is ~2 req/s and a tight
      // loop over a long list 429s mid-way, dropping "ny tid" notices.
      let first = true
      for (const s of signups) {
        if (!s.participant_email) continue
        if (!first) await new Promise((r) => setTimeout(r, 550))
        first = false
        const result = await sendEmail({
          template: 'session-rescheduled',
          to: s.participant_email,
          props: {
            buyerName: s.participant_name || 'Hei',
            studioName,
            courseTitle: course.title,
            oldDate: oldDateLabel,
            oldTime: oldStart,
            newDate: newDateLabel,
            newTime: newStartLabel,
            courseLocation: course.location ?? undefined,
          },
        })
        if (result.error) {
          failed += 1
          console.error('[update-session] email failed', { to: s.participant_email, error: result.error })
        } else {
          notified += 1
        }
      }
    }
  } catch (err) {
    console.error('[update-session] notification fan-out failed', err)
  }

  return successResponse(
    { session_id: body.session_id, notified, failed, old_date: oldDate },
    200,
    req,
  )
})
