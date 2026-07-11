// scripts/smoke/tests/a4-oversell-race.mjs
// Checklist: A4 — Oversell race on the last seat. Verify: 2 concurrent
// bookings → exactly 1 confirmed, the other voided, exactly 1 charge.
//
// The soft capacity check in create-stripe-connect-session only guards
// against a slow buyer, not a real race (it reads the count before either
// payment is authorized) — the actual invariant lives in the advisory-locked
// create_signup_if_available RPC, invoked from the webhook once both PIs are
// authorized. This test deliberately confirms both PIs concurrently so both
// webhook deliveries race for the same seat.
//
// Requires: SMOKE_SELLER_SLUG, SMOKE_LAST_SEAT_COURSE_ID (max_participants
// set, exactly 1 confirmed-signup seat remaining), SMOKE_LAST_SEAT_TICKET_TYPE_ID.

import { pollUntil } from '../lib/poll.mjs'

export const meta = { id: 'A4', title: 'Oversell race on last seat resolves to exactly 1 confirmed', owner: '🤖' }

async function startAttempt(ctx, { courseId, organizationSlug, ticketTypeId, label }) {
  const email = ctx.mailosaur.mint(label)
  const res = await ctx.callFunction('create-stripe-connect-session', {
    body: {
      courseId,
      organizationSlug,
      ticketTypeId,
      customerEmail: email,
      customerName: `Smoke Test ${label}`,
      customerPhone: '99999999',
    },
  })
  if (res.status !== 200 || !res.json?.paymentIntentId) {
    throw new Error(`create-stripe-connect-session (${label}) failed: ${res.status} ${res.text}`)
  }
  return { email, ...res.json }
}

export async function run(ctx) {
  const courseId = ctx.fixtures.lastSeatCourseId()
  const organizationSlug = ctx.fixtures.sellerSlug()
  const ticketTypeId = ctx.fixtures.lastSeatTicketTypeId()

  // 1. Two buyers both start checkout for the same (last) seat, concurrently.
  const [attemptA, attemptB] = await Promise.all([
    startAttempt(ctx, { courseId, organizationSlug, ticketTypeId, label: 'a4-race-a' }),
    startAttempt(ctx, { courseId, organizationSlug, ticketTypeId, label: 'a4-race-b' }),
  ])
  for (const attempt of [attemptA, attemptB]) {
    ctx.manifest.record('payment_attempt', attempt.attemptId, attempt.paymentIntentId)
    ctx.manifest.record('payment_intent', attempt.paymentIntentId, attempt.paymentIntentId)
  }

  // 2. Both confirm concurrently — this is the actual race. Genuinely
  // concurrent subprocesses (see confirmPaymentIntentsConcurrently) — NOT two
  // sequential spawnSync calls, which would let PI-A's webhook settle the
  // seat before PI-B is even confirmed.
  const confirmResults = await ctx.stripeCli.confirmPaymentIntentsConcurrently(
    [attemptA.paymentIntentId, attemptB.paymentIntentId],
    'pm_card_visa',
  )
  const confirmFailures = confirmResults.filter((r) => r.status === 'rejected')
  if (confirmFailures.length === 2) {
    return { pass: false, details: `Both confirms failed: ${confirmFailures.map((f) => f.reason.message).join(' | ')}` }
  }

  // 3. Wait for both webhook deliveries to settle the attempts.
  const service = ctx.db.service()
  const settled = await pollUntil(
    async () => {
      const { data } = await service
        .from('payment_attempts')
        .select('id, status')
        .in('id', [attemptA.attemptId, attemptB.attemptId])
      if (!data || data.length !== 2) return null
      return data.every((row) => ['captured', 'voided', 'failed'].includes(row.status)) ? data : null
    },
    { label: 'both payment_attempts settling', timeoutMs: 60_000, intervalMs: 3_000 },
  )

  const captured = settled.filter((row) => row.status === 'captured')
  const notCaptured = settled.filter((row) => row.status !== 'captured')

  if (captured.length !== 1) {
    return {
      pass: false,
      details: `Expected exactly 1 captured attempt, got ${captured.length}: ${JSON.stringify(settled)}`,
    }
  }
  if (notCaptured.some((row) => row.status === 'captured')) {
    return { pass: false, details: `Race loser was captured too — double charge: ${JSON.stringify(settled)}` }
  }

  const { data: signups } = await service
    .from('signups')
    .select('id, status')
    .in('stripe_payment_intent_id', [attemptA.paymentIntentId, attemptB.paymentIntentId])
  for (const signup of signups ?? []) ctx.manifest.record('signup', signup.id)

  const confirmedSignups = (signups ?? []).filter((s) => s.status === 'confirmed')
  if (confirmedSignups.length !== 1) {
    return {
      pass: false,
      details: `Expected exactly 1 confirmed signup for the race, got ${confirmedSignups.length}: ${JSON.stringify(signups)}`,
    }
  }

  return {
    pass: true,
    details: `Race resolved cleanly: 1 captured/confirmed, ${notCaptured.length} lost (${notCaptured.map((r) => r.status).join(', ')})`,
  }
}
