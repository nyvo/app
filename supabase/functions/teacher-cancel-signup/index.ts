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
import { getTransaction, refundTransaction } from '../_shared/dintero.ts'

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
      return errorResponse(authResult.error || 'Unauthorized', 401, req)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = (await req.json()) as TeacherCancelRequest

    if (!body.signup_id) {
      return errorResponse('Missing signup_id', 400, req)
    }

    const { data: signup, error: signupError } = await supabase
      .from('signups')
      .select(`
        *,
        course:courses(id, title, start_date, time_schedule, location, seller_id)
      `)
      .eq('id', body.signup_id)
      .single()

    if (signupError || !signup) {
      return errorResponse('Signup not found', 404, req)
    }

    const course = signup.course as {
      id: string
      title: string
      start_date: string
      time_schedule: string
      location: string
      seller_id: string
    }

    // seller_members.role is the single studio owner/operator role — always 'owner'
    // ('admin' is a legacy enum value, blocked by a DB CHECK; no 'teacher' role).
    // The 'admin' entry below is retained harmlessly as legacy.
    const authzResult = await verifyOrgMembership(authResult.userId!, course.seller_id, [
      'owner',
      'admin',
    ])
    if (!authzResult.authorized) {
      return errorResponse('You do not have permission to cancel signups for this seller', 403, req)
    }

    // Allow refund-only on already-cancelled signups (studio decides to refund
    // after the fact). The signup's `status` doesn't change in that path —
    // only the payment state moves to 'refunded'. Reject if the caller asked
    // for a plain cancel on something already cancelled (nothing to do).
    const alreadyCancelled = signup.status === 'cancelled' || signup.status === 'course_cancelled'
    const refundOnly = alreadyCancelled && body.refund === true

    if (alreadyCancelled && !refundOnly) {
      return errorResponse('Signup is already cancelled', 400, req)
    }

    // Reconcile against the LIVE Dintero transaction state (mirrors cancel-course)
    // instead of trusting the cached payment_status, so a retry is idempotent and
    // never double-refunds: a transaction that's already REFUNDED (e.g. from a
    // prior attempt whose DB write failed) is just reconciled, not refunded again.
    // We do not rely on Dintero's over-refund guard alone.
    const wantsRefund =
      body.refund === true &&
      !!signup.dintero_transaction_id &&
      signup.payment_status !== 'refunded' &&
      !signup.refunded_at

    let refundSucceeded = false

    if (wantsRefund) {
      let txStatus: string
      try {
        txStatus = (await getTransaction(signup.dintero_transaction_id)).status
      } catch (err) {
        const m = err instanceof Error ? err.message : 'ukjent feil'
        return errorResponse(
          `Kunne ikke kontrollere betalingen hos Dintero (${m}). Påmeldingen er ikke endret – prøv igjen.`,
          502,
          req,
        )
      }

      if (txStatus === 'REFUNDED' || txStatus === 'PARTIALLY_REFUNDED') {
        // Already refunded at Dintero — reconcile the signup, don't refund again.
        refundSucceeded = true
      } else if (txStatus === 'CAPTURED' || txStatus === 'PARTIALLY_CAPTURED') {
        const amountOre = Math.round(Number(signup.amount_paid || 0) * 100)
        try {
          await refundTransaction(signup.dintero_transaction_id, amountOre, 'requested_by_customer')
          refundSucceeded = true
        } catch (err) {
          const m = err instanceof Error ? err.message : 'Dintero refund failed'
          return errorResponse(
            `Refusjon feilet: ${m}. Påmeldingen er ikke endret – prøv igjen.`,
            500,
            req,
          )
        }
      }
      // AUTHORIZED / AUTHORIZATION_VOIDED / FAILED / DECLINED: no captured funds to
      // return — proceed with the cancellation without a refund.
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    // Only flip status when this is a fresh cancellation. Refund-only on an
    // already-cancelled signup keeps the existing status and preserves the
    // original cancelled_at.
    if (!alreadyCancelled) {
      updateData.status = 'cancelled'
      updateData.cancelled_at = new Date().toISOString()
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
      return errorResponse('Failed to update signup status', 500, req)
    }

    return successResponse({
      success: true,
      refunded: refundSucceeded,
      refund_amount: refundSucceeded && signup.amount_paid ? signup.amount_paid : 0,
      message: refundSucceeded
        ? alreadyCancelled
          ? 'Refusjon behandlet.'
          : 'Påmelding avmeldt. Refusjon vil bli behandlet.'
        : 'Påmelding avmeldt.',
    }, 200, req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return errorResponse(message, 500, req)
  }
})
