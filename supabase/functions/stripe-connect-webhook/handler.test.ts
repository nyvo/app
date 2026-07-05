// deno test --allow-env supabase/functions/stripe-connect-webhook/
//
// Handler-level tests for the money path: the handler runs UNMODIFIED
// (real signature verification, real supabase-js client, real _shared/stripe
// request code) against a fetch router that fakes PostgREST + the Stripe API
// + Resend. Every scenario asserts on the HTTP effects (was capture called?
// was the claim released?), not on internals.

import { assert, assertEquals } from 'jsr:@std/assert@1'

// Env BEFORE importing the handler — module scope reads these.
Deno.env.set('SUPABASE_URL', 'http://sb.test')
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service-role-test')
Deno.env.set('STRIPE_CONNECT_WEBHOOK_SECRET', 'whsec_handler_test')
Deno.env.set('STRIPE_SECRET_KEY', 'sk_test_handler')
Deno.env.set('RESEND_API_KEY', 're_test_handler')

const { handleStripeConnectWebhook } = await import('./handler.ts')

const SECRET = 'whsec_handler_test'

async function signedRequest(event: unknown): Promise<Request> {
  const payload = JSON.stringify(event)
  const ts = Math.floor(Date.now() / 1000)
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${ts}.${payload}`))
  const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
  return new Request('http://localhost/stripe-connect-webhook', {
    method: 'POST',
    headers: { 'stripe-signature': `t=${ts},v1=${hex}` },
    body: payload,
  })
}

function capturableEvent() {
  return {
    id: 'evt_test_1',
    type: 'payment_intent.amount_capturable_updated',
    data: {
      object: {
        id: 'pi_test_1',
        status: 'requires_capture',
        amount: 20000, // øre — matches attempt.total_price_nok = 200
        metadata: { attempt_id: 'att_1' },
      },
    },
  }
}

const ATTEMPT_ROW = {
  id: 'att_1', seller_id: 'sel_1', course_id: 'crs_1',
  participant_name: 'Test Deltaker', participant_email: 'deltaker@example.com',
  participant_phone: '12345678', note: null, course_session_id: null,
  ticket_type_id: 'tt_1', total_price_nok: 200, platform_fee_nok: 0, status: 'pending',
}

interface Call { method: string; url: string; body: string }
interface Rule {
  method: string
  match: string // substring of URL
  status: number
  body?: unknown
  times?: number // consume after N hits (default: unlimited)
}

// Fake network. Explicit rules first (in order, respecting `times`), then
// permissive fallbacks so best-effort tails (booking emails, notifications)
// never explode: object-Accept GETs get PGRST116 (maybeSingle → null), plain
// GETs get [], writes get 2xx.
function installRouter(rules: Rule[]): { calls: Call[]; restore: () => void } {
  const calls: Call[] = []
  const counts = new Map<Rule, number>()
  const original = globalThis.fetch

  globalThis.fetch = async (input: URL | RequestInfo, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    let body = ''
    if (init?.body) body = typeof init.body === 'string' ? init.body : String(init.body)
    else if (input instanceof Request) body = await input.clone().text().catch(() => '')
    calls.push({ method, url, body })

    for (const rule of rules) {
      if (rule.method !== method || !url.includes(rule.match)) continue
      const used = counts.get(rule) ?? 0
      if (rule.times !== undefined && used >= rule.times) continue
      counts.set(rule, used + 1)
      return jsonResponse(rule.status, rule.body)
    }

    // Fallbacks.
    const accept = init?.headers
      ? new Headers(init.headers as HeadersInit).get('accept') ?? ''
      : input instanceof Request ? input.headers.get('accept') ?? '' : ''
    if (url.includes('/rest/v1/')) {
      if (method === 'GET') {
        return accept.includes('pgrst.object')
          ? jsonResponse(406, { code: 'PGRST116', message: 'no rows' })
          : jsonResponse(200, [])
      }
      return jsonResponse(method === 'POST' ? 201 : 204, method === 'POST' ? {} : undefined)
    }
    if (url.includes('api.resend.com')) return jsonResponse(200, { id: 'em_test' })
    if (url.includes('api.stripe.com')) return jsonResponse(200, { id: 'stripe_obj', status: 'succeeded' })
    return jsonResponse(200, {})
  }

  return { calls, restore: () => { globalThis.fetch = original } }
}

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const has = (calls: Call[], method: string, urlPart: string) =>
  calls.some((c) => c.method === method && c.url.includes(urlPart))

// ── Scenarios ───────────────────────────────────────────────────────────────

Deno.test('invalid signature → 401, nothing touched', async () => {
  const { calls, restore } = installRouter([])
  try {
    const res = await handleStripeConnectWebhook(
      new Request('http://localhost/x', {
        method: 'POST',
        headers: { 'stripe-signature': 't=1,v1=deadbeef' },
        body: JSON.stringify(capturableEvent()),
      }),
    )
    assertEquals(res.status, 401)
    assertEquals(calls.length, 0)
  } finally { restore() }
})

Deno.test('happy path: mint + capture → 200, attempt captured', async () => {
  const { calls, restore } = installRouter([
    { method: 'GET', match: '/rest/v1/payment_attempts', status: 200, body: ATTEMPT_ROW },
    { method: 'POST', match: '/rpc/create_signup_if_available', status: 200, body: { success: true, signup_id: 'sgn_1', status: 'confirmed' } },
    { method: 'POST', match: '/v1/payment_intents/pi_test_1/capture', status: 200, body: { id: 'pi_test_1', status: 'succeeded' } },
  ])
  try {
    const res = await handleStripeConnectWebhook(await signedRequest(capturableEvent()))
    assertEquals(res.status, 200)
    assert(has(calls, 'POST', '/capture'), 'capture must be called')
    assert(!has(calls, 'POST', '/cancel'), 'cancel must NOT be called')
    const captured = calls.find((c) => c.method === 'PATCH' && c.url.includes('payment_attempts') && c.body.includes('captured'))
    assert(captured, 'attempt must be marked captured')
  } finally { restore() }
})

Deno.test('duplicate_signup (two-tab double checkout) → cancel PI, void attempt, NEVER capture', async () => {
  const { calls, restore } = installRouter([
    { method: 'GET', match: '/rest/v1/payment_attempts', status: 200, body: ATTEMPT_ROW },
    { method: 'POST', match: '/rpc/create_signup_if_available', status: 200, body: { success: false, error: 'duplicate_signup', message: 'Du er allerede påmeldt dette kurset' } },
  ])
  try {
    const res = await handleStripeConnectWebhook(await signedRequest(capturableEvent()))
    assertEquals(res.status, 200)
    assert(has(calls, 'POST', '/v1/payment_intents/pi_test_1/cancel'), 'PI must be cancelled')
    assert(!has(calls, 'POST', '/capture'), 'capture must NEVER be called on duplicate_signup')
    const voided = calls.find((c) => c.method === 'PATCH' && c.url.includes('payment_attempts') && c.body.includes('voided'))
    assert(voided, 'attempt must be voided')
  } finally { restore() }
})

Deno.test('RPC transport error → 500, claim released, auth NOT cancelled (Stripe will retry)', async () => {
  const { calls, restore } = installRouter([
    { method: 'GET', match: '/rest/v1/payment_attempts', status: 200, body: ATTEMPT_ROW },
    { method: 'POST', match: '/rpc/create_signup_if_available', status: 500, body: { code: 'XX000', message: 'deadlock detected' } },
  ])
  try {
    const res = await handleStripeConnectWebhook(await signedRequest(capturableEvent()))
    assertEquals(res.status, 500)
    assert(has(calls, 'DELETE', 'processed_webhook_events'), 'claim must be released for the retry')
    assert(!has(calls, 'POST', '/cancel'), 'a transient DB error must not cancel a valid authorization')
    assert(!has(calls, 'POST', '/capture'), 'no capture either')
  } finally { restore() }
})

Deno.test('capture throws but live PI is succeeded → treated as success (H1 recheck)', async () => {
  const { calls, restore } = installRouter([
    { method: 'GET', match: '/rest/v1/payment_attempts', status: 200, body: ATTEMPT_ROW },
    { method: 'POST', match: '/rpc/create_signup_if_available', status: 200, body: { success: true, signup_id: 'sgn_1', status: 'confirmed' } },
    { method: 'POST', match: '/capture', status: 502, body: { error: { message: 'gateway timeout' } } },
    { method: 'GET', match: '/v1/payment_intents/pi_test_1', status: 200, body: { id: 'pi_test_1', status: 'succeeded' } },
  ])
  try {
    const res = await handleStripeConnectWebhook(await signedRequest(capturableEvent()))
    assertEquals(res.status, 200)
    assert(!has(calls, 'POST', '/cancel'), 'a captured payment must not be cancelled')
    const captured = calls.find((c) => c.method === 'PATCH' && c.url.includes('payment_attempts') && c.body.includes('captured'))
    assert(captured, 'attempt must be marked captured on recheck success')
  } finally { restore() }
})

Deno.test('capture throws and PI still requires_capture → 500 retry, booking NOT cancelled', async () => {
  const { calls, restore } = installRouter([
    { method: 'GET', match: '/rest/v1/payment_attempts', status: 200, body: ATTEMPT_ROW },
    { method: 'POST', match: '/rpc/create_signup_if_available', status: 200, body: { success: true, signup_id: 'sgn_1', status: 'confirmed' } },
    { method: 'POST', match: '/capture', status: 502, body: { error: { message: 'transient stripe error' } } },
    { method: 'GET', match: '/v1/payment_intents/pi_test_1', status: 200, body: { id: 'pi_test_1', status: 'requires_capture' } },
  ])
  try {
    const res = await handleStripeConnectWebhook(await signedRequest(capturableEvent()))
    assertEquals(res.status, 500)
    assert(has(calls, 'DELETE', 'processed_webhook_events'), 'claim released so Stripe retries')
    assert(!has(calls, 'PATCH', '/rest/v1/signups'), 'signup must NOT be cancelled while the auth is still capturable')
    assert(!has(calls, 'POST', '/cancel'), 'PI must NOT be cancelled while still capturable')
  } finally { restore() }
})

Deno.test('duplicate delivery of a processed event → 200 already_processed, no side effects', async () => {
  const { calls, restore } = installRouter([
    { method: 'POST', match: 'processed_webhook_events', status: 409, body: { code: '23505', message: 'duplicate key' } },
    { method: 'GET', match: 'processed_webhook_events', status: 200, body: { processed_at: new Date().toISOString(), created_at: new Date().toISOString() } },
  ])
  try {
    const res = await handleStripeConnectWebhook(await signedRequest(capturableEvent()))
    assertEquals(res.status, 200)
    assertEquals(JSON.parse(await res.text()).status, 'already_processed')
    assert(!has(calls, 'GET', 'payment_attempts'), 'no processing on a duplicate')
    assert(!has(calls, 'POST', '/capture'), 'no capture on a duplicate')
  } finally { restore() }
})

Deno.test('fresh in-flight claim held by another isolate → 409 so Stripe redelivers', async () => {
  const { restore } = installRouter([
    { method: 'POST', match: 'processed_webhook_events', status: 409, body: { code: '23505', message: 'duplicate key' } },
    { method: 'GET', match: 'processed_webhook_events', status: 200, body: { processed_at: null, created_at: new Date().toISOString() } },
  ])
  try {
    const res = await handleStripeConnectWebhook(await signedRequest(capturableEvent()))
    assertEquals(res.status, 409)
  } finally { restore() }
})

Deno.test('authorized amount mismatch → cancel + void, never capture', async () => {
  const { calls, restore } = installRouter([
    { method: 'GET', match: '/rest/v1/payment_attempts', status: 200, body: { ...ATTEMPT_ROW, total_price_nok: 100 } },
  ])
  try {
    const res = await handleStripeConnectWebhook(await signedRequest(capturableEvent()))
    assertEquals(res.status, 200)
    assert(has(calls, 'POST', '/v1/payment_intents/pi_test_1/cancel'), 'mismatched auth must be cancelled')
    assert(!has(calls, 'POST', '/capture'), 'mismatched auth must never be captured')
    assert(!has(calls, 'POST', '/rpc/create_signup_if_available'), 'no signup mint on mismatch')
  } finally { restore() }
})
