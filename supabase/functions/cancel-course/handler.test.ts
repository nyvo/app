// deno test --allow-env supabase/functions/cancel-course/
//
// Handler-level tests for course cancellation with bulk refunds. Auth is a
// faked /auth/v1/user + seller_members lookup; money routing is driven by
// scripted live PaymentIntent statuses, exactly like production.

import { assert, assertEquals } from 'jsr:@std/assert@1'
import { installRouter, has, type Call, type Rule } from '../_shared/test-harness.ts'

Deno.env.set('SUPABASE_URL', 'http://sb.test')
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service-role-test')
Deno.env.set('SUPABASE_ANON_KEY', 'anon-test')
Deno.env.set('STRIPE_SECRET_KEY', 'sk_test_handler')
Deno.env.set('RESEND_API_KEY', 're_test_handler')

const { handleCancelCourse } = await import('./handler.ts')

function request(body: unknown, withAuth = true): Request {
  return new Request('http://localhost/cancel-course', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(withAuth ? { Authorization: 'Bearer test-jwt' } : {}),
    },
    body: JSON.stringify(body),
  })
}

const COURSE_ROW = { id: 'crs_1', title: 'Testkurs', seller_id: 'sel_1', status: 'active' }
const SELLER_ROW = { name: 'Studio Test', email: 'studio@test.no', organization_number: null }

function signup(overrides: Record<string, unknown>) {
  return {
    id: 'sgn_x', course_id: 'crs_1', seller_id: 'sel_1',
    participant_name: 'Deltaker', participant_email: 'd@example.com',
    status: 'confirmed', payment_status: 'paid', amount_paid: 200,
    refund_amount: null, refunded_at: null, cancelled_at: null,
    stripe_payment_intent_id: null,
    ...overrides,
  }
}

// Baseline rules for an authorized owner hitting an active course.
function baseRules(extra: Rule[]): Rule[] {
  return [
    { method: 'GET', match: '/rest/v1/seller_members', status: 200, body: { role: 'owner' } },
    { method: 'GET', match: '/rest/v1/courses', status: 200, body: COURSE_ROW },
    { method: 'GET', match: '/rest/v1/sellers', status: 200, body: SELLER_ROW },
    ...extra,
  ]
}

const patchedSignup = (calls: Call[], bodyPart: string) =>
  calls.filter((c) => c.method === 'PATCH' && c.url.includes('/rest/v1/signups') && c.body.includes(bodyPart))

Deno.test('missing auth header → 401, nothing touched', async () => {
  const { calls, restore } = installRouter([])
  try {
    const res = await handleCancelCourse(request({ course_id: 'crs_1' }, false))
    assertEquals(res.status, 401)
    assertEquals(calls.length, 0)
  } finally { restore() }
})

Deno.test('non-member → 403, course NOT cancelled', async () => {
  const { calls, restore } = installRouter([
    { method: 'GET', match: '/rest/v1/courses', status: 200, body: COURSE_ROW },
    // seller_members falls through to the PGRST116 fallback → not a member.
  ])
  try {
    const res = await handleCancelCourse(request({ course_id: 'crs_1' }))
    assertEquals(res.status, 403)
    assert(!has(calls, 'PATCH', '/rest/v1/courses'), 'course status must not change')
    assert(!has(calls, 'POST', '/v1/refunds'), 'no refunds')
  } finally { restore() }
})

