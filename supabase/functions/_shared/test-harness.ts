// Shared test harness for handler-level edge-function tests.
//
// Handlers run UNMODIFIED (real signature verification, real supabase-js,
// real _shared/stripe request code) against installRouter's fake network,
// which impersonates PostgREST, the Stripe API, Resend and Supabase Auth.
// Tests assert on HTTP effects (calls made / not made), not internals.
//
// (Named test-harness.ts on purpose: `deno test` only picks up *test.ts /
// *_test / *.test files, so this helper is never run as a suite.)

export interface Call {
  method: string
  url: string
  body: string
}

export interface Rule {
  method: string
  match: string // substring of URL
  status: number
  body?: unknown
  headers?: Record<string, string>
  times?: number // consume after N hits (default: unlimited)
}

export function jsonResponse(
  status: number,
  body?: unknown,
  headers?: Record<string, string>,
): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

/**
 * Replace globalThis.fetch with a scripted router. Explicit rules first (in
 * order, respecting `times`), then permissive fallbacks so best-effort tails
 * (booking/notification emails) stay benign: object-Accept GETs get PGRST116
 * (maybeSingle → null), plain GETs get [], writes get 2xx.
 */
export function installRouter(rules: Rule[]): { calls: Call[]; restore: () => void } {
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
      return jsonResponse(rule.status, rule.body, rule.headers)
    }

    const accept = init?.headers
      ? new Headers(init.headers as HeadersInit).get('accept') ?? ''
      : input instanceof Request ? input.headers.get('accept') ?? '' : ''
    if (url.includes('/auth/v1/user')) {
      return jsonResponse(200, { id: 'usr_test_1', aud: 'authenticated', email: 'teacher@example.com' })
    }
    if (url.includes('/rest/v1/')) {
      if (method === 'GET' || method === 'HEAD') {
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

export const has = (calls: Call[], method: string, urlPart: string) =>
  calls.some((c) => c.method === method && c.url.includes(urlPart))

/** Build a Stripe-signed webhook Request the way Stripe signs real deliveries. */
export async function signedStripeRequest(event: unknown, secret: string): Promise<Request> {
  const payload = JSON.stringify(event)
  const ts = Math.floor(Date.now() / 1000)
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${ts}.${payload}`))
  const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
  return new Request('http://localhost/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': `t=${ts},v1=${hex}` },
    body: payload,
  })
}
