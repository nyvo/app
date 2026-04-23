// Student-initiated cancellation + Dintero refund.
// Replaces the Stripe-based implementation.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { verifyAuth, handleCors, getCorsHeaders, errorResponse } from '../_shared/auth.ts'
import { refundTransaction } from '../_shared/dintero.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const corsHeaders = getCorsHeaders()

interface ProcessRefundRequest {
  signup_id: string
  reason?: string
}

function norwegianDateToUTC(dateStr: string, timeStr: string): Date {
  const rough = new Date(`${dateStr}T${timeStr}:00Z`)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Oslo',
    timeZoneName: 'shortOffset',
  })
  const parts = formatter.formatToParts(rough)
  const tzPart = parts.find((p) => p.type === 'timeZoneName')
  const offsetMatch = tzPart?.value?.match(/GMT([+-]\d+)/)
  const offsetHours = offsetMatch ? parseInt(offsetMatch[1], 10) : 1
  const sign = offsetHours >= 0 ? '+' : '-'
  const absOffset = String(Math.abs(offsetHours)).padStart(2, '0')
  return new Date(`${dateStr}T${timeStr}:00${sign}${absOffset}:00`)
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
    const body = (await req.json()) as ProcessRefundRequest

    if (!body.signup_id) {
      return errorResponse('Missing signup_id', 400)
    }

    const { data: signup, error: signupError } = await supabase
      .from('signups')
      .select(`
        *,
        course:courses(title, start_date, time_schedule, location, organization_id)
      `)
      .eq('id', body.signup_id)
      .single()

    if (signupError || !signup) {
      return errorResponse('Signup not found', 404)
    }

    // Ownership check: require authenticated user to match signup.user_id.
    // Email-match fallback for guest bookings was removed — an authenticated
    // user whose email happens to match a guest booking's participant_email
    // could otherwise cancel a booking they never made (e.g. someone booked
    // in their name before they created an account). Guest bookings can be
    // cancelled by the teacher via the dashboard.
    if (signup.user_id !== authResult.userId) {
      return errorResponse('You can only cancel your own signups', 403)
    }

    if (signup.status === 'cancelled') {
      return errorResponse('Signup is already cancelled', 400)
    }

    if (signup.payment_status === 'refunded') {
      return errorResponse('Signup has already been refunded', 400)
    }

    const course = signup.course as {
      title: string
      start_date: string
      time_schedule: string
      location: string
      organization_id: string
    } | null

    // Determine event date/time for 24h cancellation policy
    let eventDate: Date | null = null
    if (signup.is_drop_in && signup.class_date) {
      const timeStr = signup.class_time || '09:00'
      eventDate = norwegianDateToUTC(signup.class_date, timeStr)
    } else if (course?.start_date) {
      let timeStr = '09:00'
      if (course.time_schedule) {
        const match = course.time_schedule.match(/(\d{1,2}:\d{2})/)
        if (match) timeStr = match[1]
      }
      eventDate = norwegianDateToUTC(course.start_date, timeStr)
    }

    const now = new Date()
    const hoursUntilEvent = eventDate ? (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60) : 999
    const CANCELLATION_DEADLINE_HOURS = 24
    const canGetRefund = hoursUntilEvent >= CANCELLATION_DEADLINE_HOURS

    const refundAttempted =
      canGetRefund && !!signup.dintero_transaction_id && signup.payment_status === 'paid'

    let refundSucceeded = false
    let refundError: string | null = null

    if (refundAttempted) {
      const amountOre = Math.round(Number(signup.amount_paid || 0) * 100)
      try {
        await refundTransaction(signup.dintero_transaction_id, amountOre, 'requested_by_customer')
        refundSucceeded = true
      } catch (err) {
        refundError = err instanceof Error ? err.message : 'Refund failed'
      }
    }

    // If refund was attempted but failed, do not cancel the signup.
    if (refundAttempted && !refundSucceeded) {
      return new Response(
        JSON.stringify({
          success: false,
          refunded: false,
          refund_amount: 0,
          message: 'Refusjonen mislyktes. Påmeldingen er ikke endret.',
          error: refundError,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const updateData: Record<string, unknown> = {
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    }
    if (refundSucceeded) {
      updateData.payment_status = 'refunded'
      updateData.refund_amount = signup.amount_paid || 0
      updateData.refunded_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('signups')
      .update(updateData)
      .eq('id', body.signup_id)

    if (updateError) {
      return errorResponse('Failed to update signup status', 500)
    }

    // Cancellation email (non-blocking)
    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', course?.organization_id || signup.organization_id)
        .single()

      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          to: signup.participant_email,
          template: 'student-cancellation',
          templateData: {
            participantName: signup.participant_name || '',
            courseName: course?.title || '',
            organizationName: org?.name || '',
            canGetRefund: canGetRefund.toString(),
            refundAmount: signup.amount_paid?.toString() || '',
          },
        }),
      })
    } catch {
      // Non-fatal
    }

    return new Response(
      JSON.stringify({
        success: true,
        refunded: refundSucceeded,
        refund_amount: refundSucceeded && signup.amount_paid ? signup.amount_paid : 0,
        message:
          canGetRefund && refundSucceeded
            ? 'Avbestilling bekreftet. Refusjon vil bli behandlet.'
            : 'Avbestilling bekreftet. Ingen refusjon – avbestillingen skjedde under 24 timer før kursstart.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
