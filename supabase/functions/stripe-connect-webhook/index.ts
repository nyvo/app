// Stripe Connect webhook (platform-account events).
// Stripe-side counterpart to dintero-webhook (Phase 2 of the Dintero → Stripe migration).
//
// Verifies the Stripe-Signature header against STRIPE_CONNECT_WEBHOOK_SECRET, then routes on
// event.type. Destination charges are platform-owned, so these are "Your account" events.
//
// Events handled:
//   payment_intent.amount_capturable_updated → C1: PI is requires_capture (authorized). Atomic
//       capacity check via create_signup_if_available(p_stripe_payment_intent_id), then capture
//       or cancel. This is the AUTHORIZED equivalent — the ONLY place the signup is minted.
//   payment_intent.succeeded                 → idempotent no-op (our capture's echo).
//   charge.refunded                          → C6: amount_refunded < amount ? partial (keep
//       signup confirmed, record refund) : full (cancel + refund receipt).
//   payment_intent.payment_failed            → mark attempt failed (embedded declines: no signup).
//   payment_intent.canceled                  → mark attempt voided.
//
// Idempotency: processed_webhook_events.event_id = `stripe:${event.id}` (C5 — Stripe event ids
// are globally unique). The create_signup_if_available RPC adds a second guard (stripe:pi: lock).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import {
  verifyStripeSignature,
  capturePaymentIntent,
  cancelPaymentIntent,
  type StripeEvent,
  type StripePaymentIntent,
} from '../_shared/stripe.ts'
import { enqueueNotification } from '../_shared/notifications.ts'
import { sendEmail } from '../_shared/email.ts'
import { formatKroner, formatNorwegianDate, shortBookingId } from '../_shared/format.ts'
import { deliverBookingConfirmations, resolveArrangorIdentity } from '../_shared/booking-notifications.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const webhookSecret = Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET') || ''

// Minimal shape of a Stripe Charge (charge.refunded event object).
interface StripeCharge {
  id: string
  amount: number
  amount_refunded: number
  payment_intent: string | null
}

interface PaymentAttempt {
  id: string
  seller_id: string
  course_id: string
  participant_name: string | null
  participant_email: string | null
  participant_phone: string | null
  note: string | null
  course_session_id: string | null
  ticket_type_id: string | null
  total_price_nok: number | null
}

async function claimEvent(
  supabase: SupabaseClient,
  eventId: string,
  eventType: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('processed_webhook_events')
    .insert({ event_id: eventId, event_type: eventType, result: { status: 'processing' }, processed_at: null })
  if (error) {
    if (error.code === '23505') return false
    // Other errors: allow processing to continue; downstream idempotency is safe.
    return true
  }
  return true
}

async function markEventResult(
  supabase: SupabaseClient,
  eventId: string,
  result: Record<string, unknown>,
): Promise<void> {
  await supabase
    .from('processed_webhook_events')
    .update({ result, processed_at: new Date().toISOString() })
    .eq('event_id', eventId)
}

// Best-effort notification for a capture failure on a freshly-minted signup.
async function notifyPaymentFailed(
  supabase: SupabaseClient,
  signupId: string,
  attempt: PaymentAttempt,
  paymentIntentId: string,
  amountNok: number,
): Promise<void> {
  if (!attempt.participant_name) return
  await enqueueNotification(supabase, {
    type: 'payment.failed',
    sellerId: attempt.seller_id,
    signupId,
    courseId: attempt.course_id,
    transactionId: paymentIntentId,
    buyerName: attempt.participant_name,
    amount: amountNok,
  })
}

