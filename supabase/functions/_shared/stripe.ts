// Minimal Stripe REST helper for Supabase Edge Functions (Deno-native — fetch, no stripe-node).
// Covers two integrations that share STRIPE_SECRET_KEY:
//   1. Stripe Billing (Pro subscription) — customers, checkout/portal sessions, webhook verify.
//   2. Stripe Connect (marketplace) — Express onboarding, destination-charge PaymentIntents
//      (manual capture + on_behalf_of),
//      refunds, and settlement reporting.

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
  // Recent API versions report current_period_end on the item, not the sub.
  current_period_end?: number
  cancel_at_period_end?: boolean
  items?: { data?: Array<{ current_period_end?: number }> }
  metadata?: Record<string, string>
}

function appendParams(params: URLSearchParams, key: string, value: unknown): void {
  if (value === undefined || value === null) return
  if (Array.isArray(value)) {
    value.forEach((item, index) => appendParams(params, `${key}[${index}]`, item))
    return
  }
  if (typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
      appendParams(params, `${key}[${childKey}]`, childValue)
    }
    return
  }
  params.append(key, String(value))
}

interface StripeRequestOptions {
  method?: 'GET' | 'POST'
  // Act on a connected account (Connect) — sets the Stripe-Account header.
  stripeAccount?: string
  // Idempotency-Key header — safe retries for POSTs (e.g. PaymentIntent create).
  idempotencyKey?: string
}

