// scripts/smoke/tests/a2-declined-card.mjs
// Checklist: A2 — Declined card (4000000000000002 ≡ Stripe's pm_card_chargeDeclined
// test payment-method token). Verify: decline surfaced, no signup, no charge.
//
// Requires: SMOKE_SELLER_SLUG, SMOKE_PAID_COURSE_ID, SMOKE_PAID_TICKET_TYPE_ID.

import { pollUntil } from '../lib/poll.mjs'

export const meta = { id: 'A2', title: 'Declined card surfaces cleanly, no signup/charge', owner: '🤖' }

export async function run(ctx) {
  const courseId = ctx.fixtures.paidCourseId()
  const organizationSlug = ctx.fixtures.sellerSlug()
  const ticketTypeId = ctx.fixtures.paidTicketTypeId()
  const email = ctx.mailosaur.mint('a2-declined')

  const sessionRes = await ctx.callFunction('create-stripe-connect-session', {
    body: {
      courseId,
      organizationSlug,
      ticketTypeId,
      customerEmail: email,
      customerName: 'Smoke Test A2',
      customerPhone: '99999999',
    },
  })
  if (sessionRes.status !== 200 || !sessionRes.json?.paymentIntentId) {
    return { pass: false, details: `create-stripe-connect-session failed: ${sessionRes.status} ${sessionRes.text}` }
  }
  const { paymentIntentId, attemptId } = sessionRes.json
  ctx.manifest.record('payment_attempt', attemptId, paymentIntentId)
  ctx.manifest.record('payment_intent', paymentIntentId, paymentIntentId)

  let declineSurfaced = false
  let declineMessage = ''
  try {
    ctx.stripeCli.confirmPaymentIntent(paymentIntentId, 'pm_card_chargeDeclined')
  } catch (err) {
    declineMessage = err.message
    declineSurfaced = /declin|card_error/i.test(err.message)
  }
  if (!declineSurfaced) {
    return {
      pass: false,
      details: `Expected the confirm call to surface a decline; got: ${declineMessage || '(no error thrown — card was NOT declined)'}`,
    }
  }

  const service = ctx.db.service()
  const attempt = await pollUntil(
    async () => {
      const { data } = await service.from('payment_attempts').select('status').eq('id', attemptId).maybeSingle()
      return data && data.status !== 'pending' ? data : null
    },
    { label: `payment_attempts(${attemptId}).status leaving 'pending'`, timeoutMs: 30_000 },
  ).catch(() => null)

  if (attempt && attempt.status === 'captured') {
    return { pass: false, details: `payment_attempts.status is 'captured' despite a declined card — money moved!` }
  }

  const { data: signup } = await service
    .from('signups')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()
  if (signup) {
    ctx.manifest.record('signup', signup.id)
    return { pass: false, details: `A signup (${signup.id}) was minted for a declined PaymentIntent — no signup should exist.` }
  }

  return {
    pass: true,
    details: `Decline surfaced ("${declineMessage.slice(0, 120)}"), attempt status=${attempt?.status ?? 'pending (webhook not yet delivered)'}, no signup minted`,
  }
}
