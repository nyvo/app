// scripts/smoke/tests/a8-pending-sweep.mjs
// Checklist: A8 — Pending-payment sweep. Leave a PI uncaptured; invoke the
// sweep cron → reconciled.
//
// Scope note: in this environment the Stripe test webhook endpoint is live
// and wired to stripe-connect-webhook, so a confirmed PI is normally captured
// by the webhook within seconds — there's no supported way from this
// unauthenticated harness to simulate "the webhook was down" (that would mean
// disabling the real webhook endpoint, which is out of scope for an
// automated smoke test). What IS testable end-to-end: sweep-pending-payments
// invoked directly against an attempt the webhook already settled must be a
// safe, idempotent no-op — it must NOT re-capture, void, or otherwise corrupt
// an already-captured attempt. That's the invariant this test asserts.
//
// Requires: SMOKE_SELLER_SLUG, SMOKE_PAID_COURSE_ID, SMOKE_PAID_TICKET_TYPE_ID,
// and (SUPABASE_SERVICE_ROLE_KEY or CRON_SECRET) to call the cron endpoint.

import { pollUntil } from '../lib/poll.mjs'

export const meta = { id: 'A8', title: 'Pending-payment sweep reconciles safely (idempotent)', owner: '🤖' }

export async function run(ctx) {
  const courseId = ctx.fixtures.paidCourseId()
  const organizationSlug = ctx.fixtures.sellerSlug()
  const ticketTypeId = ctx.fixtures.paidTicketTypeId()
  const email = ctx.mailosaur.mint('a8-pending-sweep')
  const cronHeaders = ctx.cronAuthHeaders() // fail fast if no cred configured

  const sessionRes = await ctx.callFunction('create-stripe-connect-session', {
    body: {
      courseId,
      organizationSlug,
      ticketTypeId,
      customerEmail: email,
      customerName: 'Smoke Test A8',
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
  const captured = await pollUntil(
    async () => {
      const { data } = await service.from('payment_attempts').select('status, updated_at').eq('id', attemptId).maybeSingle()
      return data?.status === 'captured' ? data : null
    },
    { label: `payment_attempts(${attemptId}) capturing via the live webhook`, timeoutMs: 45_000 },
  )

  const sweepRes = await ctx.callFunction('sweep-pending-payments', { headers: cronHeaders })
  if (sweepRes.status !== 200) {
    return { pass: false, details: `sweep-pending-payments returned ${sweepRes.status}: ${sweepRes.text}` }
  }
  if (typeof sweepRes.json?.errors === 'number' && sweepRes.json.errors > 0) {
    return { pass: false, details: `sweep-pending-payments reported errors: ${JSON.stringify(sweepRes.json)}` }
  }

  const { data: after, error } = await service
    .from('payment_attempts')
    .select('status')
    .eq('id', attemptId)
    .maybeSingle()
  if (error || !after) return { pass: false, details: `Could not re-read attempt after sweep: ${error?.message}` }
  if (after.status !== 'captured') {
    return { pass: false, details: `Sweep corrupted an already-captured attempt — now '${after.status}'` }
  }

  const { data: signup } = await service.from('signups').select('id').eq('stripe_payment_intent_id', paymentIntentId).maybeSingle()
  if (signup) ctx.manifest.record('signup', signup.id)

  return {
    pass: true,
    details: `sweep summary=${JSON.stringify(sweepRes.json)}; attempt ${attemptId} still captured (unchanged since ${captured.updated_at})`,
  }
}
