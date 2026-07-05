// Server-side signup creation for free courses.
// The public booking page cannot be trusted to enforce "course is free" —
// this function verifies course.price <= 0 server-side before calling the
// atomic capacity RPC, closing the free-signup forgery hole that existed
// when the client inserted signups directly.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { handleCors, errorResponse, successResponse, getClientIp } from '../_shared/auth.ts'
import { isCourseEnded } from '../_shared/course-status.ts'
import { deliverBookingConfirmations } from '../_shared/booking-notifications.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface CreateFreeSignupRequest {
  courseId: string
  participantName: string
  participantEmail: string
  participantPhone: string
  participantNote?: string
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const body: CreateFreeSignupRequest = await req.json()
    const { courseId, participantName, participantEmail, participantPhone, participantNote } = body

    if (!courseId || !participantName || !participantEmail || !participantPhone) {
      return errorResponse('Missing required fields', 400, req)
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(participantEmail)) {
      return errorResponse('Invalid email format', 400, req)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Abuse protection: per-IP + per-email fixed-window rate limit. This path is
    // unauthenticated and fires a confirmation email, so cap both axes. Check IP
    // FIRST and return on block, so a rate-limited IP can't keep incrementing /
    // creating arbitrary email buckets. Fail CLOSED on limiter errors — an
    // unauthenticated email-sending endpoint with a broken limiter is a spam
    // engine, so a limiter outage pauses signups rather than uncapping them.
    const clientIp = getClientIp(req)
    const { data: ipAllowed, error: ipLimitErr } = await supabase.rpc('check_rate_limit', { p_key: `free-signup:ip:${clientIp}`, p_limit: 10, p_window_seconds: 3600 })
    if (ipLimitErr) {
      console.error('check_rate_limit (ip) failed:', ipLimitErr)
      return errorResponse('Prøv igjen om litt.', 503, req)
    }
    if (ipAllowed === false) {
      return errorResponse('For mange forsøk. Prøv igjen om litt.', 429, req)
    }
    const emailKey = participantEmail.trim().toLowerCase()
    const { data: emailAllowed, error: emailLimitErr } = await supabase.rpc('check_rate_limit', { p_key: `free-signup:email:${emailKey}`, p_limit: 5, p_window_seconds: 3600 })
    if (emailLimitErr) {
      console.error('check_rate_limit (email) failed:', emailLimitErr)
      return errorResponse('Prøv igjen om litt.', 503, req)
    }
    if (emailAllowed === false) {
      return errorResponse('For mange forsøk. Prøv igjen om litt.', 429, req)
    }

    // Fetch course to verify it's actually free and bookable
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, seller_id, status, price, start_date, end_date, time_schedule, location, course_sessions(session_date, status)')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return errorResponse('Course not found', 404, req)
    }

    if (course.status === 'draft' || course.status === 'cancelled') {
      return errorResponse('Course is not available for booking', 400, req)
    }

    // Reject signups for a course whose last session is already in the past.
    // Persisted status stays `upcoming` forever, so this date gate is the only
    // thing stopping a finished course from being booked.
    if (
      isCourseEnded({
        status: course.status,
        startDate: course.start_date,
        endDate: course.end_date,
        sessions: course.course_sessions as { session_date: string; status: string | null }[] | null,
      })
    ) {
      return errorResponse('Dette kurset er avsluttet.', 400, req)
    }

    // Enforce "free" server-side: price must be null or <= 0
    if (course.price != null && course.price > 0) {
      return errorResponse('Course is not free — use the paid checkout flow', 400, req)
    }

    // Resolve the course's default ticket tier — every course has exactly one
    // (created in the 20260426020000 migration). Don't trust course.price alone:
    // validate the exact tier we're about to enrol on is itself free, active,
    // and not a drop-in. This closes the gap where a free-priced course could
    // carry a priced/inactive/drop-in default tier and still be booked at 0 kr.
    const { data: defaultTier, error: tierError } = await supabase
      .from('course_signup_packages')
      .select('id, price, is_active, ticket_kind')
      .eq('course_id', course.id)
      .eq('is_default', true)
      .maybeSingle()

    if (tierError || !defaultTier) {
      return errorResponse('Course has no default ticket type', 500, req)
    }

    const tier = defaultTier as { id: string; price: number | null; is_active: boolean; ticket_kind: string }
    if ((tier.price ?? 0) > 0) {
      return errorResponse('Course is not free — use the paid checkout flow', 400, req)
    }
    if (!tier.is_active) {
      return errorResponse('Denne billetten er ikke tilgjengelig', 400, req)
    }
    if (tier.ticket_kind === 'drop_in') {
      return errorResponse('Gratis påmelding støtter ikke drop-in', 400, req)
    }

    // Call the atomic capacity RPC. The advisory lock inside it serialises
    // concurrent free signups so the capacity check + insert can't oversell.
    const { data: result, error: rpcError } = await supabase.rpc('create_signup_if_available', {
      p_seller_id: course.seller_id,
      p_course_id: course.id,
      p_ticket_type_id: tier.id,
      p_participant_name: participantName.trim(),
      p_participant_email: participantEmail.trim(),
      p_participant_phone: participantPhone.trim(),
      p_amount_paid: 0,
      p_note: participantNote?.trim() || null,
    })

    if (rpcError) {
      console.error('create_signup_if_available failed:', rpcError)
      return errorResponse('Kunne ikke fullføre påmelding', 500, req)
    }

    const rpcResult = result as { success: boolean; signup_id?: string; error?: string; message?: string }

    if (!rpcResult.success) {
      // database_error carries raw SQLERRM (internal table/constraint names) —
      // log it, never forward it to the caller.
      if (rpcResult.error === 'database_error') {
        console.error('create_signup_if_available database_error:', rpcResult.message)
        return errorResponse('Kunne ikke fullføre påmelding', 500, req)
      }
      const status = rpcResult.error === 'course_full' ? 409
        : rpcResult.error === 'already_signed_up' ? 409
        : rpcResult.error === 'duplicate_signup' ? 409
        : rpcResult.error === 'course_not_found' ? 404
        : 400
      return errorResponse(rpcResult.message || 'Kunne ikke fullføre påmelding', status, req)
    }

    // Fire the buyer confirmation + studio notification inline, mirroring the
    // paid flow. Best-effort: the signup is already committed, so never fail it
    // on an email hiccup — the send-pending-confirmations cron is the retry net.
    try {
      await deliverBookingConfirmations(
        supabase,
        rpcResult.signup_id!,
        {
          seller_id: course.seller_id,
          course_id: course.id,
          participant_name: participantName.trim(),
          participant_email: participantEmail.trim(),
        },
        0,
      )
    } catch (_) {
      // swallowed — cron retries
    }

    return successResponse({ signupId: rpcResult.signup_id }, 200, req)
  } catch (err) {
    console.error('create-free-signup error:', err)
    return errorResponse('Internal error', 500, req)
  }
})
