// Teacher-initiated single-session reschedule.
//
// Updates a course_sessions row's date and time, then notifies every
// confirmed signup on the parent course via the session-rescheduled
// email template. Best-effort notification: a failed email does not
// roll back the update.

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

  const course = session.course as {
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

  // 3. Capture old values for the email, then update
  const oldDate = session.session_date
  const oldStart = shortTime(session.start_time)

  const { error: updateError } = await supabase
    .from('course_sessions')
    .update({
      session_date: body.new_date,
      start_time: body.new_start_time,
      end_time: body.new_end_time ?? null,
    })
    .eq('id', body.session_id)

  if (updateError) {
    console.error('[update-session] update error', updateError)
    return errorResponse('Could not update session', 500, req)
  }

  // 4. Notify confirmed signups — best-effort. The update is already committed.
  let notified = 0
  let failed = 0
  try {
    const { data: signups, error: signupsError } = await supabase
      .from('signups')
      .select(`
        id,
        profile:profiles(email, name)
      `)
      .eq('course_id', course.id)
      .eq('status', 'confirmed')

    if (signupsError) {
      console.error('[update-session] signups query error', signupsError)
    } else if (signups && signups.length > 0) {
      const newDateLabel = weekdayDate(body.new_date)
      const newStartLabel = shortTime(body.new_start_time)
      const oldDateLabel = weekdayDate(oldDate)
      const studioName = course.seller?.name ?? ''

      // Sequential — keeps Resend rate-limit happy on long lists.
      for (const s of signups) {
        const profile = (s as { profile?: { email?: string; name?: string | null } | null }).profile
        if (!profile?.email) continue
        const result = await sendEmail({
          template: 'session-rescheduled',
          to: profile.email,
          props: {
            buyerName: profile.name || 'Hei',
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
          console.error('[update-session] email failed', { to: profile.email, error: result.error })
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
