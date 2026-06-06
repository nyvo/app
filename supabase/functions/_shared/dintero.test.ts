// Tests for the Dintero session callback_url signature verifier.
//
// Covers the full reject ladder the webhook relies on: missing header,
// malformed header, stale timestamp, future timestamp, tampered signature,
// wrong secret, and the happy path. We sign with `signCallbackForTest`, which
// runs the SAME canonical-string builder as the verifier, so the module-level
// `accountId` cancels out on both sides and these tests don't need real env.
//
// Run: deno test supabase/functions/_shared/dintero.test.ts

import { assertEquals } from 'jsr:@std/assert@1'
import { signCallbackForTest, verifyCallbackSignatureDetailed } from './dintero.ts'

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
