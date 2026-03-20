// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { createStripeClient } from '../_shared/stripe.ts'
import { verifyAuth, verifyOrgMembership, handleCors, getCorsHeaders, errorResponse, successResponse } from '../_shared/auth.ts'

const stripe = createStripeClient()

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
      updateData.refund_amount = signup.amount_paid || 0
      updateData.refunded_at = new Date().toISOString()
    }

    if (body.reason) {
      const existingNote = typeof signup.note === 'string' ? signup.note : ''
      updateData.note = existingNote
        ? `${existingNote}\n---\nAvmeldt av instruktør: ${body.reason}`
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
          template: 'teacher-cancellation',
          templateData: {
            participantName: signup.participant_name || '',
            courseName: course.title,
            courseDate: courseDate || '',
            courseTime: course.time_schedule || '',
            organizationName: org?.name || '',
            refunded: refunded.toString(),
            refundAmount: signup.amount_paid?.toString() || '',
          }
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
