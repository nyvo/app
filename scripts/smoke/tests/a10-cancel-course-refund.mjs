// scripts/smoke/tests/a10-cancel-course-refund.mjs
// Checklist: A10 — Refund via cancel-course (multi-signup). Every paid signup
// refunded exactly once.
//
// DESTRUCTIVE: cancel-course flips courses.status to 'cancelled' permanently
// (no uncancel endpoint). This test therefore requires its OWN throwaway
// fixture course — never point SMOKE_CANCELLABLE_COURSE_ID at a course other
// tests reuse.
//
// Requires: SMOKE_SELLER_SLUG, SMOKE_CANCELLABLE_COURSE_ID,
// SMOKE_CANCELLABLE_TICKET_TYPE_ID, SMOKE_SELLER_OWNER_EMAIL/PASSWORD.

import { pollUntil } from '../lib/poll.mjs'

export const meta = { id: 'A10', title: 'cancel-course refunds every paid signup exactly once', owner: '🤖' }

async function bookOne(ctx, { courseId, organizationSlug, ticketTypeId, label }) {
  const email = ctx.mailosaur.mint(label)
  const res = await ctx.callFunction('create-stripe-connect-session', {
    body: { courseId, organizationSlug, ticketTypeId, customerEmail: email, customerName: `Smoke Test ${label}`, customerPhone: '99999999' },
  })
  if (res.status !== 200 || !res.json?.paymentIntentId) {
    throw new Error(`create-stripe-connect-session (${label}) failed: ${res.status} ${res.text}`)
  }
  return res.json
}

export async function run(ctx) {
  const courseId = ctx.fixtures.cancellableCourseId()
  const organizationSlug = ctx.fixtures.sellerSlug()
  const ticketTypeId = ctx.fixtures.cancellableTicketTypeId()
  const authHeaders = await ctx.sellerOwnerAuthHeader()

  // 1. Two separate paid signups on the throwaway course.
  const bookings = await Promise.all([
    bookOne(ctx, { courseId, organizationSlug, ticketTypeId, label: 'a10-cancel-course-1' }),
    bookOne(ctx, { courseId, organizationSlug, ticketTypeId, label: 'a10-cancel-course-2' }),
  ])
  for (const b of bookings) {
    ctx.manifest.record('payment_attempt', b.attemptId, b.paymentIntentId)
    ctx.manifest.record('payment_intent', b.paymentIntentId, b.paymentIntentId)
  }
  for (const b of bookings) ctx.stripeCli.confirmPaymentIntent(b.paymentIntentId, 'pm_card_visa')

  const service = ctx.db.service()
  const piIds = bookings.map((b) => b.paymentIntentId)
  await pollUntil(
    async () => {
      const { data } = await service.from('payment_attempts').select('stripe_payment_intent_id, status').in('stripe_payment_intent_id', piIds)
      return data && data.every((row) => row.status === 'captured') ? data : null
    },
    { label: 'both bookings capturing before cancel-course', timeoutMs: 60_000, intervalMs: 3_000 },
  )
  const { data: signupsBefore } = await service.from('signups').select('id').in('stripe_payment_intent_id', piIds)
  for (const s of signupsBefore ?? []) ctx.manifest.record('signup', s.id)
  if ((signupsBefore ?? []).length !== 2) {
    return { pass: false, details: `Expected 2 signups minted before cancelling, got ${signupsBefore?.length}` }
  }

  // 2. Cancel the whole course.
  const cancelRes = await ctx.callFunction('cancel-course', {
    headers: authHeaders,
    body: { course_id: courseId, reason: 'smoke test A10', notify_participants: false },
  })
  if (cancelRes.status !== 200 || !cancelRes.json?.success) {
    return { pass: false, details: `cancel-course failed: ${cancelRes.status} ${cancelRes.text}` }
  }
  if (cancelRes.json.refunds_failed > 0) {
    return { pass: false, details: `cancel-course reported ${cancelRes.json.refunds_failed} failed refund(s): ${JSON.stringify(cancelRes.json.failed_refund_details)}` }
  }
  if (cancelRes.json.refunds_processed < 2) {
    return { pass: false, details: `Expected >= 2 refunds_processed, got ${cancelRes.json.refunds_processed}` }
  }

  // 3. Every signup ends up course_cancelled + refunded, refunded exactly once at Stripe.
  const { data: signupsAfter } = await service
    .from('signups')
    .select('id, status, payment_status, refund_amount, amount_paid')
    .in('stripe_payment_intent_id', piIds)
  const notCancelled = (signupsAfter ?? []).filter((s) => s.status !== 'course_cancelled' || s.payment_status !== 'refunded')
  if (notCancelled.length > 0) {
    return { pass: false, details: `Signups not cleanly cancelled+refunded: ${JSON.stringify(notCancelled)}` }
  }

  for (const piId of piIds) {
    const pi = ctx.stripeCli.retrievePaymentIntent(piId)
    const charge = pi.latest_charge ? ctx.stripeCli.retrieveCharge(pi.latest_charge) : null
    if (!charge || charge.amount_refunded !== charge.amount) {
      return { pass: false, details: `PI ${piId}: charge not fully (and exactly once) refunded — ${JSON.stringify(charge)}` }
    }
  }

  const { data: courseAfter } = await service.from('courses').select('status').eq('id', courseId).maybeSingle()
  if (courseAfter?.status !== 'cancelled') {
    return { pass: false, details: `courses.status is '${courseAfter?.status}', expected 'cancelled'` }
  }

  return {
    pass: true,
    details: `cancel-course: refunds_processed=${cancelRes.json.refunds_processed}, refunds_failed=0; both signups course_cancelled+refunded exactly once`,
  }
}
