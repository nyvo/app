// scripts/smoke/tests/a9-teacher-cancel-refund.mjs
// Checklist: A9 — Refund via teacher-cancel-signup. Full refund at Stripe,
// status correct, receipt email, retry does not double-refund.
//
// Requires: SMOKE_SELLER_SLUG, SMOKE_PAID_COURSE_ID, SMOKE_PAID_TICKET_TYPE_ID,
// SMOKE_SELLER_OWNER_EMAIL/PASSWORD (must own the seller behind SMOKE_SELLER_SLUG —
// teacher-cancel-signup is JWT-gated + verifyOrgMembership(['owner'])).

import { pollUntil } from '../lib/poll.mjs'

export const meta = { id: 'A9', title: 'teacher-cancel-signup refund — full refund, no double-refund on retry', owner: '🤖' }

export async function run(ctx) {
  const courseId = ctx.fixtures.paidCourseId()
  const organizationSlug = ctx.fixtures.sellerSlug()
  const ticketTypeId = ctx.fixtures.paidTicketTypeId()
  const email = ctx.mailosaur.mint('a9-teacher-cancel')
  const authHeaders = await ctx.sellerOwnerAuthHeader() // fail fast if seller creds unset

  // 1. A real captured booking to cancel+refund.
  const sessionRes = await ctx.callFunction('create-stripe-connect-session', {
    body: { courseId, organizationSlug, ticketTypeId, customerEmail: email, customerName: 'Smoke Test A9', customerPhone: '99999999' },
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
  const { data: signup } = await service.from('signups').select('id, amount_paid').eq('stripe_payment_intent_id', paymentIntentId).maybeSingle()
  if (!signup) return { pass: false, details: 'Signup was not minted — cannot test the cancel/refund path' }
  ctx.manifest.record('signup', signup.id)

  // 2. First cancel+refund call.
  const cancelRes = await ctx.callFunction('teacher-cancel-signup', {
    headers: authHeaders,
    body: { signup_id: signup.id, refund: true, reason: 'smoke test A9' },
  })
  if (cancelRes.status !== 200 || cancelRes.json?.refunded !== true) {
    return { pass: false, details: `teacher-cancel-signup (first call) failed: ${cancelRes.status} ${cancelRes.text}` }
  }

  const { data: cancelled } = await service
    .from('signups')
    .select('status, payment_status, refund_amount, refunded_at')
    .eq('id', signup.id)
    .maybeSingle()
  if (cancelled?.status !== 'cancelled' || cancelled?.payment_status !== 'refunded') {
    return { pass: false, details: `Unexpected post-cancel state: ${JSON.stringify(cancelled)}` }
  }
  if (Number(cancelled.refund_amount) !== Number(signup.amount_paid)) {
    return { pass: false, details: `refund_amount (${cancelled.refund_amount}) != amount_paid (${signup.amount_paid})` }
  }

  const pi = ctx.stripeCli.retrievePaymentIntent(paymentIntentId)
  const chargeAfterFirst = pi.latest_charge ? ctx.stripeCli.retrieveCharge(pi.latest_charge) : null
  if (!chargeAfterFirst || chargeAfterFirst.amount_refunded !== chargeAfterFirst.amount) {
    return { pass: false, details: `Charge not fully refunded at Stripe after first cancel: ${JSON.stringify(chargeAfterFirst)}` }
  }

  // 3. Retry: refund-only on an already-cancelled signup must NOT double-refund.
  const retryRes = await ctx.callFunction('teacher-cancel-signup', {
    headers: authHeaders,
    body: { signup_id: signup.id, refund: true },
  })
  if (retryRes.status !== 200) {
    return { pass: false, details: `teacher-cancel-signup retry failed: ${retryRes.status} ${retryRes.text}` }
  }
  if (retryRes.json?.refunded === true) {
    // Only acceptable if Stripe's own amount_refunded still matches a SINGLE refund.
    const chargeAfterRetry = pi.latest_charge ? ctx.stripeCli.retrieveCharge(pi.latest_charge) : null
    if (chargeAfterRetry && chargeAfterRetry.amount_refunded > chargeAfterFirst.amount_refunded) {
      return { pass: false, details: `DOUBLE REFUND: amount_refunded grew from ${chargeAfterFirst.amount_refunded} to ${chargeAfterRetry.amount_refunded}` }
    }
  }

  const chargeAfterRetry = pi.latest_charge ? ctx.stripeCli.retrieveCharge(pi.latest_charge) : null
  if (chargeAfterRetry && chargeAfterRetry.amount_refunded !== chargeAfterFirst.amount_refunded) {
    return { pass: false, details: `Refunded amount changed on retry: ${chargeAfterFirst.amount_refunded} -> ${chargeAfterRetry.amount_refunded}` }
  }

  return {
    pass: true,
    details: `Full refund (${chargeAfterFirst.amount_refunded} øre) applied once; retry was a safe no-op (refunded=${retryRes.json?.refunded})`,
  }
}
