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
import { retrievePaymentIntent, retrieveCharge, refundPaymentIntent, cancelPaymentIntent } from '../_shared/stripe.ts'
import { sendEmail } from '../_shared/email.ts'
import { formatCourseStart } from '../_shared/format.ts'
import { resolveArrangorIdentity } from '../_shared/booking-notifications.ts'

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
    const refundRequested =
      body.refund === true &&
      signup.payment_status !== 'refunded' &&
      !signup.refunded_at

    let refundSucceeded = false
    // Set when an uncaptured Stripe authorization is voided — no captured funds to refund, but the
    // card hold is released as part of the cancellation.
    let authVoided = false
    // A partial refund issued out-of-band leaves the row payment_status='refunded' while still
    // confirmed; refundRequested is false for it (don't double-refund), but the buyer is NOT made
    // whole — surface it for manual handling rather than silently reporting "no refund" (Option A).
    const amountPaidNum = Number(signup.amount_paid || 0)
    const refundAmtNum = Number(signup.refund_amount || 0)
    const partialRemainderPending =
      body.refund === true &&
      refundAmtNum > 0 && amountPaidNum > 0 && refundAmtNum < amountPaidNum

    if (refundRequested && signup.dintero_transaction_id) {
      // Reconcile against the LIVE Dintero transaction state (not cached payment_status) so a
      // retry is idempotent and never double-refunds.
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
    } else if (refundRequested && signup.stripe_payment_intent_id) {
      // Stripe path: reconcile against the live PaymentIntent. succeeded => full refund (reverse
      // transfer + application fee, C6); requires_capture => void the uncaptured authorization so
      // the buyer's card hold is released (no captured funds to refund); canceled/other => nothing
      // to do. The charge.refunded webhook sends the buyer's refund-receipt once the money moves.
      let piStatus: string
      let latestChargeId: string | null = null
      try {
        const pi = await retrievePaymentIntent(signup.stripe_payment_intent_id)
        piStatus = pi.status
        latestChargeId = pi.latest_charge ?? null
      } catch (err) {
        const m = err instanceof Error ? err.message : 'ukjent feil'
        return errorResponse(
          `Kunne ikke kontrollere betalingen hos Stripe (${m}). Påmeldingen er ikke endret – prøv igjen.`,
          502,
          req,
        )
      }

      if (piStatus === 'succeeded') {
        // Reconcile against the live charge: a charge already fully refunded (e.g. a prior attempt
        // whose DB write failed) is an idempotent success, not a refund to repeat (Stripe would
        // reject it → false failure). A partial prior refund is surfaced for manual handling.
        let alreadyRefunded = false
        if (latestChargeId) {
          try {
            const charge = await retrieveCharge(latestChargeId)
            if (charge.amount_refunded >= charge.amount) {
              alreadyRefunded = true
            } else if (charge.amount_refunded > 0) {
              return errorResponse(
                'En delrefusjon er allerede utført hos Stripe. Restbeløpet må refunderes manuelt.',
                409,
                req,
              )
            }
          } catch (_e) { /* charge lookup failed — fall through and attempt the refund */ }
        }
        if (alreadyRefunded) {
          refundSucceeded = true
        } else {
          try {
            await refundPaymentIntent({
              paymentIntentId: signup.stripe_payment_intent_id,
              reverseTransfer: true,
              refundApplicationFee: true,
            })
            refundSucceeded = true
          } catch (err) {
            const m = err instanceof Error ? err.message : 'Stripe refund failed'
            return errorResponse(
              `Refusjon feilet: ${m}. Påmeldingen er ikke endret – prøv igjen.`,
              500,
              req,
            )
          }
        }
      } else if (piStatus === 'requires_capture') {
        // Authorized but never captured — no funds to refund, but the card hold is live. Void it
        // (mirrors cancel-course) so the hold is released as part of the cancellation.
        try {
          await cancelPaymentIntent(signup.stripe_payment_intent_id)
          authVoided = true
        } catch (err) {
          const m = err instanceof Error ? err.message : 'Stripe cancel failed'
          return errorResponse(
            `Kunne ikke annullere reservasjonen hos Stripe (${m}). Påmeldingen er ikke endret – prøv igjen.`,
            500,
            req,
          )
        }
      }
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
    } else if (authVoided) {
      // Uncaptured auth was voided — buyer was never charged. Mark 'failed' (no captured funds);
      // 'voided' is not a member of the payment_status enum (mirrors the webhook capture-failure path).
      updateData.payment_status = 'failed'
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

    // Notify the participant — only on a fresh cancellation WITHOUT a refund.
    // The refund path already emails the buyer: the REFUNDED webhook sends a
    // refund-receipt once the money actually moves, and doubling up here would
    // two-email every refund-cancel. The refund-only path (already-cancelled
    // signup) sends nothing for the same reason. Best-effort: the cancellation
    // is committed; a failed email never fails the request.
    if (!alreadyCancelled && !refundSucceeded && signup.participant_email) {
      try {
        const arrangor = await resolveArrangorIdentity(supabase, course.seller_id)
        if (arrangor) {
          const sendResult = await sendEmail({
            template: 'signup-cancelled',
            to: signup.participant_email,
            // Buyer replies go to the arrangør — the seller of record.
            replyTo: arrangor.contactEmail ?? undefined,
            props: {
              buyerName: signup.participant_name || '',
              studioName: arrangor.name,
              courseTitle: course.title,
              courseStart: formatCourseStart(course.start_date, course.time_schedule) || undefined,
              paymentNote:
                signup.payment_status === 'external'
                  ? `Har du betalt direkte til ${arrangor.name}, ta kontakt med dem om tilbakebetaling.`
                  : undefined,
              arrangorEmail: arrangor.contactEmail ?? undefined,
            },
          })
          if (sendResult.error) {
            console.error('[teacher-cancel-signup] participant email failed', {
              signupId: signup.id,
              error: sendResult.error,
            })
          }
        }
      } catch (err) {
        console.error('[teacher-cancel-signup] participant email failed', err)
      }
    }

    return successResponse({
      success: true,
      refunded: refundSucceeded,
      refund_amount: refundSucceeded && signup.amount_paid ? signup.amount_paid : 0,
      message: refundSucceeded
        ? alreadyCancelled
          ? 'Refusjon behandlet.'
          : 'Påmelding avmeldt. Refusjon vil bli behandlet.'
        : partialRemainderPending
          ? 'Påmelding avmeldt. En delrefusjon er allerede utført — restbeløpet må refunderes manuelt.'
          : 'Påmelding avmeldt.',
    }, 200, req)
  } catch (error) {
    console.error('teacher-cancel-signup error:', error)
    return errorResponse('Noe gikk galt. Prøv igjen.', 500, req)
  }
})
