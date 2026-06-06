// Teacher-initiated course cancellation with bulk Dintero refunds.
//
// Idempotency: safe to re-run on an already-cancelled course. Each invocation
// re-scans every signup linked to a Dintero transaction and finishes whatever
// state transition is still needed (refund / void / no-op). That matters
// because the first call can fail mid-batch — e.g. a Dintero refund times out
// for one buyer — leaving the rest unprocessed. Re-running picks up where the
// previous call left off without double-refunding or stomping done rows.
//
// Per-signup routing is driven by the live Dintero transaction status, not
// our cached `payment_status`, so we correctly handle signups stuck in
// AUTHORIZED-but-not-CAPTURED (e.g. from an earlier capture failure) by
// voiding instead of attempting a refund on a non-captured authorization.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  verifyAuth,
  verifyOrgMembership,
  handleCors,
  errorResponse,
  successResponse,
} from '../_shared/auth.ts'
import {
  getTransaction,
  refundTransaction,
  voidTransaction,
} from '../_shared/dintero.ts'

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
  voids_processed: number
  notifications_sent: number
  failed_refund_details: FailedRefundDetail[]
  total_refunded: number
  already_handled: number
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

    // seller_members.role is the single studio owner/operator role — always 'owner'
    // ('admin' is a legacy enum value, blocked by a DB CHECK; no 'teacher' role).
    // The 'admin' entry below is retained harmlessly as legacy.
    const authzResult = await verifyOrgMembership(authResult.userId!, course.seller_id, [
      'owner',
      'admin',
    ])
    if (!authzResult.authorized) {
      return errorResponse('You do not have permission to cancel this course', 403, req)
    }

    // Set the cancelled flag (idempotent — re-write is a no-op). Done BEFORE
    // refunds so no new signups can slip in during processing.
    if (course.status !== 'cancelled') {
      const { error: updateError } = await supabase
        .from('courses')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', body.course_id)

      if (updateError) {
        return errorResponse('Failed to cancel course', 500, req)
      }
    }

    // Pull every signup tied to this course in a state that may still need
    // money handling. `confirmed` = first cancel pass. `course_cancelled` =
    // a previous pass already flipped status but possibly failed on the
    // Dintero side; we re-check those too.
    const { data: signups, error: signupsError } = await supabase
      .from('signups')
      .select('*')
      .eq('course_id', body.course_id)
      .in('status', ['confirmed', 'course_cancelled'])

    if (signupsError) {
      return errorResponse('Failed to fetch signups', 500, req)
    }

    const results: CancellationResult = {
      success: true,
      refunds_processed: 0,
      refunds_failed: 0,
      voids_processed: 0,
      notifications_sent: 0,
      failed_refund_details: [],
      total_refunded: 0,
      already_handled: 0,
      message: '',
    }

    const refundPromises = (signups || []).map(async (signup) => {
      const participantName = signup.participant_name || ''
      const participantEmail = signup.participant_email || ''
      const transactionId = signup.dintero_transaction_id as string | null

      // Free or paymentless signup — just mark cancelled.
      if (!transactionId) {
        await supabase
          .from('signups')
          .update({
            status: 'course_cancelled',
            cancelled_at: signup.cancelled_at ?? new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', signup.id)
        return { kind: 'no_payment', signup_id: signup.id }
      }

      // Already fully handled on a previous run.
      if (signup.refunded_at || signup.payment_status === 'refunded') {
        return { kind: 'already_handled', signup_id: signup.id }
      }

      // Source of truth is the live Dintero transaction state, not our cached
      // payment_status. Handles AUTHORIZED-but-not-CAPTURED (capture failure
      // mid-flight) correctly — those need void, not refund.
      let txStatus: string
      try {
        const tx = await getTransaction(transactionId)
        txStatus = tx.status
      } catch (err) {
        return {
          kind: 'lookup_failed',
          signup_id: signup.id,
          participant_name: participantName,
          participant_email: participantEmail,
          error: err instanceof Error ? err.message : 'getTransaction failed',
        }
      }

      const amountOre = Math.round(Number(signup.amount_paid || 0) * 100)

      if (txStatus === 'CAPTURED' || txStatus === 'PARTIALLY_CAPTURED') {
        try {
          await refundTransaction(transactionId, amountOre, 'requested_by_customer')
          await supabase
            .from('signups')
            .update({
              status: 'course_cancelled',
              cancelled_at: signup.cancelled_at ?? new Date().toISOString(),
              payment_status: 'refunded',
              refund_amount: signup.amount_paid || 0,
              refunded_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', signup.id)
          return { kind: 'refunded', signup_id: signup.id, amount: signup.amount_paid || 0 }
        } catch (err) {
          return {
            kind: 'refund_failed',
            signup_id: signup.id,
            participant_name: participantName,
            participant_email: participantEmail,
            error: err instanceof Error ? err.message : 'Dintero refund failed',
          }
        }
      }

      if (txStatus === 'AUTHORIZED') {
        try {
          await voidTransaction(transactionId)
          await supabase
            .from('signups')
            .update({
              status: 'course_cancelled',
              cancelled_at: signup.cancelled_at ?? new Date().toISOString(),
              payment_status: 'voided',
              updated_at: new Date().toISOString(),
            })
            .eq('id', signup.id)
          return { kind: 'voided', signup_id: signup.id }
        } catch (err) {
          return {
            kind: 'void_failed',
            signup_id: signup.id,
            participant_name: participantName,
            participant_email: participantEmail,
            error: err instanceof Error ? err.message : 'Dintero void failed',
          }
        }
      }

      // REFUNDED / AUTHORIZATION_VOIDED / FAILED / DECLINED — nothing to do at
      // Dintero. Just make sure the signup row is in a terminal state.
      await supabase
        .from('signups')
        .update({
          status: 'course_cancelled',
          cancelled_at: signup.cancelled_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', signup.id)
      return { kind: 'no_action_needed', signup_id: signup.id }
    })

    const refundResults = await Promise.allSettled(refundPromises)
    for (const r of refundResults) {
      if (r.status !== 'fulfilled') {
        results.refunds_failed++
        results.failed_refund_details.push({
          signup_id: 'unknown',
          participant_name: 'unknown',
          participant_email: 'unknown',
          error: r.reason instanceof Error ? r.reason.message : 'Promise rejected',
        })
        continue
      }

      const v = r.value
      switch (v.kind) {
        case 'refunded':
          results.refunds_processed++
          results.total_refunded += (v as { amount: number }).amount
          break
        case 'voided':
          results.voids_processed++
          break
        case 'already_handled':
          results.already_handled++
          break
        case 'refund_failed':
        case 'void_failed':
        case 'lookup_failed': {
          results.refunds_failed++
          const f = v as {
            signup_id: string
            participant_name: string
            participant_email: string
            error: string
          }
          results.failed_refund_details.push({
            signup_id: f.signup_id,
            participant_name: f.participant_name,
            participant_email: f.participant_email,
            error: f.error,
          })
          break
        }
        // no_payment / no_action_needed — nothing to count
      }
    }

    if (results.refunds_failed > 0) {
      results.success = false
      results.message =
        `Kurset er avlyst. ${results.refunds_processed} refusjoner behandlet, ` +
        `${results.refunds_failed} feilet og krever manuell oppfølging.`
    } else {
      results.message = `Kurset er avlyst. ${results.refunds_processed} refusjoner behandlet.`
    }

    return successResponse(results, 200, req)
  } catch (error) {
    console.error('cancel-course error:', error)
    return errorResponse('Noe gikk galt. Prøv igjen.', 500, req)
  }
})
