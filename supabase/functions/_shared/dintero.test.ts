// Tests for the Dintero session callback_url signature verifier and the
// refund-amount derivation used by the webhook's refund branches.
//
// Signature tests cover the full reject ladder the webhook relies on: missing
// header, malformed header, stale timestamp, future timestamp, tampered
// signature, wrong secret, and the happy path. We sign with
// `signCallbackForTest`, which runs the SAME canonical-string builder as the
// verifier, so the module-level `accountId` cancels out on both sides and
// these tests don't need real env.
//
// Run: deno test supabase/functions/_shared/dintero.test.ts

import { assertEquals } from 'jsr:@std/assert@1'
import {
  signCallbackForTest,
  sumRefundedOre,
  verifyCallbackSignatureDetailed,
  type DinteroTransaction,
} from './dintero.ts'

const SECRET = 'test-secret-123'
const URL_ = new URL('https://example.supabase.co/functions/v1/dintero-webhook?foo=bar')

const nowSec = () => Math.floor(Date.now() / 1000)

Deno.test('valid signature within the replay window verifies', async () => {
  const header = await signCallbackForTest({
    method: 'POST',
    url: URL_,
    timestamp: String(nowSec()),
    secret: SECRET,
  })
  const res = await verifyCallbackSignatureDetailed({ method: 'POST', url: URL_, header, secret: SECRET })
  assertEquals(res.ok, true)
})

Deno.test('stale timestamp (>5 min old) is rejected', async () => {
  const header = await signCallbackForTest({
    method: 'POST',
    url: URL_,
    timestamp: String(nowSec() - 6 * 60),
    secret: SECRET,
  })
  const res = await verifyCallbackSignatureDetailed({ method: 'POST', url: URL_, header, secret: SECRET })
  assertEquals(res.ok, false)
  assertEquals(res.reason, 'timestamp_outside_replay_window')
})

Deno.test('future timestamp (>5 min ahead) is rejected', async () => {
  const header = await signCallbackForTest({
    method: 'POST',
    url: URL_,
    timestamp: String(nowSec() + 6 * 60),
    secret: SECRET,
  })
  const res = await verifyCallbackSignatureDetailed({ method: 'POST', url: URL_, header, secret: SECRET })
  assertEquals(res.ok, false)
  assertEquals(res.reason, 'timestamp_outside_replay_window')
})

Deno.test('missing header is rejected', async () => {
  const res = await verifyCallbackSignatureDetailed({ method: 'POST', url: URL_, header: null, secret: SECRET })
  assertEquals(res.ok, false)
  assertEquals(res.reason, 'missing_header')
})

Deno.test('malformed header (no t= / v0-hmac-sha256=) is rejected', async () => {
  const res = await verifyCallbackSignatureDetailed({ method: 'POST', url: URL_, header: 'garbage', secret: SECRET })
  assertEquals(res.ok, false)
  assertEquals(res.reason, 'malformed_header')
})

Deno.test('non-numeric timestamp is rejected', async () => {
  const res = await verifyCallbackSignatureDetailed({
    method: 'POST',
    url: URL_,
    header: 't=notanumber,v0-hmac-sha256=deadbeef',
    secret: SECRET,
  })
  assertEquals(res.ok, false)
  assertEquals(res.reason, 'invalid_timestamp')
})

Deno.test('tampered signature is rejected (hmac_mismatch)', async () => {
  const header = await signCallbackForTest({
    method: 'POST',
    url: URL_,
    timestamp: String(nowSec()),
    secret: SECRET,
  })
  // Flip the last hex char while keeping it valid hex and the same length.
  const flipped = header.slice(0, -1) + (header.endsWith('0') ? '1' : '0')
  const res = await verifyCallbackSignatureDetailed({ method: 'POST', url: URL_, header: flipped, secret: SECRET })
  assertEquals(res.ok, false)
  assertEquals(res.reason, 'hmac_mismatch')
})

