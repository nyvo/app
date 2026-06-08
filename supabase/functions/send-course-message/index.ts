// Teacher-initiated mass message to a course's confirmed participants.
//
// Mirror of update-session's notification fan-out: validate teacher owns
// the course, then loop the confirmed signups and dispatch the
// course-message email template via _shared/email.ts. Best-effort —
// individual email failures don't fail the whole request.

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

interface SendCourseMessageRequest {
  course_id: string
  body: string
}

const MAX_BODY = 4000

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') return errorResponse('Method not allowed', 405, req)

  const auth = await verifyAuth(req)
  if (!auth.authenticated || !auth.userId) return errorResponse(auth.error || 'Unauthorized', 401, req)

  let body: SendCourseMessageRequest
  try { body = await req.json() } catch { return errorResponse('Invalid JSON', 400, req) }

  const messageBody = (body.body ?? '').trim()

  if (!body.course_id || !messageBody) {
    return errorResponse('Missing course_id or body', 400, req)
  }
  if (messageBody.length > MAX_BODY) {
    return errorResponse(`Body must be ${MAX_BODY} characters or fewer`, 400, req)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Verify the course exists and the caller is a member of its seller.
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, seller_id, seller:sellers(name)')
    .eq('id', body.course_id)
    .single()

  if (courseError || !course) return errorResponse('Course not found', 404, req)

  const seller = course.seller as unknown as { name: string } | null
  const studioName = seller?.name ?? ''

  const authz = await verifyOrgMembership(auth.userId, course.seller_id)
  if (!authz.authorized) return errorResponse(authz.error || 'Forbidden', 403, req)

  // Fan out to every confirmed signup.
  const { data: signups, error: signupsError } = await supabase
    .from('signups')
    .select(`id, profile:profiles(email, name)`)
    .eq('course_id', body.course_id)
    .eq('status', 'confirmed')

  if (signupsError) {
    console.error('[send-course-message] signups query error', signupsError)
    return errorResponse('Could not load participants', 500, req)
  }

  let notified = 0
  let failed = 0

  for (const s of signups ?? []) {
    const profile = (s as { profile?: { email?: string; name?: string | null } | null }).profile
    if (!profile?.email) continue
    const result = await sendEmail({
      template: 'course-message',
      to: profile.email,
      props: {
        buyerName: profile.name || 'Hei',
        studioName,
        courseTitle: course.title,
        // No teacher-authored subject — the email's H1 and Resend subject
        // line both fall back to the course title for context.
        subject: course.title,
        body: messageBody,
      },
    })
    if (result.error) {
      failed += 1
      console.error('[send-course-message] email failed', { to: profile.email, error: result.error })
    } else {
      notified += 1
    }
  }

  return successResponse({ course_id: body.course_id, notified, failed }, 200, req)
})
