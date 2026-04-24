// Notify participants when a teacher changes a course session's date or time.
// The DB update itself happens client-side via RLS-protected UPDATE (see
// SessionList inline edit). This function only loads participants and sends
// the notification email — kept as a thin wrapper so the notify step can
// fail independently of the schedule write.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  verifyAuth,
  verifyOrgMembership,
  handleCors,
  errorResponse,
  successResponse,
} from '../_shared/auth.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface NotifyScheduleChangeRequest {
  session_id: string
  old_date: string
  old_time: string
  new_date: string
  new_time: string
}

function formatDateNo(iso: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('nb-NO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  } catch {
    return iso
  }
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const authResult = await verifyAuth(req)
    if (!authResult.authenticated) {
      return errorResponse(authResult.error || 'Unauthorized', 401)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = (await req.json()) as NotifyScheduleChangeRequest

    if (!body.session_id || !body.new_date || !body.new_time) {
      return errorResponse('Missing required fields', 400)
    }

    // Load the session + course + org — also the authorization anchor.
    const { data: session, error: sessionError } = await supabase
      .from('course_sessions')
      .select(`
        id,
        course_id,
        course:courses(id, title, organization_id)
      `)
      .eq('id', body.session_id)
      .single()

    if (sessionError || !session) {
      return errorResponse('Session not found', 404)
    }

    const course = session.course as { id: string; title: string; organization_id: string } | null
    if (!course) {
      return errorResponse('Course not found', 404)
    }

    // Only org members (owner/admin/teacher) can trigger schedule-change notifications.
    const authzResult = await verifyOrgMembership(authResult.userId!, course.organization_id, [
      'owner',
      'admin',
      'teacher',
    ])
    if (!authzResult.authorized) {
      return errorResponse('You do not have permission to notify this course', 403)
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', course.organization_id)
      .single()

    // Load confirmed participants.
    const { data: signups } = await supabase
      .from('signups')
      .select('participant_name, participant_email')
      .eq('course_id', course.id)
      .eq('status', 'confirmed')

    const recipients = (signups || []).filter((s) => s.participant_email)

    if (recipients.length === 0) {
      return successResponse({ notifications_sent: 0, total_recipients: 0 }, 200)
    }

    const oldDate = formatDateNo(body.old_date)
    const newDate = formatDateNo(body.new_date)

    const results = await Promise.allSettled(
      recipients.map((signup) =>
        fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            to: signup.participant_email,
            template: 'course-schedule-change',
            templateData: {
              participantName: signup.participant_name || '',
              courseName: course.title,
              oldDate,
              oldTime: body.old_time || '',
              newDate,
              newTime: body.new_time,
              organizationName: org?.name || 'Ease',
            },
          }),
        }),
      ),
    )

    const sent = results.filter(
      (r) => r.status === 'fulfilled' && (r.value as Response).ok,
    ).length

    return successResponse(
      { notifications_sent: sent, total_recipients: recipients.length },
      200,
    )
  } catch (err) {
    console.error('notify-schedule-change error:', err)
    return errorResponse('Internal error', 500)
  }
})