Deno.test('wrong secret is rejected (hmac_mismatch)', async () => {
  const header = await signCallbackForTest({
    method: 'POST',
    url: URL_,
    timestamp: String(nowSec()),
    secret: SECRET,
  })
  const res = await verifyCallbackSignatureDetailed({
    method: 'POST',
    url: URL_,
    header,
    secret: 'a-different-secret',
  })
  assertEquals(res.ok, false)
  assertEquals(res.reason, 'hmac_mismatch')
})

Deno.test('missing secret is rejected', async () => {
  const header = await signCallbackForTest({
    method: 'POST',
    url: URL_,
    timestamp: String(nowSec()),
    secret: SECRET,
  })
  const res = await verifyCallbackSignatureDetailed({ method: 'POST', url: URL_, header, secret: '' })
  assertEquals(res.ok, false)
  assertEquals(res.reason, 'missing_secret')
})

// ---------- sumRefundedOre ----------
//
// `transaction.amount` is the ORDER amount and never reflects refunds; the
// refunded total only exists as REFUND entries in the event log. These tests
// pin the derivation the PARTIALLY_REFUNDED / REFUNDED webhook branches
// depend on — most importantly that "unknown" is null, never 0 and never
// the order amount.

function txn(events: DinteroTransaction['events']): DinteroTransaction {
  return {
    id: 'T12345678.abc',
    status: 'PARTIALLY_REFUNDED',
    amount: 50_000, // order amount: 500 kr — must never leak into the sum
    currency: 'NOK',
    events,
  }
}

Deno.test('sumRefundedOre: single partial refund sums that event only', () => {
  const t = txn([
    { event: 'AUTHORIZE', success: true, amount: 50_000 },
    { event: 'CAPTURE', success: true, amount: 50_000 },
    { event: 'REFUND', success: true, amount: 10_000 },
  ])
  assertEquals(sumRefundedOre(t), 10_000)
})

Deno.test('sumRefundedOre: sequential partial refunds accumulate', () => {
  const t = txn([
    { event: 'CAPTURE', success: true, amount: 50_000 },
    { event: 'REFUND', success: true, amount: 10_000 },
    { event: 'REFUND', success: true, amount: 15_000 },
  ])
  assertEquals(sumRefundedOre(t), 25_000)
})

Deno.test('sumRefundedOre: failed refund events are excluded', () => {
  const t = txn([
    { event: 'REFUND', success: false, amount: 10_000 },
    { event: 'REFUND', success: true, amount: 5_000 },
  ])
  assertEquals(sumRefundedOre(t), 5_000)
})

Deno.test('sumRefundedOre: REFUND without success field counts (only explicit false excludes)', () => {
  const t = txn([{ event: 'REFUND', amount: 7_500 }])
  assertEquals(sumRefundedOre(t), 7_500)
})

Deno.test('sumRefundedOre: INITIATE_REFUND does not count, only REFUND', () => {
  const t = txn([
    { event: 'INITIATE_REFUND', success: true, amount: 10_000 },
    { event: 'REFUND', success: true, amount: 10_000 },
  ])
  assertEquals(sumRefundedOre(t), 10_000)
})

Deno.test('sumRefundedOre: missing events array → null (unknown, not 0)', () => {
  assertEquals(sumRefundedOre(txn(undefined)), null)
})

Deno.test('sumRefundedOre: no REFUND events → null (unknown, not 0)', () => {
  const t = txn([{ event: 'CAPTURE', success: true, amount: 50_000 }])
  assertEquals(sumRefundedOre(t), null)
})

Deno.test('sumRefundedOre: REFUND event without numeric amount poisons the sum → null', () => {
  const t = txn([
    { event: 'REFUND', success: true, amount: 10_000 },
    { event: 'REFUND', success: true }, // completed refund, amount missing
  ])
  assertEquals(sumRefundedOre(t), null)
})

Deno.test('sumRefundedOre: full refund equals captured amount', () => {
  const t = txn([
    { event: 'CAPTURE', success: true, amount: 50_000 },
    { event: 'REFUND', success: true, amount: 50_000 },
  ])
  assertEquals(sumRefundedOre(t), 50_000)
})
