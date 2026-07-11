// scripts/smoke/tests/a7-webhook-idempotency.mjs
// Checklist: A7 — Webhook idempotency: same event delivered twice → processed
// once, no double email.
//
// Design note / deliberate reinterpretation of the checklist wording: `stripe
// trigger <event>` always mints a NEW event id on every call, so "trigger the
// same event twice" can never exercise our actual dedup key
// (processed_webhook_events.event_id = the Stripe event id — see
// _shared/webhook-claims.ts). The correct tool for redelivering the SAME
// event id is `stripe events resend <id>`. This test runs a real booking
// (like A1), captures the event id Stripe used for the
// payment_intent.amount_capturable_updated delivery that minted the signup,
// then resends that exact event id twice and asserts: the signup is
// unchanged, no second order-confirm email lands in Mailosaur.
//
// Requires: SMOKE_SELLER_SLUG, SMOKE_PAID_COURSE_ID, SMOKE_PAID_TICKET_TYPE_ID.

import { pollUntil } from '../lib/poll.mjs'

export const meta = { id: 'A7', title: 'Webhook idempotency — same event id delivered twice', owner: '🤖' }

export async function run(ctx) {
  const courseId = ctx.fixtures.paidCourseId()
  const organizationSlug = ctx.fixtures.sellerSlug()
  const ticketTypeId = ctx.fixtures.paidTicketTypeId()
  const email = ctx.mailosaur.mint('a7-webhook-idem')

  const sessionRes = await ctx.callFunction('create-stripe-connect-session', {
    body: {
      courseId,
      organizationSlug,
      ticketTypeId,
      customerEmail: email,
      customerName: 'Smoke Test A7',
      customerPhone: '99999999',
    },
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

  const { data: signup } = await service
    .from('signups')
    .select('id, confirmation_sent_at')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()
  if (!signup) return { pass: false, details: 'Signup was not minted — cannot test webhook idempotency on it' }
  ctx.manifest.record('signup', signup.id)

  // Find the specific delivered event id for THIS PaymentIntent.
  const recentEvents = ctx.stripeCli.listEvents('payment_intent.amount_capturable_updated', 10)
  const matchingEvent = recentEvents.find((event) => event.data?.object?.id === paymentIntentId)
  if (!matchingEvent) {
    return {
      pass: false,
      details: 'Could not find the amount_capturable_updated event for this PI via `stripe events list` — cannot resend',
    }
  }

  const targetEndpoint = ctx.stripeCli.findWebhookEndpoint('stripe-connect-webhook')

  // Original natural delivery + 2 explicit resends = the event delivered 3x total.
  ctx.stripeCli.resendEvent(matchingEvent.id, targetEndpoint?.id)
  ctx.stripeCli.resendEvent(matchingEvent.id, targetEndpoint?.id)

  // Give the redeliveries a moment to land, then assert nothing changed.
  await new Promise((resolve) => setTimeout(resolve, 5_000))

  const { data: eventRows, error: eventRowsErr } = await service
    .from('processed_webhook_events')
    .select('event_id, processed_at')
    .eq('event_id', `stripe:${matchingEvent.id}`)
  if (eventRowsErr) {
    return { pass: false, details: `Could not read processed_webhook_events: ${eventRowsErr.message}` }
  }
  if ((eventRows ?? []).length !== 1) {
    return { pass: false, details: `Expected exactly 1 processed_webhook_events row for ${matchingEvent.id}, got ${eventRows?.length}` }
  }

  const { data: signupAfter } = await service
    .from('signups')
    .select('id, status, payment_status, confirmation_sent_at')
    .eq('id', signup.id)
    .maybeSingle()
  if (signupAfter?.status !== 'confirmed' || signupAfter?.payment_status !== 'paid') {
    return { pass: false, details: `Signup state changed after replay: ${JSON.stringify(signupAfter)}` }
  }

  // The real (first) delivery should have sent exactly one order-confirm email;
  // the 2 resends of the identical event id must not have sent a second.
  await ctx.mailosaur.waitForMessage({ sentTo: email, timeoutMs: 15_000, pollIntervalMs: 2_000 }).catch(() => null)
  const emailCount = await ctx.mailosaur.countMessages({ sentTo: email })
  if (emailCount !== 1) {
    return { pass: false, details: `Expected exactly 1 order-confirm email to ${email}, Mailosaur has ${emailCount}` }
  }

  return {
    pass: true,
    details: `1 processed_webhook_events row survives 2 resends of event ${matchingEvent.id}; signup unchanged; exactly 1 order-confirm email`,
  }
}