Deno.test('mixed batch: captured→refund, authorized→void, free→plain cancel; all terminalized + notified', async () => {
  const signups = [
    signup({ id: 'sgn_paid', stripe_payment_intent_id: 'pi_paid' }),
    signup({ id: 'sgn_auth', stripe_payment_intent_id: 'pi_auth', payment_status: 'pending' }),
    signup({ id: 'sgn_free', amount_paid: 0, payment_status: 'paid' }),
  ]
  const { calls, restore } = installRouter(baseRules([
    { method: 'GET', match: '/rest/v1/signups', status: 200, body: signups },
    { method: 'GET', match: '/v1/payment_intents/pi_paid', status: 200, body: { id: 'pi_paid', status: 'succeeded', latest_charge: 'ch_paid' } },
    { method: 'GET', match: '/v1/charges/ch_paid', status: 200, body: { id: 'ch_paid', amount: 20000, amount_refunded: 0 } },
    { method: 'GET', match: '/v1/payment_intents/pi_auth', status: 200, body: { id: 'pi_auth', status: 'requires_capture', latest_charge: null } },
  ]))
  try {
    const res = await handleCancelCourse(request({ course_id: 'crs_1' }))
    assertEquals(res.status, 200)
    const body = JSON.parse(await res.text())
    assertEquals(body.refunds_processed, 1)
    assertEquals(body.voids_processed, 1)
    assertEquals(body.refunds_failed, 0)
    assertEquals(body.total_refunded, 200)
    assertEquals(body.success, true)
    assert(has(calls, 'PATCH', '/rest/v1/courses'), 'course flipped to cancelled')
    assert(has(calls, 'POST', '/v1/refunds'), 'captured payment refunded')
    assert(has(calls, 'POST', '/v1/payment_intents/pi_auth/cancel'), 'uncaptured auth cancelled, not refunded')
    assertEquals(patchedSignup(calls, 'course_cancelled').length, 3, 'every signup terminalized')
    assertEquals(body.notifications_sent, 3)
    // sendEmail dispatches via the internal send-email function (Resend is
    // that function's own concern).
    assertEquals(
      calls.filter((c) => c.method === 'POST' && c.url.includes('/functions/v1/send-email')).length,
      3,
    )
  } finally { restore() }
})

Deno.test('refund failure → surfaced for manual follow-up, row NOT marked refunded, NOT emailed', async () => {
  const { calls, restore } = installRouter(baseRules([
    { method: 'GET', match: '/rest/v1/signups', status: 200, body: [signup({ id: 'sgn_paid', stripe_payment_intent_id: 'pi_paid' })] },
    { method: 'GET', match: '/v1/payment_intents/pi_paid', status: 200, body: { id: 'pi_paid', status: 'succeeded', latest_charge: 'ch_paid' } },
    { method: 'GET', match: '/v1/charges/ch_paid', status: 200, body: { id: 'ch_paid', amount: 20000, amount_refunded: 0 } },
    { method: 'POST', match: '/v1/refunds', status: 502, body: { error: { message: 'stripe unavailable' } } },
  ]))
  try {
    const res = await handleCancelCourse(request({ course_id: 'crs_1' }))
    assertEquals(res.status, 200)
    const body = JSON.parse(await res.text())
    assertEquals(body.refunds_failed, 1)
    assertEquals(body.success, false)
    assertEquals(body.failed_refund_details.length, 1)
    assertEquals(patchedSignup(calls, 'refunded').length, 0, 'row must not claim a refund that never happened')
    assert(!has(calls, 'POST', '/functions/v1/send-email'), 'failed rows are not emailed this run — the completing re-run emails once')
  } finally { restore() }
})

Deno.test('already-refunded row → already_handled, no second refund at Stripe', async () => {
  const { calls, restore } = installRouter(baseRules([
    { method: 'GET', match: '/rest/v1/signups', status: 200, body: [
      signup({ id: 'sgn_done', stripe_payment_intent_id: 'pi_done', payment_status: 'refunded', refunded_at: new Date().toISOString(), refund_amount: 200 }),
    ] },
  ]))
  try {
    const res = await handleCancelCourse(request({ course_id: 'crs_1' }))
    assertEquals(res.status, 200)
    const body = JSON.parse(await res.text())
    assertEquals(body.already_handled, 1)
    assertEquals(body.refunds_processed, 0)
    assert(!has(calls, 'POST', '/v1/refunds'), 'no double refund')
    assert(!has(calls, 'GET', '/v1/payment_intents'), 'no PI lookup needed for a recorded refund')
    assertEquals(patchedSignup(calls, 'course_cancelled').length, 1, 'row still terminalized')
  } finally { restore() }
})

Deno.test('re-run on an already-cancelled course is idempotent (no status re-write)', async () => {
  const { calls, restore } = installRouter([
    { method: 'GET', match: '/rest/v1/seller_members', status: 200, body: { role: 'owner' } },
    { method: 'GET', match: '/rest/v1/courses', status: 200, body: { ...COURSE_ROW, status: 'cancelled' } },
    { method: 'GET', match: '/rest/v1/signups', status: 200, body: [] },
  ])
  try {
    const res = await handleCancelCourse(request({ course_id: 'crs_1' }))
    assertEquals(res.status, 200)
    assert(!has(calls, 'PATCH', '/rest/v1/courses'), 'no redundant status write')
    assertEquals(JSON.parse(await res.text()).success, true)
  } finally { restore() }
})
