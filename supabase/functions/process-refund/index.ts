// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17.3.1'
import { verifyAuth, handleCors, getCorsHeaders, errorResponse } from '../_shared/auth.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-12-18.acacia',
})

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
    // We append the Norwegian timezone offset so the comparison is correct.
    let eventDate: Date | null = null

    if (signup.is_drop_in && signup.class_date) {
      // For drop-in, use the specific class date
      const timeStr = signup.class_time || '09:00'
      // Parse as Norwegian time by appending Europe/Oslo offset
      eventDate = new Date(`${signup.class_date}T${timeStr}:00+01:00`)
    } else if (course?.start_date) {
      // For course series, use course start date
      let timeStr = '09:00'
      if (course.time_schedule) {
        const timeMatch = course.time_schedule.match(/(\d{1,2}:\d{2})/)
        if (timeMatch) timeStr = timeMatch[1]
      }
      eventDate = new Date(`${course.start_date}T${timeStr}:00+01:00`)
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
          message: `Refusjon feilet: ${refundError}. Påmeldingen er ikke endret.`,
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
          subject: canGetRefund ? 'Avmelding bekreftet - Refusjon behandlet' : 'Avmelding bekreftet',
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #10b981; }
    .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 500; margin-bottom: 20px; }
    .refunded { background: #dcfce7; color: #166534; }
    .no-refund { background: #fef3c7; color: #92400e; }
    .details-box { background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Ease</div>
    </div>

    <p style="text-align: center;">
      <span class="status-badge ${canGetRefund ? 'refunded' : 'no-refund'}">
        ${canGetRefund ? 'Avmelding med refusjon' : 'Avmelding uten refusjon'}
      </span>
    </p>

    <p>Hei ${signup.participant_name || ''},</p>

    <p>Din avmelding fra <strong>${course?.title || 'kurset'}</strong> er bekreftet.</p>

    <div class="details-box">
      ${canGetRefund && signup.amount_paid ? `
        <p><strong>Refusjon:</strong> ${signup.amount_paid} kr vil bli tilbakebetalt til din betalingsmetode innen 5-10 virkedager.</p>
      ` : `
        <p><strong>Merk:</strong> Siden avmeldingen skjedde mindre enn 48 timer før kursstart, kan vi dessverre ikke tilby refusjon i henhold til våre avbestillingsvilkår.</p>
      `}
    </div>

    <div class="footer">
      <p>Hilsen,<br>${org?.name || 'Ease'}</p>
    </div>
  </div>
</body>
</html>
          `,
          text: canGetRefund
            ? `Hei ${signup.participant_name || ''}, din avmelding fra ${course?.title || 'kurset'} er bekreftet. Refusjon på ${signup.amount_paid || 0} kr vil bli tilbakebetalt innen 5-10 virkedager.`
            : `Hei ${signup.participant_name || ''}, din avmelding fra ${course?.title || 'kurset'} er bekreftet. Siden avmeldingen skjedde mindre enn 48 timer før kursstart, kan vi dessverre ikke tilby refusjon.`
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
          ? 'Avmelding bekreftet. Refusjon vil bli behandlet.'
          : 'Avmelding bekreftet. Ingen refusjon grunnet 48-timers avbestillingsfrist.',
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
