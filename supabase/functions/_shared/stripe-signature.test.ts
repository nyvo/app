// deno test --allow-env supabase/functions/_shared/stripe-signature.test.ts
//
// verifyStripeSignature guards every Stripe webhook. Round-trips a real
// HMAC-SHA256 signature the way Stripe builds it (`t=<ts>,v1=<hex>` over
// `<ts>.<payload>`), then checks the reject paths: tampered payload, wrong
// secret, stale timestamp, malformed/missing header.

import { assertEquals } from 'jsr:@std/assert@1'
import { verifyStripeSignature } from './stripe.ts'

const SECRET = 'whsec_test_secret'

async function sign(payload: string, secret: string, timestampSeconds: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const digest = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestampSeconds}.${payload}`),
  )
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `t=${timestampSeconds},v1=${hex}`
}

const now = () => Math.floor(Date.now() / 1000)

Deno.test('accepts a correctly signed payload', async () => {
  const payload = JSON.stringify({ id: 'evt_1', type: 'payment_intent.succeeded' })
  const header = await sign(payload, SECRET, now())
  assertEquals(
    await verifyStripeSignature({ payload, signatureHeader: header, webhookSecret: SECRET }),
    true,
  )
})

Deno.test('rejects a tampered payload', async () => {
  const header = await sign('{"amount":100}', SECRET, now())
  assertEquals(
    await verifyStripeSignature({ payload: '{"amount":99900}', signatureHeader: header, webhookSecret: SECRET }),
    false,
  )
})

Deno.test('rejects a signature made with a different secret', async () => {
  const payload = '{"id":"evt_1"}'
  const header = await sign(payload, 'whsec_other', now())
  assertEquals(
    await verifyStripeSignature({ payload, signatureHeader: header, webhookSecret: SECRET }),
    false,
  )
})

Deno.test('rejects a stale timestamp outside tolerance (replay protection)', async () => {
  const payload = '{"id":"evt_1"}'
  const header = await sign(payload, SECRET, now() - 600)
  assertEquals(
    await verifyStripeSignature({ payload, signatureHeader: header, webhookSecret: SECRET }),
    false,
  )
})

Deno.test('accepts an old timestamp when tolerance is widened explicitly', async () => {
  const payload = '{"id":"evt_1"}'
  const header = await sign(payload, SECRET, now() - 600)
  assertEquals(
    await verifyStripeSignature({
      payload,
      signatureHeader: header,
      webhookSecret: SECRET,
      toleranceSeconds: 3600,
    }),
    true,
  )
})

Deno.test('rejects missing or malformed headers', async () => {
  const payload = '{"id":"evt_1"}'
  assertEquals(
    await verifyStripeSignature({ payload, signatureHeader: null, webhookSecret: SECRET }),
    false,
  )
  assertEquals(
    await verifyStripeSignature({ payload, signatureHeader: 'garbage', webhookSecret: SECRET }),
    false,
  )
  assertEquals(
    await verifyStripeSignature({ payload, signatureHeader: 't=,v1=', webhookSecret: SECRET }),
    false,
  )
})