async function stripeRequest<T>(
  path: string,
  body: Record<string, unknown>,
  options: StripeRequestOptions = {},
): Promise<T> {
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }

  const method = options.method ?? 'POST'
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(body)) {
    appendParams(params, key, value)
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${stripeSecretKey}`,
  }
  if (options.stripeAccount) headers['Stripe-Account'] = options.stripeAccount
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey

  let url = `${STRIPE_API_BASE}${path}`
  // Timeout: a hung Stripe connection would otherwise pin the isolate until
  // the platform's wall-clock kill — the hard-kill that leaves webhook-claim
  // tombstones and ambiguous capture states. A thrown timeout is handled by
  // callers (capture paths re-check the live PI before acting).
  const init: RequestInit = { method, headers, signal: AbortSignal.timeout(15_000) }
  if (method === 'GET') {
    const query = params.toString()
    if (query) url += `?${query}`
  } else {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    init.body = params
  }

  const response = await fetch(url, init)

  // Parse the body once. A non-JSON 2xx (gateway/outage page) must surface as a real error
  // rather than returning `null as T` and crashing the caller on the first field access.
  const text = await response.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? (payload as { error?: { message?: string } }).error?.message
        : null
    throw new Error(message || `Stripe request failed: ${response.status}`)
  }

  if (payload === null) {
    throw new Error(`Stripe returned a non-JSON body for ${path} (status ${response.status})`)
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
    // 25% MVA via Stripe Tax. Prices are ex-VAT (dashboard "Include in prices
    // → No"), so tax is added on top. Collect + persist the buyer's address so
    // Stripe can locate the sale (Norway), and let B2B buyers add their org-nr.
    automatic_tax: { enabled: true },
    billing_address_collection: 'required',
    customer_update: { address: 'auto' },
    tax_id_collection: { enabled: true },
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

const LIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'past_due'])

/**
 * Live (billable) subscriptions for a customer — active, trialing or past_due.
 * Deliberately EXCLUDES 'incomplete' / 'canceled' so an abandoned checkout never
 * blocks a legitimate retry. Used to enforce one subscription per seller before
 * opening a new checkout, since the DB plan flag lags the webhook.
 */
export async function listLiveSubscriptions(customerId: string): Promise<StripeSubscription[]> {
  const list = await stripeRequest<StripeList<StripeSubscription>>(
    '/subscriptions',
    { customer: customerId, limit: 100 },
    { method: 'GET' },
  )
  return (list.data ?? []).filter((sub) => LIVE_SUBSCRIPTION_STATUSES.has(sub.status))
}

export interface StripeSubscriptionItemDetail {
  id: string
  price: { id: string; recurring?: { interval?: string } }
}

/** Full subscription detail (with price/interval per item) — used when repricing a plan swap. */
export async function retrieveSubscription(
  subscriptionId: string,
): Promise<StripeSubscription & { items?: { data?: StripeSubscriptionItemDetail[] } }> {
  return stripeRequest(`/subscriptions/${subscriptionId}`, {}, { method: 'GET' })
}

/**
 * Swap a subscription item onto a new price. `proration_behavior: 'none'` means the new
 * price applies from the next invoice rather than generating an immediate proration charge.
 */
export async function updateSubscriptionItemPrice(params: {
  subscriptionId: string
  itemId: string
  priceId: string
}): Promise<{ id: string }> {
  return stripeRequest<{ id: string }>(`/subscriptions/${params.subscriptionId}`, {
    items: [{ id: params.itemId, price: params.priceId }],
    proration_behavior: 'none',
  })
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

// ---------------------------------------------------------------------------
// Stripe Connect (marketplace) — Express onboarding, destination charges, settlements.
// Shares STRIPE_SECRET_KEY with Billing above.
// ---------------------------------------------------------------------------

export interface StripeConnectedAccount {
  id: string
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  requirements?: {
    currently_due?: string[]
    past_due?: string[]
    pending_verification?: string[]
    disabled_reason?: string | null
  }
  capabilities?: Record<string, string>
}

export interface StripeAccountLink {
  url: string
  expires_at: number
}

export interface StripeLoginLink {
  object?: 'login_link'
  created?: number
  url: string
}

export interface StripePaymentIntent {
  id: string
  status: string
  client_secret?: string
  amount: number
  currency: string
  amount_capturable?: number
  amount_received?: number
  latest_charge?: string
  on_behalf_of?: string | null
  metadata?: Record<string, string>
}

export interface StripeRefund {
  id: string
  status: string
  amount: number
}

export interface StripeCharge {
  id: string
  amount: number
  amount_refunded: number
  refunded: boolean
  payment_intent: string | null
}

export interface StripeMoney {
  amount: number
  currency: string
}

export interface StripeBalance {
  available: StripeMoney[]
  pending: StripeMoney[]
}

export interface StripePayout {
  id: string
  amount: number
  currency: string
  status: string
  arrival_date: number
  created: number
}

export interface StripeList<T> {
  object: 'list'
  data: T[]
  has_more: boolean
  url: string
}

// --- Onboarding / connected accounts (platform-context calls) ---

/**
 * Create an Express connected account. Vipps is deferred until the private preview is
 * enrolled, so the default capabilities are card_payments + transfers; add 'vipps_payments'
 * to `capabilities` once the platform is granted preview access (plan C2).
 */
export async function createConnectedAccount(params: {
  sellerId: string
  country?: string
  email?: string
  businessType?: 'individual' | 'company'
  businessName?: string
  organizationNumber?: string
  capabilities?: string[]
}): Promise<StripeConnectedAccount> {
  const requested = params.capabilities ?? ['card_payments', 'transfers']
  const capabilities: Record<string, { requested: boolean }> = {}
  for (const capability of requested) capabilities[capability] = { requested: true }

  // Prefill the org number/name only when provided (plan C7 — we still keep our own copy on
  // sellers.organization_number because Stripe never echoes company.tax_id back).
  const company =
    params.organizationNumber || params.businessName
      ? {
          ...(params.organizationNumber ? { tax_id: params.organizationNumber } : {}),
          ...(params.businessName ? { name: params.businessName } : {}),
        }
      : undefined

  return stripeRequest<StripeConnectedAccount>('/accounts', {
    type: 'express',
    country: params.country ?? 'NO',
    email: params.email,
    business_type: params.businessType,
    company,
    capabilities,
    metadata: { seller_id: params.sellerId },
  })
}

/** Hosted Express onboarding link the studio is redirected to. */
export async function createAccountLink(params: {
  accountId: string
  refreshUrl: string
  returnUrl: string
}): Promise<StripeAccountLink> {
  return stripeRequest<StripeAccountLink>('/account_links', {
    account: params.accountId,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: 'account_onboarding',
  })
}

/** Current account state — drives stripe_onboarding_complete / stripe_account_status. */
export async function retrieveAccount(accountId: string): Promise<StripeConnectedAccount> {
  return stripeRequest<StripeConnectedAccount>(`/accounts/${accountId}`, {}, { method: 'GET' })
}

/** Single-use link into the studio's Express dashboard. */
export async function createLoginLink(accountId: string): Promise<StripeLoginLink> {
  return stripeRequest<StripeLoginLink>(`/accounts/${accountId}/login_links`, {})
}

// --- Settlements (connected-account context via the Stripe-Account header) ---

export async function retrieveBalance(accountId: string): Promise<StripeBalance> {
  return stripeRequest<StripeBalance>('/balance', {}, { method: 'GET', stripeAccount: accountId })
}

export async function listPayouts(params: {
  accountId: string
  limit?: number
}): Promise<StripeList<StripePayout>> {
  return stripeRequest<StripeList<StripePayout>>(
    '/payouts',
    { limit: params.limit ?? 10 },
    { method: 'GET', stripeAccount: params.accountId },
  )
}

// --- Payments: destination charge, manual capture, on_behalf_of (plan C1/C4/C6/C7) ---

/**
 * Create the buyer-facing PaymentIntent. The charge is owned by the PLATFORM (destination
 * charge), so this is a platform-context call — no Stripe-Account header.
 * - capture_method 'manual' (C1): authorize now; capture in the webhook after the capacity check.
 * - on_behalf_of (C7): the studio is the merchant of record (its statement descriptor + VAT).
 * - application_fee_amount: the platform service fee, pulled back automatically.
 * - metadata.attempt_id (C4): round-trips on every webhook event.
 * Idempotency-Key = attemptId so a retried create returns the same PaymentIntent.
 */
export async function createPaymentIntent(params: {
  amount: number
  applicationFeeAmount: number
  sellerAccountId: string
  attemptId: string
  currency?: string
}): Promise<StripePaymentIntent> {
  return stripeRequest<StripePaymentIntent>(
    '/payment_intents',
    {
      amount: params.amount,
      currency: params.currency ?? 'nok',
      // Manual capture is mandatory — the capacity-check pattern (C1) captures in the webhook.
      // Not parameterized so it can't be bypassed. The frontend confirms via Stripe Elements,
      // so we never pass confirm: true here.
      capture_method: 'manual',
      on_behalf_of: params.sellerAccountId,
      transfer_data: { destination: params.sellerAccountId },
      application_fee_amount: params.applicationFeeAmount,
      automatic_payment_methods: { enabled: true },
      metadata: { attempt_id: params.attemptId },
    },
    { idempotencyKey: params.attemptId },
  )
}

/** Capture an authorized (requires_capture) PaymentIntent. Omit amount to capture in full. */
export async function capturePaymentIntent(
  paymentIntentId: string,
  amountToCapture?: number,
): Promise<StripePaymentIntent> {
  return stripeRequest<StripePaymentIntent>(
    `/payment_intents/${paymentIntentId}/capture`,
    amountToCapture !== undefined ? { amount_to_capture: amountToCapture } : {},
  )
}

/** Cancel/void an uncaptured PaymentIntent (no capacity, abandoned checkout, etc.). */
export async function cancelPaymentIntent(paymentIntentId: string): Promise<StripePaymentIntent> {
  return stripeRequest<StripePaymentIntent>(`/payment_intents/${paymentIntentId}/cancel`, {})
}

export async function retrievePaymentIntent(paymentIntentId: string): Promise<StripePaymentIntent> {
  return stripeRequest<StripePaymentIntent>(`/payment_intents/${paymentIntentId}`, {}, { method: 'GET' })
}

/**
 * Retrieve a charge to inspect its live refund state. Used by the cancel/refund paths to
 * reconcile against Stripe before issuing a refund: a fully-refunded charge (amount_refunded
 * >= amount) is an idempotent success, not a refund to repeat; a partially-refunded charge
 * (0 < amount_refunded < amount) is surfaced for manual handling (no partial refunds in the UI).
 */
export async function retrieveCharge(chargeId: string): Promise<StripeCharge> {
  return stripeRequest<StripeCharge>(`/charges/${chargeId}`, {}, { method: 'GET' })
}

/**
 * Refund a captured charge.
 * - reverseTransfer=true claws the funds back proportionally from the studio (plan C6).
 * - refundApplicationFee=true also returns the platform service fee to the buyer.
 * Omit `amount` for a full refund. Partial refunds are not exposed in the UI yet (C6),
 * so the typical call is a full refund with both flags true.
 */
export async function refundPaymentIntent(params: {
  paymentIntentId: string
  amount?: number
  reverseTransfer?: boolean
  refundApplicationFee?: boolean
}): Promise<StripeRefund> {
  return stripeRequest<StripeRefund>('/refunds', {
    payment_intent: params.paymentIntentId,
    amount: params.amount,
    // Default true per C6: the supported mode is a full refund where the studio's transfer is
    // reversed and the platform service fee is returned. Pass false only to deliberately have
    // the platform absorb the refund.
    reverse_transfer: params.reverseTransfer ?? true,
    refund_application_fee: params.refundApplicationFee ?? true,
  })
}
