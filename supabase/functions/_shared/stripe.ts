// Minimal Stripe Billing REST helper for Supabase Edge Functions.
// Uses fetch instead of stripe-node so functions stay Deno-native.

const STRIPE_API_BASE = 'https://api.stripe.com/v1'

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || ''

export interface StripeCustomer {
  id: string
}

export interface StripeCheckoutSession {
  id: string
  url: string
}

export interface StripePortalSession {
  id: string
  url: string
}

export interface StripeEvent {
  id: string
  type: string
  data: {
    object: Record<string, unknown>
  }
}

export interface StripeSubscription {
  id: string
  customer: string
  status: string
  current_period_end?: number
  metadata?: Record<string, string>
}

function appendParams(params: URLSearchParams, key: string, value: unknown): void {
  if (value === undefined || value === null) return
  if (typeof value === 'object' && !Array.isArray(value)) {
    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
      appendParams(params, `${key}[${childKey}]`, childValue)
    }
    return
  }
  params.append(key, String(value))
}

async function stripeRequest<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(body)) {
    appendParams(params, key, value)
  }

  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? (payload as { error?: { message?: string } }).error?.message
        : null
    throw new Error(message || `Stripe request failed: ${response.status}`)
  }

  return payload as T
}

export async function createStripeCustomer(params: {
  email: string
  name: string
  sellerId: string
  userId: string
}): Promise<StripeCustomer> {
  return stripeRequest<StripeCustomer>('/customers', {
    email: params.email,
    name: params.name,
    metadata: {
      seller_id: params.sellerId,
      user_id: params.userId,
    },
  })
}

export async function createStripeCheckoutSession(params: {
  customerId: string
  priceId: string
  sellerId: string
  successUrl: string
  cancelUrl: string
}): Promise<StripeCheckoutSession> {
  return stripeRequest<StripeCheckoutSession>('/checkout/sessions', {
    mode: 'subscription',
    customer: params.customerId,
    'line_items[0][price]': params.priceId,
    'line_items[0][quantity]': 1,
    allow_promotion_codes: true,
    client_reference_id: params.sellerId,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      seller_id: params.sellerId,
    },
    subscription_data: {
      metadata: {
        seller_id: params.sellerId,
      },
    },
  })
}

export async function createStripePortalSession(params: {
  customerId: string
  returnUrl: string
}): Promise<StripePortalSession> {
  return stripeRequest<StripePortalSession>('/billing_portal/sessions', {
    customer: params.customerId,
    return_url: params.returnUrl,
  })
}

function parseStripeSignature(header: string): { timestamp: string | null; signatures: string[] } {
  const parts = header.split(',').map((part) => part.trim())
  let timestamp: string | null = null
  const signatures: string[] = []
  for (const part of parts) {
    const [key, value] = part.split('=', 2)
    if (key === 't') timestamp = value ?? null
    if (key === 'v1' && value) signatures.push(value)
  }
  return { timestamp, signatures }
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

export async function verifyStripeSignature(params: {
  payload: string
  signatureHeader: string | null
  webhookSecret: string
  toleranceSeconds?: number
}): Promise<boolean> {
  if (!params.signatureHeader || !params.webhookSecret) return false

  const { timestamp, signatures } = parseStripeSignature(params.signatureHeader)
  if (!timestamp || signatures.length === 0) return false

  const timestampSeconds = Number(timestamp)
  if (!Number.isFinite(timestampSeconds)) return false

  const tolerance = params.toleranceSeconds ?? 300
  const nowSeconds = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSeconds - timestampSeconds) > tolerance) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(params.webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signedPayload = `${timestamp}.${params.payload}`
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload))
  const expected = bytesToHex(digest)

  return signatures.some((signature) => timingSafeEqual(signature, expected))
}
