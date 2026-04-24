// Student-initiated cancellation + Dintero refund.
// Replaces the Stripe-based implementation.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { verifyAuth, handleCors, errorResponse, successResponse } from '../_shared/auth.ts'
import { refundTransaction } from '../_shared/dintero.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface ProcessRefundRequest {
  signup_id: string
  reason?: string
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const authResult = await verifyAuth(req)
    if (!authResult.authenticated) {
      return errorResponse(authResult.error || 'Unauthorized', 401, req)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = (await req.json()) as ProcessRefundRequest

    if (!body.signup_id) {
      return errorResponse('Missing signup_id', 400, req)
    }

    const { data: signup, error: signupError } = await supabase
      .from('signups')
      .select(`
        *,
        course:courses(title, organization_id)
      `)
      .eq('id', body.signup_id)
      .single()

    if (signupError || !signup) {
      return errorResponse('Signup not found', 404, req)
    }

    // Ownership check: require authenticated user to match signup.user_id.
    // Email-match fallback for guest bookings was removed — an authenticated
    // user whose email happens to match a guest booking's participant_email
    // could otherwise cancel a booking they never made (e.g. someone booked
    // in their name before they created an account). Guest bookings can be
    // cancelled by the teacher via the dashboard.
    if (signup.user_id !== authResult.userId) {
      return errorResponse('You can only cancel your own signups', 403, req)
    }

    if (signup.status === 'cancelled') {
      return errorResponse('Signup is already cancelled', 400, req)
    }

    if (signup.payment_status === 'refunded') {
      return errorResponse('Signup has already been refunded', 400, req)
    }

    const course = signup.course as {
      title: string
      organization_id: string
    } | null

    // No platform-level cancellation window: any captured signup is eligible
    // for refund when the cancel flow runs. The teacher's dashboard offers
    // an explicit "cancel without refund" option for off-policy cases.
    const refundAttempted = !!signup.dintero_transaction_id && signup.payment_status === 'paid'

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
      return successResponse({
        success: false,
        refunded: false,
        refund_amount: 0,
        message: 'Refusjonen mislyktes. Påmeldingen er ikke endret.',
        error: refundError,
      }, 200, req)
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
      return errorResponse('Failed to update signup status', 500, req)
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
            refunded: refundSucceeded.toString(),
            refundAmount: signup.amount_paid?.toString() || '',
          },
        }),
      })
    } catch {
      // Non-fatal
    }

    return successResponse({
      success: true,
      refunded: refundSucceeded,
      refund_amount: refundSucceeded && signup.amount_paid ? signup.amount_paid : 0,
      message: refundSucceeded
        ? 'Avbestilling bekreftet. Refusjon vil bli behandlet.'
        : 'Avbestilling bekreftet.',
    }, 200, req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return errorResponse(message, 500, req)
  }
})
