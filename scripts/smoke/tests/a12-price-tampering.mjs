// scripts/smoke/tests/a12-price-tampering.mjs
// Checklist: A12 — Price tampering rejected. POST a bogus amount → server
// always prices from the DB (via the available_ticket_types RPC), never from
// the request body.
//
// create-stripe-connect-session's SessionRequestBody has no price/amount
// field at all — the handler resolves `typedTier.price` purely from
// `available_ticket_types(courseId)` (see supabase/functions/_shared/pricing.ts
// for the exact fee formula). So "tampering" here means: send extra bogus
// fields an attacker might guess (`price`, `amount`, `unitAmount`,
// `totalPrice`) alongside a legit ticketTypeId, and assert they're silently
// ignored — the created PaymentIntent's amount must equal the DB-derived
// price + service fee, not the injected value.
//
// Requires: SMOKE_SELLER_SLUG, SMOKE_PAID_COURSE_ID, SMOKE_PAID_TICKET_TYPE_ID.

// Mirrors supabase/functions/_shared/pricing.ts calculatePricing() — duplicated
// here (Deno TS module, not importable from Node) rather than re-implemented
// differently, so drift between the two would show up as a real test failure.
const SERVICE_FEE_RATE = 0.05
const SERVICE_FEE_MIN_NOK = 9
const SERVICE_FEE_MAX_NOK = 149

function expectedPriceInOre(basePrice) {
  const serviceFeeNok =
    basePrice > 0
      ? Math.min(SERVICE_FEE_MAX_NOK, Math.max(SERVICE_FEE_MIN_NOK, Math.round(basePrice * SERVICE_FEE_RATE)))
      : 0
  return Math.round((basePrice + serviceFeeNok) * 100)
}

export const meta = { id: 'A12', title: 'Price tampering rejected — server always prices from DB', owner: '🤖' }

export async function run(ctx) {
  const courseId = ctx.fixtures.paidCourseId()
  const organizationSlug = ctx.fixtures.sellerSlug()
  const ticketTypeId = ctx.fixtures.paidTicketTypeId()
  const email = ctx.mailosaur.mint('a12-price-tampering')

  const service = ctx.db.service()
  const { data: tier, error: tierErr } = await service
    .from('course_signup_packages')
    .select('price')
    .eq('id', ticketTypeId)
    .maybeSingle()
  if (tierErr || !tier) return { pass: false, details: `Could not read ticket type price from DB: ${tierErr?.message}` }

  const res = await ctx.callFunction('create-stripe-connect-session', {
    body: {
      courseId,
      organizationSlug,
      ticketTypeId,
      customerEmail: email,
      customerName: 'Smoke Test A12',
      customerPhone: '99999999',
      // Bogus tampering fields — none of these exist in the real request contract.
      price: 1,
      amount: 100,
      unitAmount: 1,
      totalPrice: 1,
      base_price_nok: 1,
    },
  })
  if (res.status !== 200 || !res.json?.paymentIntentId) {
    return { pass: false, details: `create-stripe-connect-session failed: ${res.status} ${res.text}` }
  }
  const { paymentIntentId, attemptId } = res.json
  ctx.manifest.record('payment_attempt', attemptId, paymentIntentId)
  ctx.manifest.record('payment_intent', paymentIntentId, paymentIntentId)

  const pi = ctx.stripeCli.retrievePaymentIntent(paymentIntentId)
  const expected = expectedPriceInOre(Number(tier.price))
  if (pi.amount !== expected) {
    return {
      pass: false,
      details: `PaymentIntent amount is ${pi.amount} øre, expected ${expected} øre derived from DB price ${tier.price} — tampering may have worked!`,
    }
  }

  const { data: attempt } = await service.from('payment_attempts').select('total_price_nok').eq('id', attemptId).maybeSingle()
  if (attempt && Math.round(Number(attempt.total_price_nok) * 100) !== expected) {
    return { pass: false, details: `payment_attempts.total_price_nok (${attempt.total_price_nok}) doesn't match the DB-derived price` }
  }

  return { pass: true, details: `Bogus price fields ignored; PaymentIntent correctly priced at ${expected} øre from DB tier price ${tier.price} kr` }
}
