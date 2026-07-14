// scripts/smoke/tests/e3-webhook-bad-signature.mjs
// Checklist: E3 — Webhooks reject bad signatures. POST unsigned to all 3.
//
// Per the shared handler code (stripe-connect-webhook, stripe-billing-webhook,
// stripe-connect-account-events all share the same pattern): missing
// Stripe-Signature header → 400 ("Missing Stripe-Signature header"); a
// present-but-invalid signature → 401 ("Invalid signature"). This test checks
// both cases explicitly rather than only the checklist's literal "400" so a
// tampered-but-present signature is covered too.

import { callFunction } from '../lib/edge.mjs'

export const meta = { id: 'E3', title: 'Webhooks reject missing/invalid Stripe-Signature', owner: '🤖' }

const WEBHOOK_FUNCTIONS = ['stripe-connect-webhook', 'stripe-billing-webhook', 'stripe-connect-account-events']

export async function run(_ctx) {
  const results = []
  for (const name of WEBHOOK_FUNCTIONS) {
    const missing = await callFunction(name, { body: JSON.stringify({ id: 'evt_smoke_test', type: 'test.event' }) })
    const bogus = await callFunction(name, {
      body: JSON.stringify({ id: 'evt_smoke_test', type: 'test.event' }),
      headers: { 'Stripe-Signature': 't=1700000000,v1=0000000000000000000000000000000000000000000000000000000000000000' },
    })
    results.push({
      name,
      missingStatus: missing.status,
      bogusStatus: bogus.status,
      // Any 4xx rejection is a pass: stripe-billing-webhook's constructEvent
      // throw surfaces as 400 where the connect webhooks answer 401 — the
      // security property (unsigned/tampered payloads never process) is the
      // same, so don't fail the suite over the exact status split.
      pass: missing.status === 400 && bogus.status >= 400 && bogus.status < 500,
    })
  }
  const failed = results.filter((r) => !r.pass)
  const summary = results.map((r) => `${r.name}: no-sig=${r.missingStatus}, bad-sig=${r.bogusStatus}`).join('; ')
  return { pass: failed.length === 0, details: summary }
}
