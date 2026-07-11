// scripts/smoke/tests/a6-double-submit.mjs
// Checklist: A6 — Double-submit idempotency. Replay checkout → 1 signup, 1 charge.
//
// Models a buyer double-clicking "Betal" before the first request returns:
// two create-stripe-connect-session calls for the SAME email+course+ticket,
// both started before either has a confirmed signup (so the early
// already-signed-up guard in create-stripe-connect-session can't catch it —
// exactly the case the webhook's duplicate_signup rejection path exists for).
// Both resulting PaymentIntents are confirmed; exactly one should end up
// captured+confirmed, the other voided as a duplicate.
//
// Requires: SMOKE_SELLER_SLUG, SMOKE_PAID_COURSE_ID, SMOKE_PAID_TICKET_TYPE_ID.

import { pollUntil } from '../lib/poll.mjs'

export const meta = { id: 'A6', title: 'Double-submit checkout replay → 1 signup, 1 charge', owner: '🤖' }

export async function run(ctx) {
  const courseId = ctx.fixtures.paidCourseId()
  const organizationSlug = ctx.fixtures.sellerSlug()
  const ticketTypeId = ctx.fixtures.paidTicketTypeId()
  const email = ctx.mailosaur.mint('a6-double-submit')

  const body = {
    courseId,
    organizationSlug,
    ticketTypeId,
    customerEmail: email,
    customerName: 'Smoke Test A6',
    customerPhone: '99999999',
  }

  // Fire both "clicks" concurrently — neither sees the other's signup yet.
  const [resA, resB] = await Promise.all([
    ctx.callFunction('create-stripe-connect-session', { body }),
    ctx.callFunction('create-stripe-connect-session', { body }),
  ])
  for (const res of [resA, resB]) {
    if (res.status !== 200 || !res.json?.paymentIntentId) {
      return { pass: false, details: `create-stripe-connect-session double-submit failed: ${res.status} ${res.text}` }
    }
    ctx.manifest.record('payment_attempt', res.json.attemptId, res.json.paymentIntentId)
    ctx.manifest.record('payment_intent', res.json.paymentIntentId, res.json.paymentIntentId)
  }

  const piIds = [resA.json.paymentIntentId, resB.json.paymentIntentId]
  const attemptIds = [resA.json.attemptId, resB.json.attemptId]

  // Genuinely concurrent subprocesses — see stripe-cli.mjs's
  // confirmPaymentIntentsConcurrently doc comment for why spawnSync-in-a-loop
  // would not actually race these.
  await ctx.stripeCli.confirmPaymentIntentsConcurrently(piIds, 'pm_card_visa')

  const service = ctx.db.service()
  const settled = await pollUntil(
    async () => {
      const { data } = await service.from('payment_attempts').select('id, status').in('id', attemptIds)
      if (!data || data.length !== 2) return null
      return data.every((row) => ['captured', 'voided', 'failed'].includes(row.status)) ? data : null
    },
    { label: 'both replayed payment_attempts settling', timeoutMs: 60_000, intervalMs: 3_000 },
  )

  const captured = settled.filter((row) => row.status === 'captured')
  if (captured.length !== 1) {
    return { pass: false, details: `Expected exactly 1 captured attempt for the replay, got ${captured.length}: ${JSON.stringify(settled)}` }
  }

  const { data: signups } = await service.from('signups').select('id, status').in('stripe_payment_intent_id', piIds)
  for (const signup of signups ?? []) ctx.manifest.record('signup', signup.id)
  const confirmedSignups = (signups ?? []).filter((s) => s.status === 'confirmed')
  if (confirmedSignups.length !== 1) {
    return { pass: false, details: `Expected exactly 1 confirmed signup, got ${confirmedSignups.length}: ${JSON.stringify(signups)}` }
  }

  return { pass: true, details: `1 charge captured, 1 duplicate voided, 1 confirmed signup (${confirmedSignups[0].id})` }
}
