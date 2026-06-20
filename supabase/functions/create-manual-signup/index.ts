// Server-side signup creation for PAID courses on manual-payment (free-tier)
// sellers. The platform never touches the money (INV-4): the signup is
// recorded with payment_status='external' and the student settles directly
// with the studio ("betaling avtales med instruktør").
//
// Mirrors create-free-signup's server-side verification + rate limiting; the
// capacity RPC additionally enforces seller-is-not-integrated (uses_integrated_payments),
// so an integrated (Pro + Stripe) seller's paid courses can never be booked here.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { handleCors, errorResponse, successResponse } from '../_shared/auth.ts'
import { isCourseEnded } from '../_shared/course-status.ts'
import { deliverBookingConfirmations } from '../_shared/booking-notifications.ts'
import { formatKroner } from '../_shared/format.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface CreateManualSignupRequest {
  courseId: string
  ticketTypeId?: string
  courseSessionId?: string
  participantName: string
  participantEmail: string
  participantPhone: string
  participantNote?: string
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const body: CreateManualSignupRequest = await req.json()
    const {
      courseId,
      ticketTypeId,
      courseSessionId,
      participantName,
      participantEmail,
      participantPhone,
      participantNote,
    } = body

    if (!courseId || !participantName || !participantEmail || !participantPhone) {
      return errorResponse('Missing required fields', 400, req)
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(participantEmail)) {
      return errorResponse('Invalid email format', 400, req)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Abuse protection — same fixed-window pattern as create-free-signup:
    // unauthenticated path that fires confirmation emails, so cap per-IP and
    // per-email. IP first, fail open on limiter errors.
    const clientIp = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
    const { data: ipAllowed, error: ipLimitErr } = await supabase.rpc('check_rate_limit', { p_key: `manual-signup:ip:${clientIp}`, p_limit: 10, p_window_seconds: 3600 })
    if (ipLimitErr) console.error('check_rate_limit (ip) failed:', ipLimitErr)
    if (ipAllowed === false) {
      return errorResponse('For mange forsøk. Prøv igjen om litt.', 429, req)
    }
    const emailKey = participantEmail.trim().toLowerCase()
    const { data: emailAllowed, error: emailLimitErr } = await supabase.rpc('check_rate_limit', { p_key: `manual-signup:email:${emailKey}`, p_limit: 5, p_window_seconds: 3600 })
    if (emailLimitErr) console.error('check_rate_limit (email) failed:', emailLimitErr)
    if (emailAllowed === false) {
      return errorResponse('For mange forsøk. Prøv igjen om litt.', 429, req)
    }

    // Fetch course to verify it's bookable
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

    // Manual signups are only for sellers OUTSIDE the integrated payment flow.
    // (The capacity RPC re-checks this; the early read gives a clean error.)
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('uses_integrated_payments')
      .eq('id', course.seller_id)
      .single()

    if (sellerError || !seller) {
      return errorResponse('Seller not found', 404, req)
    }
    if (seller.uses_integrated_payments) {
      return errorResponse('Dette studioet bruker integrert betaling. Last inn siden på nytt.', 400, req)
    }

    // Resolve the ticket tier: an explicit ticketTypeId from the booking UI,
    // or the course's default tier. Validate it belongs to this course, is
    // active, and is actually priced — free tiers go through create-free-signup.
    let tierQuery = supabase
      .from('course_signup_packages')
      .select('id, price, is_active, ticket_kind')
      .eq('course_id', course.id)
    tierQuery = ticketTypeId
      ? tierQuery.eq('id', ticketTypeId)
      : tierQuery.eq('is_default', true)
    const { data: tierRow, error: tierError } = await tierQuery.maybeSingle()

    if (tierError || !tierRow) {
      return errorResponse('Billettypen finnes ikke', 404, req)
    }

    const tier = tierRow as { id: string; price: number | null; is_active: boolean; ticket_kind: string }
    if (!tier.is_active) {
      return errorResponse('Denne billetten er ikke tilgjengelig', 400, req)
    }
    if ((tier.price ?? 0) <= 0) {
      return errorResponse('Course is free — use the free signup flow', 400, req)
    }

    // Atomic capacity RPC. payment_status='external' marks the money as
    // settled outside the platform; amount_paid stays 0 because the platform
    // collected nothing. Drop-in session routing matches the paid flow.
    const { data: result, error: rpcError } = await supabase.rpc('create_signup_if_available', {
      p_seller_id: course.seller_id,
      p_course_id: course.id,
      p_ticket_type_id: tier.id,
      p_participant_name: participantName.trim(),
      p_participant_email: participantEmail.trim(),
      p_participant_phone: participantPhone.trim(),
      p_amount_paid: 0,
      p_course_session_id: courseSessionId ?? null,
      p_note: participantNote?.trim() || null,
      p_payment_status: 'external',
    })

    if (rpcError) {
      console.error('create_signup_if_available failed:', rpcError)
      return errorResponse('Kunne ikke fullføre påmelding', 500, req)
    }

    const rpcResult = result as { success: boolean; signup_id?: string; error?: string; message?: string }

    if (!rpcResult.success) {
      const status = rpcResult.error === 'course_full' ? 409
        : rpcResult.error === 'session_full' ? 409
        : rpcResult.error === 'already_signed_up' ? 409
        : rpcResult.error === 'course_not_found' ? 404
        : 400
      return errorResponse(rpcResult.message || 'Kunne ikke fullføre påmelding', status, req)
    }

    // Confirmation emails — best-effort, cron is the retry net. The amount
    // label makes clear the money changes hands outside the platform.
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
        tier.price ?? 0,
        { amountLabel: `${formatKroner(tier.price ?? 0)} – betales direkte til studioet` },
      )
    } catch (_) {
      // swallowed — cron retries
    }

    return successResponse({ signupId: rpcResult.signup_id }, 200, req)
  } catch (err) {
    console.error('create-manual-signup error:', err)
    return errorResponse('Internal error', 500, req)
  }
})
