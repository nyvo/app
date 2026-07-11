// scripts/smoke/tests/a1-happy-path.mjs
// Checklist: A1 — Paid guest booking happy path.
//
// This is the API-driven variant only: create-stripe-connect-session →
// confirm the PaymentIntent with pm_card_visa via the Stripe CLI → wait for
// stripe-connect-webhook to mint + confirm the signup. It does NOT drive the
// browser checkout UI or Stripe Elements — that variant (typing a card into
// the real embedded form) is the Playwright agent's job per the checklist
// ownership split (🔧, needs a running dev server).
//
// Requires: SMOKE_SELLER_SLUG, SMOKE_PAID_COURSE_ID, SMOKE_PAID_TICKET_TYPE_ID
// (a Stripe test webhook endpoint must already be configured to forward to
// the deployed functions URL — this test does not run `stripe listen`).

import { pollUntil } from '../lib/poll.mjs'

export const meta = { id: 'A1', title: 'Paid guest booking happy path (API-driven)', owner: '🔧' }

export async function run(ctx) {
  const courseId = ctx.fixtures.paidCourseId()
  const organizationSlug = ctx.fixtures.sellerSlug()
  const ticketTypeId = ctx.fixtures.paidTicketTypeId()
  const email = ctx.mailosaur.mint('a1-happy-path')

  const sessionRes = await ctx.callFunction('create-stripe-connect-session', {
    body: {
      courseId,
      organizationSlug,
      ticketTypeId,
      customerEmail: email,
      customerName: 'Smoke Test A1',
      customerPhone: '99999999',
    },
  })
  if (sessionRes.status !== 200 || !sessionRes.json?.paymentIntentId) {
    return { pass: false, details: `create-stripe-connect-session failed: ${sessionRes.status} ${sessionRes.text}` }
  }
  const { paymentIntentId, attemptId } = sessionRes.json
  ctx.manifest.record('payment_attempt', attemptId, paymentIntentId)
  ctx.manifest.record('payment_intent', paymentIntentId, paymentIntentId)

  const confirmed = ctx.stripeCli.confirmPaymentIntent(paymentIntentId, 'pm_card_visa')
  if (!['requires_capture', 'succeeded', 'processing'].includes(confirmed.status)) {
    return { pass: false, details: `Unexpected PI status after confirm: ${confirmed.status}` }
  }

  const service = ctx.db.service()
  const attempt = await pollUntil(
    async () => {
      const { data } = await service.from('payment_attempts').select('status').eq('id', attemptId).maybeSingle()
      return data && ['captured', 'failed', 'voided'].includes(data.status) ? data : null
    },
    { label: `payment_attempts(${attemptId}).status settling`, timeoutMs: 45_000 },
  )
  if (attempt.status !== 'captured') {
    return { pass: false, details: `Expected attempt.status='captured', got '${attempt.status}'` }
  }

  const { data: signup, error: signupErr } = await service
    .from('signups')
    .select('id, status, payment_status, amount_paid')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()
  if (signupErr || !signup) {
    return { pass: false, details: `No signup row minted for PI ${paymentIntentId}: ${signupErr?.message ?? 'not found'}` }
  }
  ctx.manifest.record('signup', signup.id)

  if (signup.status !== 'confirmed' || signup.payment_status !== 'paid') {
    return {
      pass: false,
      details: `Signup minted but wrong state: status=${signup.status} payment_status=${signup.payment_status}`,
    }
  }

  return {
    pass: true,
    details: `signup ${signup.id} confirmed+paid, amount_paid=${signup.amount_paid}, attempt ${attemptId} captured`,
  }
}
