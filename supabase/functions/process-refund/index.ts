// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { createStripeClient } from '../_shared/stripe.ts'
import { verifyAuth, handleCors, getCorsHeaders, errorResponse } from '../_shared/auth.ts'

const stripe = createStripeClient()

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = getCorsHeaders()

interface ProcessRefundRequest {
  signup_id: string
  reason?: string
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    // Verify authentication
    const authResult = await verifyAuth(req)
    if (!authResult.authenticated) {
      return errorResponse(authResult.error || 'Unauthorized', 401)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body: ProcessRefundRequest = await req.json()

    if (!body.signup_id) {
      return errorResponse('Missing signup_id', 400)
    }

    // Get signup with course details
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

    // Verify user owns this signup by user_id only.
    // Email-based matching is vulnerable: a user could change their profile email
    // to match another participant's email and cancel their signup.
    // For guest bookings (no user_id), use auth.users.email from the JWT instead.
    const { data: { user: authUser } } = await supabase.auth.admin.getUserById(authResult.userId!)
    const isOwner = signup.user_id === authResult.userId ||
                    (signup.user_id === null && authUser?.email === signup.participant_email)

    if (!isOwner) {
      return errorResponse('You can only cancel your own signups', 403)
    }

    // Check if already cancelled/refunded
    if (signup.status === 'cancelled') {
      return errorResponse('Signup is already cancelled', 400)
    }

    if (signup.payment_status === 'refunded') {
      return errorResponse('Signup has already been refunded', 400)
    }

    // Check 48-hour cancellation policy
    const course = signup.course as { title: string; start_date: string; time_schedule: string; location: string; organization_id: string } | null

    // Determine the relevant date for cancellation check.
    // Dates from the DB are date-only strings (YYYY-MM-DD) without timezone.
    // Courses are in Norway (CET = UTC+1, CEST = UTC+2).
    // We use Intl to get the correct UTC offset for a given date in Europe/Oslo,
    // which handles DST transitions automatically.
    function norwegianDateToUTC(dateStr: string, timeStr: string): Date {
      // Build a rough Date to determine the correct UTC offset for that date
      const rough = new Date(`${dateStr}T${timeStr}:00Z`)
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Oslo',
        timeZoneName: 'shortOffset',
      })
      const parts = formatter.formatToParts(rough)
      const tzPart = parts.find(p => p.type === 'timeZoneName')
      // tzPart.value is e.g. "GMT+1" or "GMT+2"
      const offsetMatch = tzPart?.value?.match(/GMT([+-]\d+)/)
      const offsetHours = offsetMatch ? parseInt(offsetMatch[1], 10) : 1
      const sign = offsetHours >= 0 ? '+' : '-'
      const absOffset = String(Math.abs(offsetHours)).padStart(2, '0')
      return new Date(`${dateStr}T${timeStr}:00${sign}${absOffset}:00`)
    }

    let eventDate: Date | null = null

    if (signup.is_drop_in && signup.class_date) {
      const timeStr = signup.class_time || '09:00'
      eventDate = norwegianDateToUTC(signup.class_date, timeStr)
    } else if (course?.start_date) {
      let timeStr = '09:00'
      if (course.time_schedule) {
        const timeMatch = course.time_schedule.match(/(\d{1,2}:\d{2})/)
        if (timeMatch) timeStr = timeMatch[1]
      }
      eventDate = norwegianDateToUTC(course.start_date, timeStr)
    }

    const now = new Date()
    const hoursUntilEvent = eventDate ? (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60) : 999

    // 48-hour policy check
    const CANCELLATION_DEADLINE_HOURS = 48
    const canGetRefund = hoursUntilEvent >= CANCELLATION_DEADLINE_HOURS

    let refundResult = null
    let refundError = null
    const refundAttempted = canGetRefund && !!signup.stripe_payment_intent_id && signup.payment_status === 'paid'

    // Process Stripe refund if eligible and has payment
    if (refundAttempted) {
      try {
        refundResult = await stripe.refunds.create({
          payment_intent: signup.stripe_payment_intent_id,
          reason: 'requested_by_customer',
        })
        console.log(`Refund created: ${refundResult.id}`)
      } catch (stripeError) {
        console.error('Stripe refund error:', stripeError)
        refundError = stripeError instanceof Error ? stripeError.message : 'Stripe refund failed'
      }
    }

    // If a refund was attempted but failed, do NOT cancel the signup.
    // The participant keeps their spot so the teacher can retry manually.
    if (refundAttempted && !refundResult) {
      return new Response(
        JSON.stringify({
          success: false,
          refunded: false,
          refund_amount: 0,
          message: `Refusjonen mislyktes. Påmeldingen er ikke endret.`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update signup status — only reach here if refund succeeded or was not needed
    const updateData: Record<string, unknown> = {
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    }

    if (refundResult) {
      updateData.payment_status = 'refunded'
      updateData.refund_amount = signup.amount_paid || 0
      updateData.refunded_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('signups')
      .update(updateData)
      .eq('id', body.signup_id)

    if (updateError) {
      console.error('Error updating signup:', updateError)
      return errorResponse('Failed to update signup status', 500)
    }

    // Send cancellation confirmation email
    try {
      // Get organization name
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', course?.organization_id || signup.organization_id)
        .single()

      const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
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
          }
        })
      })

      if (!emailResponse.ok) {
        console.error('Failed to send cancellation email')
      }
    } catch (emailError) {
      console.error('Error sending cancellation email:', emailError)
    }

    const refundSucceeded = !!refundResult

    return new Response(
      JSON.stringify({
        success: true,
        refunded: refundSucceeded,
        refund_amount: refundSucceeded && signup.amount_paid ? signup.amount_paid : 0,
        message: canGetRefund && refundSucceeded
          ? 'Avbestilling bekreftet. Refusjon vil bli behandlet.'
          : 'Avbestilling bekreftet. Ingen refusjon – avbestillingen skjedde under 48 timer før kursstart.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Process refund error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
