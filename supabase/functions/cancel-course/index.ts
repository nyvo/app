// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17.3.1'
import { verifyAuth, verifyOrgMembership, handleCors, getCorsHeaders, errorResponse } from '../_shared/auth.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-12-18.acacia',
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = getCorsHeaders()

interface CancelCourseRequest {
  course_id: string
  reason?: string
  notify_participants?: boolean
}

interface CancellationResult {
  success: boolean
  refunds_processed: number
  refunds_failed: number
  notifications_sent: number
  total_refunded: number
  message: string
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
    const body: CancelCourseRequest = await req.json()

    if (!body.course_id) {
      return errorResponse('Missing course_id', 400)
    }

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, organization_id, status')
      .eq('id', body.course_id)
      .single()

    if (courseError || !course) {
      return errorResponse('Course not found', 404)
    }

    // Verify user is authorized to cancel this course (must be org member with appropriate role)
    const authzResult = await verifyOrgMembership(
      authResult.userId!,
      course.organization_id,
      ['owner', 'admin', 'teacher']
    )
    if (!authzResult.authorized) {
      return errorResponse('You do not have permission to cancel this course', 403)
    }

    // Check if already cancelled
    if (course.status === 'cancelled') {
      return errorResponse('Course is already cancelled', 400)
    }

    // Get organization name for emails
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', course.organization_id)
      .single()

    // Get all confirmed signups for this course
    const { data: signups, error: signupsError } = await supabase
      .from('signups')
      .select('*')
      .eq('course_id', body.course_id)
      .eq('status', 'confirmed')

    if (signupsError) {
      console.error('Error fetching signups:', signupsError)
      return errorResponse('Failed to fetch signups', 500)
    }

    const results: CancellationResult = {
      success: true,
      refunds_processed: 0,
      refunds_failed: 0,
      notifications_sent: 0,
      total_refunded: 0,
      message: ''
    }

    // Cancel the course FIRST to prevent new signups during refund processing
    const { error: updateError } = await supabase
      .from('courses')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', body.course_id)

    if (updateError) {
      console.error('Error updating course status:', updateError)
      return errorResponse('Failed to cancel course', 500)
    }

    // Process refunds in parallel (not sequentially)
    const refundPromises = (signups || []).map(async (signup) => {
      let refunded = false
      if (signup.stripe_payment_intent_id && signup.payment_status === 'paid') {
        try {
          const refund = await stripe.refunds.create({
            payment_intent: signup.stripe_payment_intent_id,
            reason: 'requested_by_customer',
          })
          console.log(`Refund created for signup ${signup.id}: ${refund.id}`)
          refunded = true
        } catch (refundError) {
          console.error(`Refund failed for signup ${signup.id}:`, refundError)
        }
      }

      // Update signup status
      await supabase
        .from('signups')
        .update({
          status: 'course_cancelled',
          payment_status: refunded ? 'refunded' : signup.payment_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', signup.id)

      return { refunded, amount: refunded ? (signup.amount_paid || 0) : 0 }
    })

    const refundResults = await Promise.allSettled(refundPromises)
    for (const r of refundResults) {
      if (r.status === 'fulfilled') {
        if (r.value.refunded) {
          results.refunds_processed++
          results.total_refunded += r.value.amount
        }
      } else {
        results.refunds_failed++
      }
    }

    // Send notification emails AFTER all refunds are processed (non-blocking)
    if (body.notify_participants !== false) {
      const emailPromises = (signups || [])
        .filter(s => s.participant_email)
        .map(async (signup) => {
          try {
            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`
              },
              body: JSON.stringify({
                to: signup.participant_email,
                subject: `Kurs avlyst: ${course.title}`,
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
    .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .alert-title { color: #991b1b; font-weight: 600; margin-bottom: 8px; }
    .refund-box { background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .refund-title { color: #166534; font-weight: 600; margin-bottom: 8px; }
    .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Ease</div>
    </div>

    <p>Hei ${signup.participant_name || ''},</p>

    <div class="alert-box">
      <p class="alert-title">Kurset er avlyst</p>
      <p>Vi må dessverre informere om at <strong>${course.title}</strong> er avlyst.</p>
      ${body.reason ? `<p><em>Årsak: ${body.reason}</em></p>` : ''}
    </div>

    ${signup.payment_status === 'paid' && signup.amount_paid ? `
    <div class="refund-box">
      <p class="refund-title">Refusjon</p>
      <p>${signup.amount_paid} kr vil bli tilbakebetalt til din betalingsmetode innen 5-10 virkedager.</p>
    </div>
    ` : ''}

    <p>Vi beklager eventuelle ulemper dette måtte medføre.</p>

    <div class="footer">
      <p>Hilsen,<br>${org?.name || 'Ease'}</p>
    </div>
  </div>
</body>
</html>
                `,
                text: `Hei ${signup.participant_name || ''}, vi må dessverre informere om at ${course.title} er avlyst.${signup.payment_status === 'paid' && signup.amount_paid ? ` ${signup.amount_paid} kr vil bli tilbakebetalt innen 5-10 virkedager.` : ''} Vi beklager eventuelle ulemper.`
              })
            })
            return emailResponse.ok
          } catch (emailError) {
            console.error(`Email failed for ${signup.participant_email}:`, emailError)
            return false
          }
        })

      const emailResults = await Promise.allSettled(emailPromises)
      results.notifications_sent = emailResults.filter(
        r => r.status === 'fulfilled' && r.value
      ).length
    }

    results.message = `Kurset er avlyst. ${results.refunds_processed} refusjoner behandlet, ${results.notifications_sent} varsler sendt.`

    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Cancel course error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
