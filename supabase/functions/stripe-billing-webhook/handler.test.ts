// deno test --allow-env supabase/functions/stripe-billing-webhook/
//
// Handler-level tests for subscription sync. The handler syncs seller rows
// from the LIVE Stripe subscription (never the event payload — Stripe does
// not guarantee event ordering), so every scenario scripts the live
// retrieve alongside the delivered event.

import { assert, assertEquals } from 'jsr:@std/assert@1'
import { installRouter, has, signedStripeRequest, type Call } from '../_shared/test-harness.ts'

Deno.env.set('SUPABASE_URL', 'http://sb.test')
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service-role-test')
Deno.env.set('STRIPE_WEBHOOK_SECRET', 'whsec_billing_test')
Deno.env.set('STRIPE_SECRET_KEY', 'sk_test_handler')

const { handleStripeBillingWebhook } = await import('./handler.ts')

const SECRET = 'whsec_billing_test'
const signedRequest = (event: unknown) => signedStripeRequest(event, SECRET)

function subscriptionEvent(type: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt_bill_1',
    type,
    data: {
      object: {
        id: 'sub_test_1',
        status: 'active',
        customer: 'cus_test_1',
        cancel_at_period_end: false,
        metadata: { seller_id: 'sel_1' },
        ...overrides,
      },
    },
  }
}

function liveSubscription(status: string) {
  return {
    id: 'sub_test_1',
    status,
    customer: 'cus_test_1',
    cancel_at_period_end: false,
    current_period_end: 1793577600,
    items: { data: [{ current_period_end: 1793577600 }] },
    metadata: { seller_id: 'sel_1' },
  }
}

const sellerPatch = (calls: Call[]) =>
  calls.find((c) => c.method === 'PATCH' && c.url.includes('/rest/v1/sellers'))

Deno.test('invalid signature → 400', async () => {
  const { restore } = installRouter([])
  try {
    const res = await handleStripeBillingWebhook(
      new Request('http://localhost/x', {
        method: 'POST',
        headers: { 'stripe-signature': 't=1,v1=deadbeef' },
        body: JSON.stringify(subscriptionEvent('customer.subscription.updated')),
      }),
    )
    assertEquals(res.status, 400)
  } finally { restore() }
})

Deno.test('subscription.updated syncs Pro from the LIVE subscription, not the event', async () => {
  const { calls, restore } = installRouter([
    // Event claims 'canceled', live says 'active' — live must win.
    { method: 'GET', match: '/v1/subscriptions/sub_test_1', status: 200, body: liveSubscription('active') },
    { method: 'PATCH', match: '/rest/v1/sellers', status: 204, headers: { 'Content-Range': '0-0/1' } },
  ])
  try {
    const res = await handleStripeBillingWebhook(
      await signedRequest(subscriptionEvent('customer.subscription.updated', { status: 'canceled' })),
    )
    assertEquals(res.status, 200)
    const patch = sellerPatch(calls)
    assert(patch, 'sellers row must be updated')
    assert(patch!.body.includes('"subscription_plan":"pro"'), 'live active status → pro plan')
    assert(patch!.url.includes('id=eq.sel_1'), 'keyed on metadata.seller_id')
  } finally { restore() }
})

Deno.test('subscription.deleted with live canceled → seller back to free', async () => {
  const { calls, restore } = installRouter([
    { method: 'GET', match: '/v1/subscriptions/sub_test_1', status: 200, body: liveSubscription('canceled') },
    { method: 'PATCH', match: '/rest/v1/sellers', status: 204, headers: { 'Content-Range': '0-0/1' } },
  ])
  try {
    const res = await handleStripeBillingWebhook(
      await signedRequest(subscriptionEvent('customer.subscription.deleted')),
    )
    assertEquals(res.status, 200)
    const patch = sellerPatch(calls)
    assert(patch, 'sellers row must be updated')
    assert(patch!.body.includes('"subscription_plan":"free"'), 'canceled → free plan')
    assert(patch!.body.includes('"subscription_status":"canceled"'), 'status synced')
  } finally { restore() }
})

