// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17.3.1'
import { verifyAuth, verifyOrgMembership, handleCors, getCorsHeaders, errorResponse, successResponse } from '../_shared/auth.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-12-18.acacia',
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface TeacherCancelRequest {
  signup_id: string
  refund: boolean
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
    const body: TeacherCancelRequest = await req.json()

    if (!body.signup_id) {
      return errorResponse('Missing signup_id', 400)
    }

    // Get signup with course details
    const { data: signup, error: signupError } = await supabase
      .from('signups')
      .select(`
        *,
        course:courses(id, title, start_date, time_schedule, location, organization_id)
      `)
      .eq('id', body.signup_id)
      .single()

    if (signupError || !signup) {
      return errorResponse('Signup not found', 404)
    }

    const course = signup.course as {
      id: string
      title: string
      start_date: string
      time_schedule: string
      location: string
      organization_id: string
    }

    // Verify teacher is authorized (must be org member with appropriate role)
    const authzResult = await verifyOrgMembership(
      authResult.userId!,
      course.organization_id,
      ['owner', 'admin', 'teacher']
    )
    if (!authzResult.authorized) {
      return errorResponse('You do not have permission to cancel signups for this organization', 403)
    }

    // Validate signup is not already cancelled
    if (signup.status === 'cancelled' || signup.status === 'course_cancelled') {
      return errorResponse('Signup is already cancelled', 400)
    }

    let refundResult = null
    let refundError = null
    const refundRequested = body.refund && !!signup.stripe_payment_intent_id && signup.payment_status === 'paid'

    // Process Stripe refund if requested and applicable
    if (refundRequested) {
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

    // If a refund was requested but failed, do NOT cancel the signup.
    // The participant keeps their spot so the teacher can retry.
    if (refundRequested && !refundResult) {
      return errorResponse(`Refusjon feilet: ${refundError}. Påmeldingen er ikke endret – prøv igjen.`, 500)
    }

    // Update signup status — only reach here if refund succeeded or was not requested
    const updateData: Record<string, unknown> = {
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    }

    if (refundResult) {
      updateData.payment_status = 'refunded'
    }

    if (body.reason) {
      updateData.note = signup.note
        ? `${signup.note}\n---\nAvmeldt av instruktør: ${body.reason}`
        : `Avmeldt av instruktør: ${body.reason}`
    }

    const { error: updateError } = await supabase
      .from('signups')
      .update(updateData)
      .eq('id', body.signup_id)

    if (updateError) {
      console.error('Error updating signup:', updateError)
      return errorResponse('Failed to update signup status', 500)
    }

    // Get organization name for email
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', course.organization_id)
      .single()

    // Send cancellation notification email to participant
    try {
      const refunded = body.refund && !!refundResult
      const courseDate = course.start_date
        ? new Date(course.start_date).toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })
        : ''

      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          to: signup.participant_email,
          subject: `Avmelding: ${course.title}`,
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
    .cancelled { background: #fee2e2; color: #991b1b; }
    .details-box { background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .info-box { background: #f0fdf4; border-radius: 12px; padding: 16px; margin: 20px 0; border-left: 4px solid #10b981; }
    .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Ease</div>
    </div>

    <p style="text-align: center;">
      <span class="status-badge cancelled">Påmelding avmeldt</span>
    </p>

    <p>Hei ${signup.participant_name || ''},</p>

    <p>Din påmelding til <strong>${course.title}</strong> har blitt avmeldt av ${org?.name || 'studiet'}.</p>

    <div class="details-box">
      <p><strong>Kurs:</strong> ${course.title}</p>
      ${courseDate ? `<p><strong>Dato:</strong> ${courseDate}</p>` : ''}
      ${course.time_schedule ? `<p><strong>Tid:</strong> ${course.time_schedule}</p>` : ''}
    </div>

    ${refunded && signup.amount_paid ? `
    <div class="info-box">
      <p><strong>Refusjon:</strong> ${signup.amount_paid} kr vil bli tilbakebetalt til din betalingsmetode innen 5\u201310 virkedager.</p>
    </div>
    ` : ''}

    <p>Ta kontakt med ${org?.name || 'oss'} hvis du har spørsmål.</p>

    <div class="footer">
      <p>Hilsen,<br>${org?.name || 'Ease'}</p>
    </div>
  </div>
</body>
</html>
          `,
          text: refunded
            ? `Hei ${signup.participant_name || ''}, din påmelding til ${course.title} har blitt avmeldt av ${org?.name || 'studiet'}. Refusjon på ${signup.amount_paid || 0} kr vil bli tilbakebetalt innen 5-10 virkedager.`
            : `Hei ${signup.participant_name || ''}, din påmelding til ${course.title} har blitt avmeldt av ${org?.name || 'studiet'}. Ta kontakt med oss hvis du har spørsmål.`
        })
      })
    } catch (emailError) {
      console.error('Error sending cancellation email:', emailError)
    }

    return successResponse({
      success: true,
      refunded: !!refundResult,
      refund_amount: refundResult && signup.amount_paid ? signup.amount_paid : 0,
      message: refundResult
        ? 'Påmelding avmeldt. Refusjon vil bli behandlet.'
        : 'Påmelding avmeldt.',
    })
  } catch (error) {
    console.error('Teacher cancel signup error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return errorResponse(message, 500)
  }
})
