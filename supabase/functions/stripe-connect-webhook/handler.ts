// Stripe Connect webhook (platform-account events).
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
//   refund.updated / charge.refund.updated   → on a FAILED refund, revert the optimistic
//       'refunded' state (money never moved); the booking stays cancelled, seller re-refunds.
//
// Idempotency: processed_webhook_events.event_id = `stripe:${event.id}` (C5 — Stripe event ids
// are globally unique). The create_signup_if_available RPC adds a second guard (stripe:pi: lock).

import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import {
  verifyStripeSignature,
  capturePaymentIntent,
  cancelPaymentIntent,
  retrieveCharge,
  retrievePaymentIntent,
  type StripeEvent,
  type StripePaymentIntent,
} from '../_shared/stripe.ts'
import { claimEvent, markEventResult, releaseEventClaim } from '../_shared/webhook-claims.ts'
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

// Exported for direct invocation in tests (index.ts wires it to Deno.serve).
export async function handleStripeConnectWebhook(req: Request): Promise<Response> {
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
  const claim = await claimEvent(supabase, eventKey, event.type)
  if (claim === 'duplicate') {
    return new Response(JSON.stringify({ status: 'already_processed' }), { status: 200 })
  }
  if (claim === 'in_flight') {
    // Another isolate holds a fresh claim. Non-2xx so Stripe redelivers — a 200
    // here would permanently drop the event if that isolate was hard-killed.
    return new Response('Event claim in flight', { status: 409 })
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
          p_platform_fee_nok: attempt.platform_fee_nok ?? 0,
          p_service_fee_nok: attempt.service_fee_nok ?? 0,
          p_course_session_id: attempt.course_session_id,
          p_note: attempt.note ?? null,
          p_payment_product: 'stripe',
          p_stripe_payment_intent_id: pi.id,
          // Charge-time label from the attempt — carries the student/
          // pensjonist-discount mark onto the roster's signup row.
          p_ticket_label_override: attempt.ticket_label_snapshot ?? null,
        })

        if (signupRpcError) {
          // Transport/DB error — NOT a capacity reject. Throw to the outer catch (→ 500, releases
          // the claim) so Stripe retries. Do NOT cancel: the auth is good; a transient DB hiccup
          // must not refuse a paid customer.
          throw new Error(`create_signup_if_available failed: ${signupRpcError.message}`)
        }

        if (!signupResult || !signupResult.success) {
          const errorType = (signupResult && signupResult.error) || 'unknown'
          // Transition compat: the pre-20260705190000 RPC returned 'already_signed_up' for a
          // unique-violation on the PI index — the signup WAS minted by the race winner. Treat as
          // idempotent success (do NOT cancel the captured PI). The current RPC returns the
          // already_processed success shape for that case, so this branch is dormant.
          if (errorType === 'already_signed_up') {
            await markEventResult(supabase, eventKey, { type: 'embedded', status: 'already_signed_up_race' })
            return new Response('OK', { status: 200 })
          }
          // Genuine reject — including 'duplicate_signup' (this EMAIL already holds a confirmed
          // booking via a DIFFERENT payment: two-tab double checkout). Cancel the auth so the
          // buyer isn't charged twice and doesn't carry a ~7-day card hold; void the attempt so
          // the sweep never revisits (and never captures) this PI.
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
          // A capture throw does NOT prove the capture failed — a network timeout after Stripe
          // committed it is common. Read the live PI before deciding anything destructive.
          let livePi: { status: string } | null = null
          try { livePi = await retrievePaymentIntent(pi.id) } catch (_e) { livePi = null }

          if (livePi?.status === 'succeeded') {
            // The capture landed — this is the success path, not a failure.
            await supabase.from('payment_attempts').update({ status: 'captured' }).eq('id', attempt.id)
            await deliverBookingConfirmations(supabase, signupResult.signup_id, attempt, amountNok)
            await markEventResult(supabase, eventKey, {
              type: 'embedded', signup_id: signupResult.signup_id, status: 'confirmed',
              note: 'capture_confirmed_on_recheck',
            })
            return new Response('OK', { status: 200 })
          }

          if (!livePi || livePi.status === 'requires_capture') {
            // Truth unknown, or the auth is still capturable after a transient Stripe failure.
            // Never cancel a possibly-captured/still-valid payment here — throw so the claim is
            // released and Stripe retries; the sweep also recovers 'authorized' attempts whose
            // PI is requires_capture.
            throw new Error(`capture failed (${message}); live PI status: ${livePi?.status ?? 'unavailable'}`)
          }

          // Live PI is terminal and not succeeded (e.g. canceled) — the capture truly failed.
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
        // cancel-course/teacher-cancel-signup (refunded_at already set) → that path already
        // wrote the full refund set incl. the right status ('course_cancelled' vs 'cancelled'),
        // so skip the write here or it would clobber that distinction.
        const wasAppInitiated = !!signupBefore?.refunded_at
        if (!wasAppInitiated) {
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
        }

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
        // A signup is minted (confirmed/paid) BEFORE capture. If the PI is
        // canceled — most importantly when the ~7-day authorization expires
        // after sustained capture failures — that "paid" seat was never charged
        // and must not linger on the roster. A canceled PI can never have been
        // captured, so flipping it to cancelled/failed is safe. Mirrors the
        // capture-failure terminal path.
        await supabase
          .from('signups')
          .update({ status: 'cancelled', payment_status: 'failed' })
          .eq('stripe_payment_intent_id', pi.id)
          .eq('status', 'confirmed')
          .eq('payment_status', 'paid')
        await markEventResult(supabase, eventKey, { type: 'voided' })
        return new Response('OK', { status: 200 })
      }

      case 'refund.updated':
      case 'charge.refund.updated': {
        // charge.refunded is the canonical "money moved" event (a refund that SUCCEEDED). Here we
        // only act on a terminal FAILURE: the cancel/refund paths optimistically mark the signup
        // 'refunded' the moment Stripe accepts the refund (2xx), but a refund can later fail — e.g.
        // the connected account lacked balance for the reverse_transfer, or the bank rejected it.
        // succeeded / pending / requires_action are no-ops here (charge.refunded handles success).
        const refund = event.data.object as unknown as {
          id: string; status: string; payment_intent: string | null; charge: string | null; failure_reason?: string | null
        }
        if (refund.status !== 'failed' && refund.status !== 'canceled') {
          await markEventResult(supabase, eventKey, { type: 'refund_update', status: refund.status })
          return new Response('OK', { status: 200 })
        }
        const piId = refund.payment_intent
        if (!piId || !refund.charge) {
          await markEventResult(supabase, eventKey, { type: 'refund_failed', error: 'missing_payment_intent_or_charge' })
          return new Response('OK', { status: 200 })
        }
        // A charge can carry MULTIPLE refunds. Read the LIVE charge: only when NOTHING actually
        // refunded (amount_refunded === 0) do we fully revert the optimistic state — otherwise an
        // earlier refund (e.g. a dashboard partial) succeeded and we must NOT erase its accounting.
        // Throw on a charge-retrieve failure so Stripe retries rather than us guessing the truth.
        let charge
        try {
          charge = await retrieveCharge(refund.charge)
        } catch (err) {
          throw new Error(`refund reconcile: retrieveCharge ${refund.charge} failed: ${err instanceof Error ? err.message : 'unknown'}`)
        }

        if (charge.amount_refunded === 0) {
          // Nothing moved — fully revert the optimistic refunded state so the row reflects reality
          // (money still captured). The booking stays cancelled (independent of the refund); a
          // cancelled-but-'paid' row is the seller's signal to re-issue the refund manually.
          // Idempotent: the payment_status guard makes a replay a no-op.
          const { data: reverted } = await supabase
            .from('signups')
            .update({ payment_status: 'paid', refund_amount: null, refunded_at: null })
            .eq('stripe_payment_intent_id', piId)
            .eq('payment_status', 'refunded')
            .select('id')
          if (reverted && reverted.length > 0) {
            console.error('[stripe-connect-webhook] refund FAILED, nothing refunded — reverted optimistic state; needs manual re-refund', {
              paymentIntentId: piId, refundId: refund.id, reason: refund.failure_reason ?? null,
              signupIds: reverted.map((r) => r.id),
            })
          }
          await markEventResult(supabase, eventKey, {
            type: 'refund_failed', status: refund.status, reason: refund.failure_reason ?? null,
            reverted: reverted?.length ?? 0,
          })
          return new Response('OK', { status: 200 })
        }

        // An earlier refund DID succeed on this charge (this failed one was an additional attempt) —
        // keep the row 'refunded' and reconcile refund_amount to what actually moved; never erase it.
        await supabase
          .from('signups')
          .update({ refund_amount: charge.amount_refunded / 100 })
          .eq('stripe_payment_intent_id', piId)
          .eq('payment_status', 'refunded')
        await markEventResult(supabase, eventKey, {
          type: 'refund_failed_partial_kept', status: refund.status, refunded_ore: charge.amount_refunded,
        })
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
    // and letting the auth expire uncaptured. Terminal rows are preserved. If this release itself
    // fails, the stale-claim reclaim in claimEvent recovers the event on a later retry.
    try {
      await releaseEventClaim(supabase, eventKey)
    } catch (_releaseErr) {
      // Non-fatal — surfacing the original error to Stripe (→ retry) is what matters.
    }
    return new Response(`Webhook Error: ${message}`, { status: 500 })
  }
}