Deno.test('past_due first-invoice-unpaid guard: incomplete live status maps to none/free', async () => {
  const { calls, restore } = installRouter([
    { method: 'GET', match: '/v1/subscriptions/sub_test_1', status: 200, body: liveSubscription('incomplete') },
    { method: 'PATCH', match: '/rest/v1/sellers', status: 204, headers: { 'Content-Range': '0-0/1' } },
  ])
  try {
    const res = await handleStripeBillingWebhook(
      await signedRequest(subscriptionEvent('customer.subscription.updated')),
    )
    assertEquals(res.status, 200)
    const patch = sellerPatch(calls)
    assert(patch, 'sellers row must be updated')
    assert(patch!.body.includes('"subscription_status":"none"'), 'incomplete must NOT grant Pro')
    assert(patch!.body.includes('"subscription_plan":"free"'), 'stays on free plan')
  } finally { restore() }
})

Deno.test('live retrieve fails → 500 + claim released so Stripe retries (no stale sync)', async () => {
  const { calls, restore } = installRouter([
    { method: 'GET', match: '/v1/subscriptions/sub_test_1', status: 500, body: { error: { message: 'stripe down' } } },
  ])
  try {
    const res = await handleStripeBillingWebhook(
      await signedRequest(subscriptionEvent('customer.subscription.updated')),
    )
    assertEquals(res.status, 500)
    assert(has(calls, 'DELETE', 'processed_webhook_events'), 'claim must be released')
    assert(!sellerPatch(calls), 'no seller write from stale event data')
  } finally { restore() }
})

Deno.test('checkout.session.completed syncs from live sub with session-forced seller_id', async () => {
  const { calls, restore } = installRouter([
    { method: 'GET', match: '/v1/subscriptions/sub_test_1', status: 200, body: { ...liveSubscription('active'), metadata: {} } },
    { method: 'PATCH', match: '/rest/v1/sellers', status: 204, headers: { 'Content-Range': '0-0/1' } },
  ])
  try {
    const res = await handleStripeBillingWebhook(
      await signedRequest({
        id: 'evt_bill_1',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_1',
            subscription: 'sub_test_1',
            customer: 'cus_test_1',
            metadata: { seller_id: 'sel_1' },
          },
        },
      }),
    )
    assertEquals(res.status, 200)
    const patch = sellerPatch(calls)
    assert(patch, 'sellers row must be updated')
    assert(patch!.url.includes('id=eq.sel_1'), 'session metadata seller_id is authoritative')
    assert(patch!.body.includes('"subscription_plan":"pro"'), 'active live sub → pro')
  } finally { restore() }
})

Deno.test('duplicate delivery → 200 duplicate, no sync', async () => {
  const { calls, restore } = installRouter([
    { method: 'POST', match: 'processed_webhook_events', status: 409, body: { code: '23505', message: 'duplicate key' } },
    { method: 'GET', match: 'processed_webhook_events', status: 200, body: { processed_at: new Date().toISOString(), created_at: new Date().toISOString() } },
  ])
  try {
    const res = await handleStripeBillingWebhook(
      await signedRequest(subscriptionEvent('customer.subscription.updated')),
    )
    assertEquals(res.status, 200)
    assert(!has(calls, 'GET', '/v1/subscriptions'), 'no live retrieve on duplicate')
    assert(!sellerPatch(calls), 'no seller write on duplicate')
  } finally { restore() }
})

Deno.test('fresh in-flight claim → 409 so Stripe redelivers', async () => {
  const { restore } = installRouter([
    { method: 'POST', match: 'processed_webhook_events', status: 409, body: { code: '23505', message: 'duplicate key' } },
    { method: 'GET', match: 'processed_webhook_events', status: 200, body: { processed_at: null, created_at: new Date().toISOString() } },
  ])
  try {
    const res = await handleStripeBillingWebhook(
      await signedRequest(subscriptionEvent('customer.subscription.updated')),
    )
    assertEquals(res.status, 409)
  } finally { restore() }
})
