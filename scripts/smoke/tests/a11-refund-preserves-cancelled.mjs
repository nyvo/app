// scripts/smoke/tests/a11-refund-preserves-cancelled.mjs
// Checklist: A11 — `charge.refunded` preserves `course_cancelled`. App-refund
// (via cancel-course) then a redelivered `charge.refunded` webhook must leave
// status at 'course_cancelled' (buyer sees "Avlyst"), not get rewritten to
// the generic 'cancelled'. Regression test for the exact bug fixed in commit
// "charge.refunded webhook no longer clobbers course_cancelled status".
//
// DESTRUCTIVE: uses its own throwaway course (cancel-course is irreversible) —
// separate from A10's fixture so the two tests don't collide.
//
// Requires: SMOKE_SELLER_SLUG, SMOKE_CANCELLABLE_COURSE_ID_A11,
// SMOKE_CANCELLABLE_TICKET_TYPE_ID_A11, SMOKE_SELLER_OWNER_EMAIL/PASSWORD.

import { pollUntil } from '../lib/poll.mjs'

export const meta = { id: 'A11', title: 'charge.refunded redelivery preserves course_cancelled status', owner: '🤖' }

export async function run(ctx) {
  const courseId = ctx.fixtures.cancellableCourseIdA11()
  const organizationSlug = ctx.fixtures.sellerSlug()
  const ticketTypeId = ctx.fixtures.cancellableTicketTypeIdA11()
  const authHeaders = await ctx.sellerOwnerAuthHeader()
  const email = ctx.mailosaur.mint('a11-refund-preserves')

  const sessionRes = await ctx.callFunction('create-stripe-connect-session', {
    body: { courseId, organizationSlug, ticketTypeId, customerEmail: email, customerName: 'Smoke Test A11', customerPhone: '99999999' },
  })
  if (sessionRes.status !== 200 || !sessionRes.json?.paymentIntentId) {
    return { pass: false, details: `create-stripe-connect-session failed: ${sessionRes.status} ${sessionRes.text}` }
  }
  const { paymentIntentId, attemptId } = sessionRes.json
  ctx.manifest.record('payment_attempt', attemptId, paymentIntentId)
  ctx.manifest.record('payment_intent', paymentIntentId, paymentIntentId)
  ctx.stripeCli.confirmPaymentIntent(paymentIntentId, 'pm_card_visa')

  const service = ctx.db.service()
  await pollUntil(
    async () => {
      const { data } = await service.from('payment_attempts').select('status').eq('id', attemptId).maybeSingle()
      return data?.status === 'captured' ? data : null
    },
    { label: `payment_attempts(${attemptId}) capturing`, timeoutMs: 45_000 },
  )
  const { data: signup } = await service.from('signups').select('id').eq('stripe_payment_intent_id', paymentIntentId).maybeSingle()
  if (!signup) return { pass: false, details: 'Signup was not minted' }
  ctx.manifest.record('signup', signup.id)

  // App-initiated refund via cancel-course — sets status='course_cancelled',
  // payment_status='refunded', refunded_at=now. This ALSO fires a real
  // charge.refunded webhook delivery from Stripe (the first, natural one).
  const cancelRes = await ctx.callFunction('cancel-course', {
    headers: authHeaders,
    body: { course_id: courseId, reason: 'smoke test A11', notify_participants: false },
  })
  if (cancelRes.status !== 200 || !cancelRes.json?.success || cancelRes.json.refunds_failed > 0) {
    return { pass: false, details: `cancel-course failed: ${cancelRes.status} ${cancelRes.text}` }
  }

  const afterCancel = await pollUntil(
    async () => {
      const { data } = await service.from('signups').select('status, payment_status, refunded_at').eq('id', signup.id).maybeSingle()
      return data?.status === 'course_cancelled' ? data : null
    },
    { label: 'signup reaching course_cancelled after cancel-course', timeoutMs: 30_000 },
  )
  if (afterCancel.payment_status !== 'refunded' || !afterCancel.refunded_at) {
    return { pass: false, details: `Unexpected state right after cancel-course: ${JSON.stringify(afterCancel)}` }
  }

  // Find + redeliver the SAME charge.refunded event Stripe already sent for this PI.
  const recentEvents = ctx.stripeCli.listEvents('charge.refunded', 15)
  const matchingEvent = recentEvents.find((event) => event.data?.object?.payment_intent === paymentIntentId)
  if (!matchingEvent) {
    return { pass: false, details: 'Could not find the charge.refunded event for this PI via `stripe events list` — cannot redeliver' }
  }
  const targetEndpoint = ctx.stripeCli.findWebhookEndpoint('stripe-connect-webhook')
  ctx.stripeCli.resendEvent(matchingEvent.id, targetEndpoint?.id)

  await new Promise((resolve) => setTimeout(resolve, 5_000))

  const { data: afterResend } = await service
    .from('signups')
    .select('status, payment_status, refund_amount')
    .eq('id', signup.id)
    .maybeSingle()
  if (afterResend?.status !== 'course_cancelled') {
    return { pass: false, details: `charge.refunded redelivery clobbered status to '${afterResend?.status}' (expected 'course_cancelled' to survive)` }
  }
  if (afterResend.payment_status !== 'refunded') {
    return { pass: false, details: `payment_status changed to '${afterResend.payment_status}' after redelivery` }
  }

  return {
    pass: true,
    details: `status stayed 'course_cancelled' (payment_status='refunded') after redelivering charge.refunded event ${matchingEvent.id}`,
  }
}