function toOre(value: unknown): number | null {
  const amount = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value)
      : NaN
  if (!Number.isFinite(amount)) return null
  return Math.round(amount * 100)
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Verify the signature against the RAW body (Stripe signs the exact bytes).
  const rawBody = await req.text()
  const signatureHeader = req.headers.get('stripe-signature') || req.headers.get('Stripe-Signature')
  if (!signatureHeader) {
    return new Response('Missing Stripe-Signature header', { status: 400 })
  }
  const valid = await verifyStripeSignature({ payload: rawBody, signatureHeader, webhookSecret })
  if (!valid) {
    return new Response('Invalid signature', { status: 401 })
  }

  let event: StripeEvent
  try {
    event = JSON.parse(rawBody) as StripeEvent
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }
  if (!event.id || !event.type) {
    return new Response('Malformed event', { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // C5: globally-unique Stripe event id is the idempotency key.
  const eventKey = `stripe:${event.id}`
  const claimed = await claimEvent(supabase, eventKey, event.type)
  if (!claimed) {
    return new Response(JSON.stringify({ status: 'already_processed' }), { status: 200 })
  }

  try {
    switch (event.type) {
      case 'payment_intent.amount_capturable_updated': {
        const pi = event.data.object as unknown as StripePaymentIntent

        // C3: only act once the PI is actually authorized and capturable.
        if (pi.status !== 'requires_capture') {
          await markEventResult(supabase, eventKey, { type: 'embedded', status: 'not_capturable', pi_status: pi.status })
          return new Response('OK', { status: 200 })
        }

        // C4: the payment_attempts id round-trips in metadata.attempt_id.
        const attemptId = pi.metadata?.attempt_id
        if (!attemptId) {
          await markEventResult(supabase, eventKey, { error: 'missing_attempt_id' })
          return new Response('Missing attempt_id', { status: 400 })
        }

        const { data: attempt } = await supabase
          .from('payment_attempts')
          .select('*')
          .eq('id', attemptId)
          .single()

        if (!attempt) {
          await markEventResult(supabase, eventKey, { error: 'payment_attempt_not_found', attempt_id: attemptId })
          return new Response('Payment attempt not found', { status: 404 })
        }

        // Defensive amount check: the authorized amount must equal what we recorded. A mismatch
        // means tampering or a stale attempt — cancel the auth and void rather than capture.
        const expectedAmountOre = toOre(attempt.total_price_nok)
        if (expectedAmountOre !== pi.amount) {
          console.error('stripe-connect-webhook: amount mismatch', {
            paymentIntentId: pi.id, attemptId, expectedAmountOre, piAmountOre: pi.amount,
          })
          try { await cancelPaymentIntent(pi.id) } catch (_e) { /* non-fatal */ }
          await supabase
            .from('payment_attempts')
            .update({ stripe_payment_intent_id: pi.id, status: 'voided', payment_product: 'stripe' })
            .eq('id', attempt.id)
          await markEventResult(supabase, eventKey, {
            type: 'amount_mismatch', expected_amount_ore: expectedAmountOre, pi_amount_ore: pi.amount,
          })
          return new Response('OK', { status: 200 })
        }

        const amountNok = pi.amount / 100

        // Defensive: every attempt created by create-stripe-connect-session has a ticket_type_id.
        // Guard BEFORE marking the attempt 'authorized', so a malformed attempt never produces a
        // spurious authorized->voided transition in the audit trail.
        if (!attempt.ticket_type_id) {
          try { await cancelPaymentIntent(pi.id) } catch (_e) { /* non-fatal */ }
          await supabase
            .from('payment_attempts')
            .update({ stripe_payment_intent_id: pi.id, status: 'voided', payment_product: 'stripe' })
            .eq('id', attempt.id)
          await markEventResult(supabase, eventKey, { type: 'embedded', error: 'attempt_missing_ticket_type' })
          return new Response('OK', { status: 200 })
        }

        // Persist the authorized PI on the attempt.
        await supabase
          .from('payment_attempts')
          .update({ stripe_payment_intent_id: pi.id, status: 'authorized', payment_product: 'stripe' })
          .eq('id', attempt.id)

        // Atomic capacity check + signup mint (stripe:pi: advisory lock dedupes retries).
        const { data: signupResult, error: signupRpcError } = await supabase.rpc('create_signup_if_available', {
          p_seller_id: attempt.seller_id,
          p_course_id: attempt.course_id,
          p_ticket_type_id: attempt.ticket_type_id,
          p_participant_name: attempt.participant_name,
          p_participant_email: attempt.participant_email,
          p_participant_phone: attempt.participant_phone,
          p_amount_paid: amountNok,
          p_dintero_transaction_id: null,
          p_dintero_session_id: null,
          p_dintero_merchant_reference: null,
          p_course_session_id: attempt.course_session_id,
          p_note: attempt.note ?? null,
          p_payment_product: 'stripe',
          p_stripe_payment_intent_id: pi.id,
        })

        if (signupRpcError) {
          // Transport/DB error — NOT a capacity reject. Throw to the outer catch (→ 500, releases
          // the claim) so Stripe retries. Do NOT cancel: the auth is good; a transient DB hiccup
          // must not refuse a paid customer.
          throw new Error(`create_signup_if_available failed: ${signupRpcError.message}`)
        }

        if (!signupResult || !signupResult.success) {
          const errorType = (signupResult && signupResult.error) || 'unknown'
          // Unique-index race backstop: the RPC's dedup SELECT missed a concurrent INSERT and the
          // partial unique index on signups.stripe_payment_intent_id fired — the signup WAS minted
          // (and captured) by the race winner. Treat as idempotent success: do NOT cancel the PI
          // (it's captured; the cancel would silently fail) or void the attempt. This is the
          // caller invariant documented in the create_signup_if_available migration.
          if (errorType === 'already_signed_up') {
            await markEventResult(supabase, eventKey, { type: 'embedded', status: 'already_signed_up_race' })
            return new Response('OK', { status: 200 })
          }
          // Genuine capacity/validation reject — cancel the auth, void the attempt.
          try { await cancelPaymentIntent(pi.id) } catch (_e) { /* non-fatal */ }
          await supabase.from('payment_attempts').update({ status: 'voided' }).eq('id', attempt.id)
          await markEventResult(supabase, eventKey, { type: 'embedded', status: 'voided', error: errorType })
          return new Response('OK', { status: 200 })
        }

        // Race loser: the signup already exists for this PI (the dedup path won). The winner
        // already captured + fired side effects.
        if (signupResult.status === 'already_processed') {
          await markEventResult(supabase, eventKey, {
            type: 'embedded', signup_id: signupResult.signup_id, status: 'already_processed',
          })
          return new Response('OK', { status: 200 })
        }

        // Signup minted — capture the authorized funds.
        try {
          await capturePaymentIntent(pi.id)
        } catch (captureErr) {
          const message = captureErr instanceof Error ? captureErr.message : 'Unknown'
          // The signup was created by this PI and the buyer was never told it succeeded — cancel
          // it so it stops consuming capacity and the roster isn't confirmed-but-unpaid.
          // This path is terminal (event finalized below, attempt → 'failed', sweep skips it), so
          // release the buyer's authorization hold now instead of letting it sit ~7 days until
          // auto-expiry. Best-effort: if the cancel fails the auth still expires on its own.
          try { await cancelPaymentIntent(pi.id) } catch (_e) { /* non-fatal — auth auto-expires */ }
          await supabase
            .from('signups')
            .update({ payment_status: 'failed', status: 'cancelled' })
            .eq('id', signupResult.signup_id)
          const { error: failUpdateErr } = await supabase
            .from('payment_attempts').update({ status: 'failed' }).eq('id', attempt.id)
          if (failUpdateErr) {
            // Don't finalize the claim with a half-written state — throw so the outer catch
            // releases it and Stripe retries.
            throw new Error(`Failed to mark attempt failed after capture error: ${failUpdateErr.message}`)
          }
          await notifyPaymentFailed(supabase, signupResult.signup_id, attempt, pi.id, amountNok)
          await markEventResult(supabase, eventKey, {
            type: 'embedded', signup_id: signupResult.signup_id, status: 'capture_failed', error: message,
          })
          return new Response('OK', { status: 200 })
        }

        await supabase.from('payment_attempts').update({ status: 'captured' }).eq('id', attempt.id)
        await deliverBookingConfirmations(supabase, signupResult.signup_id, attempt, amountNok)

        await markEventResult(supabase, eventKey, {
          type: 'embedded', signup_id: signupResult.signup_id, status: 'confirmed',
        })
        return new Response('OK', { status: 200 })
      }

      case 'payment_intent.succeeded': {
        // Idempotent echo of our own capture. The signup is already minted + confirmed.
        await markEventResult(supabase, eventKey, { type: 'captured_echo' })
        return new Response('OK', { status: 200 })
      }

      case 'charge.refunded': {
        const charge = event.data.object as unknown as StripeCharge
        const piId = charge.payment_intent
        if (!piId) {
          await markEventResult(supabase, eventKey, { type: 'refund', error: 'missing_payment_intent' })
          return new Response('OK', { status: 200 })
        }

        const isFullRefund = charge.amount_refunded >= charge.amount
        const refundAmountNok = charge.amount_refunded / 100

        const { data: signupBefore } = await supabase
          .from('signups')
          .select('id, seller_id, course_id, participant_name, participant_email, refunded_at, cancelled_at')
          .eq('stripe_payment_intent_id', piId)
          .maybeSingle()

        if (!isFullRefund) {
          // C6 partial: a price adjustment, not a cancellation. The signup KEEPS its spot —
          // refund_implies_cancel only force-cancels full refunds (refund_amount >= amount_paid).
          await supabase
            .from('signups')
            .update({ payment_status: 'refunded', refund_amount: refundAmountNok, refunded_at: new Date().toISOString() })
            .eq('stripe_payment_intent_id', piId)
            // Only touch a signup that still holds its spot — a belated charge.refunded must not
            // overwrite a row already fully-refunded + cancelled.
            .eq('status', 'confirmed')
          await markEventResult(supabase, eventKey, { type: 'refund_partial', refunded_ore: charge.amount_refunded })
          return new Response('OK', { status: 200 })
        }

        // Full refund: cancel the signup + free the spot. wasAppInitiated => owner used
        // cancel-course/teacher-cancel-signup (refunded_at already set) → skip the notification.
        const wasAppInitiated = !!signupBefore?.refunded_at
        await supabase
          .from('signups')
          .update({
            payment_status: 'refunded',
            status: 'cancelled',
            cancelled_at: signupBefore?.cancelled_at ?? new Date().toISOString(),
            refund_amount: refundAmountNok,
            refunded_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', piId)

        if (signupBefore && !wasAppInitiated && signupBefore.participant_name) {
          await enqueueNotification(supabase, {
            type: 'refund.completed',
            sellerId: signupBefore.seller_id,
            signupId: signupBefore.id,
            courseId: signupBefore.course_id,
            refundId: `${piId}:${charge.amount_refunded}`,
            buyerName: signupBefore.participant_name,
            amount: refundAmountNok,
          })
        }

        // Buyer refund-receipt email (canonical "money moved" event). Best-effort.
        if (signupBefore?.participant_email && signupBefore.participant_name) {
          const [{ data: course }, arrangor] = await Promise.all([
            supabase.from('courses').select('title').eq('id', signupBefore.course_id).maybeSingle(),
            resolveArrangorIdentity(supabase, signupBefore.seller_id),
          ])
          if (course?.title && arrangor) {
            const result = await sendEmail({
              template: 'refund-receipt',
              to: signupBefore.participant_email,
              replyTo: arrangor.contactEmail ?? undefined,
              props: {
                buyerName: signupBefore.participant_name,
                studioName: arrangor.name,
                courseTitle: course.title,
                amount: formatKroner(refundAmountNok),
                refundDate: formatNorwegianDate(new Date()),
                bookingId: shortBookingId(signupBefore.id),
                arrangorOrgNumber: arrangor.orgNumber ?? undefined,
                arrangorEmail: arrangor.contactEmail ?? undefined,
              },
            })
            if (result.error) {
              console.error('[refund-receipt email] send failed', { signupId: signupBefore.id, error: result.error })
            }
          }
        }

        await markEventResult(supabase, eventKey, { type: 'refund_full' })
        return new Response('OK', { status: 200 })
      }

      case 'payment_intent.payment_failed': {
        // Embedded declines never reach a signup — just mark the attempt. Declined cards are
        // normal customer experience, not money-at-risk, so no notification.
        const pi = event.data.object as unknown as StripePaymentIntent
        const attemptId = pi.metadata?.attempt_id
        if (attemptId) {
          // Only flip a still-pending attempt. A decline is meaningful only before authorization;
          // a stale/out-of-order payment_failed must never overwrite an 'authorized' or 'captured'
          // attempt (Stripe does not guarantee event ordering). Mirrors the canceled handler's guard.
          await supabase
            .from('payment_attempts')
            .update({ status: 'failed' })
            .eq('id', attemptId)
            .in('status', ['pending'])
        }
        await markEventResult(supabase, eventKey, { type: 'payment_failed' })
        return new Response('OK', { status: 200 })
      }

      case 'payment_intent.canceled': {
        // Only transition non-terminal attempts, so a stale cancel can't flip a captured row.
        const pi = event.data.object as unknown as StripePaymentIntent
        const attemptId = pi.metadata?.attempt_id
        if (attemptId) {
          await supabase
            .from('payment_attempts')
            .update({ status: 'voided' })
            .eq('id', attemptId)
            .in('status', ['pending', 'authorized'])
        }
        await markEventResult(supabase, eventKey, { type: 'voided' })
        return new Response('OK', { status: 200 })
      }

      default: {
        await markEventResult(supabase, eventKey, { type: 'unhandled', event_type: event.type })
        return new Response('OK', { status: 200 })
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown'
    // Release the claim if work never reached a terminal result (processed_at still null), so
    // Stripe's retry re-runs the capture path instead of hitting the already_processed fast-path
    // and letting the auth expire uncaptured. Terminal rows are preserved.
    try {
      await supabase
        .from('processed_webhook_events')
        .delete()
        .eq('event_id', eventKey)
        .is('processed_at', null)
    } catch (_releaseErr) {
      // Non-fatal — surfacing the original error to Stripe (→ retry) is what matters.
    }
    return new Response(`Webhook Error: ${message}`, { status: 500 })
  }
})
