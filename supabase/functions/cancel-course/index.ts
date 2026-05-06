// Teacher-initiated course cancellation with bulk Dintero refunds.
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

interface CancelCourseRequest {
  course_id: string
  reason?: string
  notify_participants?: boolean
}

interface FailedRefundDetail {
  signup_id: string
  participant_name: string
  participant_email: string
  error: string
}

interface CancellationResult {
  success: boolean
  refunds_processed: number
  refunds_failed: number
  failed_refund_details: FailedRefundDetail[]
  notifications_sent: number
  total_refunded: number
  message: string
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
    const body = (await req.json()) as CancelCourseRequest

    if (!body.course_id) {
      return errorResponse('Missing course_id', 400, req)
    }

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, seller_id, status')
      .eq('id', body.course_id)
      .single()

    if (courseError || !course) {
      return errorResponse('Course not found', 404, req)
    }

    const authzResult = await verifyOrgMembership(authResult.userId!, course.seller_id, [
      'owner',
      'admin',
      'teacher',
    ])
    if (!authzResult.authorized) {
      return errorResponse('You do not have permission to cancel this course', 403, req)
    }

    if (course.status === 'cancelled') {
      return errorResponse('Course is already cancelled', 400, req)
    }

    const { data: seller } = await supabase
      .from('sellers')
      .select('name')
      .eq('id', course.seller_id)
      .single()

    const { data: signups, error: signupsError } = await supabase
      .from('signups')
      .select('*')
      .eq('course_id', body.course_id)
      .eq('status', 'confirmed')

    if (signupsError) {
      return errorResponse('Failed to fetch signups', 500, req)
    }

    const results: CancellationResult = {
      success: true,
      refunds_processed: 0,
      refunds_failed: 0,
      failed_refund_details: [],
      notifications_sent: 0,
      total_refunded: 0,
      message: '',
    }

    // Cancel the course first so no new signups slip in during refund processing
    const { error: updateError } = await supabase
      .from('courses')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', body.course_id)

    if (updateError) {
      return errorResponse('Failed to cancel course', 500, req)
    }

    const refundPromises = (signups || []).map(async (signup) => {
      let refunded = false
      let refundErrorMsg = ''
      const shouldRefund =
        !!signup.dintero_transaction_id && signup.payment_status === 'paid'

      if (shouldRefund) {
        const amountOre = Math.round(Number(signup.amount_paid || 0) * 100)
        try {
          await refundTransaction(signup.dintero_transaction_id, amountOre, 'requested_by_customer')
          refunded = true
        } catch (refundError) {
          refundErrorMsg = refundError instanceof Error ? refundError.message : 'Dintero refund failed'
        }
      }

      const signupUpdate: Record<string, unknown> = {
        status: 'course_cancelled',
        payment_status: refunded ? 'refunded' : signup.payment_status,
        updated_at: new Date().toISOString(),
      }
      if (refunded) {
        signupUpdate.refund_amount = signup.amount_paid || 0
        signupUpdate.refunded_at = new Date().toISOString()
      }
      await supabase.from('signups').update(signupUpdate).eq('id', signup.id)

      return {
        refunded,
        amount: refunded ? signup.amount_paid || 0 : 0,
        shouldRefund: !!shouldRefund,
        refundErrorMsg,
        signup_id: signup.id,
        participant_name: signup.participant_name || '',
        participant_email: signup.participant_email || '',
      }
    })

    const refundResults = await Promise.allSettled(refundPromises)
    for (const r of refundResults) {
      if (r.status === 'fulfilled') {
        if (r.value.refunded) {
          results.refunds_processed++
          results.total_refunded += r.value.amount
        } else if (r.value.shouldRefund && !r.value.refunded) {
          results.refunds_failed++
          results.failed_refund_details.push({
            signup_id: r.value.signup_id,
            participant_name: r.value.participant_name,
            participant_email: r.value.participant_email,
            error: r.value.refundErrorMsg,
          })
        }
      } else {
        results.refunds_failed++
        results.failed_refund_details.push({
          signup_id: 'unknown',
          participant_name: 'unknown',
          participant_email: 'unknown',
          error: r.reason instanceof Error ? r.reason.message : 'Promise rejected',
        })
      }
    }

    if (results.refunds_failed > 0) {
      results.success = false
      results.message = `Kurset er avlyst. ${results.refunds_processed} refusjoner behandlet, ${results.refunds_failed} feilet og krever manuell oppfølging.`
    } else {
      results.message = `Kurset er avlyst. ${results.refunds_processed} refusjoner behandlet.`
    }

    return successResponse(results, 200, req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return errorResponse(message, 500, req)
  }
})
