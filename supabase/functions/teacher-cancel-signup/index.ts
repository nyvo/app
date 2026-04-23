// Teacher-initiated single-signup cancellation with optional Dintero refund.
// Replaces the Stripe-based implementation.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  verifyAuth,
  verifyOrgMembership,
  handleCors,
  errorResponse,
  successResponse,
} from '../_shared/auth.ts'
import { refundTransaction } from '../_shared/dintero.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface TeacherCancelRequest {
  signup_id: string
  refund: boolean
  reason?: string
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
    const body = (await req.json()) as TeacherCancelRequest

    if (!body.signup_id) {
      return errorResponse('Missing signup_id', 400)
    }

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

    const authzResult = await verifyOrgMembership(authResult.userId!, course.organization_id, [
      'owner',
      'admin',
      'teacher',
    ])
    if (!authzResult.authorized) {
      return errorResponse('You do not have permission to cancel signups for this organization', 403)
    }

    if (signup.status === 'cancelled' || signup.status === 'course_cancelled') {
      return errorResponse('Signup is already cancelled', 400)
    }

    const refundRequested =
      body.refund && !!signup.dintero_transaction_id && signup.payment_status === 'paid'

    let refundSucceeded = false
    let refundError: string | null = null

    if (refundRequested) {
      const amountOre = Math.round(Number(signup.amount_paid || 0) * 100)
      try {
        await refundTransaction(signup.dintero_transaction_id, amountOre, 'requested_by_customer')
        refundSucceeded = true
      } catch (err) {
        refundError = err instanceof Error ? err.message : 'Dintero refund failed'
      }
    }

    if (refundRequested && !refundSucceeded) {
      return errorResponse(
        `Refusjon feilet: ${refundError}. Påmeldingen er ikke endret – prøv igjen.`,
        500,
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
      return errorResponse('Failed to update signup status', 500)
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', course.organization_id)
      .single()

    try {
      const courseDate = course.start_date
        ? new Date(course.start_date).toLocaleDateString('nb-NO', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })
        : ''

      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`,
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
        ? 'Påmelding avmeldt. Refusjon vil bli behandlet.'
        : 'Påmelding avmeldt.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return errorResponse(message, 500)
  }
})
