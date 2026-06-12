// Shared Dintero client for Supabase Edge Functions (Deno).
// Thin REST wrapper — Dintero's first-party SDK is Node-only.
//
// Env vars required:
//   DINTERO_ACCOUNT_ID      T-prefix (sandbox) or P-prefix (prod)
//   DINTERO_CLIENT_ID
//   DINTERO_CLIENT_SECRET
//   DINTERO_WEBHOOK_SECRET  HMAC-SHA256 secret for session callbacks.
//                           Minted via: POST https://checkout.dintero.com/v1/admin/signature
//                           (returns { signature: { secret } }). This host, not api.dintero.com.
//   DINTERO_PROFILE_ID      Checkout profile, default "default"
//
// Bases:
//   https://checkout.dintero.com  — sessions, transactions
//   https://api.dintero.com       — auth, accounts, sellers (payout destinations)

const CHECKOUT_BASE = 'https://checkout.dintero.com'
const API_BASE = 'https://api.dintero.com'

const accountId = Deno.env.get('DINTERO_ACCOUNT_ID') || ''
const clientId = Deno.env.get('DINTERO_CLIENT_ID') || ''
const clientSecret = Deno.env.get('DINTERO_CLIENT_SECRET') || ''

// Module-level token cache. Edge functions may reuse warm instances.
interface CachedToken {
  token: string
  expiresAt: number
}
let cachedToken: CachedToken | null = null

// ---------- Shared types ----------

export interface DinteroSplit {
  payout_destination_id: string
  amount: number
}

export interface DinteroOrderItem {
  id: string
  line_id: string
  description: string
  quantity: number
  amount: number
  vat_amount?: number
  vat?: number
  splits?: DinteroSplit[]
}

export interface DinteroSessionRequest {
  url: {
    return_url: string
    callback_url: string
  }
  order: {
    amount: number
    currency: string
    merchant_reference: string
    vat_amount?: number
    items: DinteroOrderItem[]
  }
  configuration?: {
    auto_capture?: boolean
  }
  profile_id: string
}

export interface DinteroSessionResponse {
  id: string
  url: string
}

// Entry in the transaction's event log. Per the Checkout API spec, `amount`
// on a CAPTURE/REFUND event is the "Amount captured or refunded" (øre) —
// the transaction's top-level `amount` stays the ORDER amount and never
// reflects refunds.
export interface DinteroTransactionEvent {
  event?: string
  success?: boolean
  amount?: number
  created_at?: string
}

export interface DinteroTransaction {
  id: string
  status:
    | 'INITIATED'
    | 'AUTHORIZED'
    | 'CAPTURED'
    | 'PARTIALLY_CAPTURED'
    | 'REFUNDED'
    | 'PARTIALLY_REFUNDED'
    | 'AUTHORIZATION_VOIDED'
    | 'FAILED'
    | 'DECLINED'
  amount: number
  currency: string
  merchant_reference?: string
  session_id?: string
  payment_product?: string
  metadata?: Record<string, unknown>
  events?: DinteroTransactionEvent[]
}

/**
 * Total refunded amount in øre, summed from successful REFUND entries in the
 * transaction's event log. This is the only place Dintero exposes refunded
 * amounts — `transaction.amount` is the order amount, NOT the refunded amount.
 *
 * Returns null when the amount cannot be derived (no events array, no REFUND
 * events, or a REFUND event without a numeric amount). Callers must treat
 * null as "unknown", never as zero.
 */
export function sumRefundedOre(transaction: DinteroTransaction): number | null {
  if (!Array.isArray(transaction.events)) return null
  let sum = 0
  let found = false
  for (const ev of transaction.events) {
    if (ev?.event !== 'REFUND') continue
    if (ev.success === false) continue
    // A completed refund with no usable amount poisons the sum — bail out
    // rather than silently undercounting.
    if (typeof ev.amount !== 'number' || !Number.isFinite(ev.amount)) return null
    sum += ev.amount
    found = true
  }
  return found ? sum : null
}

export interface DinteroBankAccount {
  account_number?: string
  account_number_type?: 'bban' | 'iban'
  bank_name?: string
  bank_account_currency: string
  payout_currency: string
  account_statement_url?: string
  legal_entity_name?: string
}

export interface DinteroSellerApprovalRequest {
  country_code?: string
  organization_number?: string
  currency?: string
  payout_destination_id: string
  payout_reference: string
  business_name?: string
  payout_destination_name?: string
  payout_destination_description?: string
  payout_interval_type?: string
  bank_accounts: DinteroBankAccount[]
  form_submitter?: {
    email: string
    name?: string
  }
}

export interface DinteroLink {
  rel: string
  href: string
}

export type DinteroCaseStatus =
  | 'PENDING'
  | 'WAITING_FOR_DECLARATION'
  | 'WAITING_FOR_SIGNATURE'
  | 'ACTIVE'
  | 'DECLINED'
  | 'TERMINATED'

export interface DinteroSellerApproval {
  id: string
  case_status: DinteroCaseStatus
  payout_destination_id?: string
  business_name?: string
  organization_number?: string
  links?: DinteroLink[]
}

// ---------- Auth ----------

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token
  }

  if (!accountId || !clientId || !clientSecret) {
    throw new Error('Dintero credentials not configured')
  }

  const url = `${API_BASE}/v1/accounts/${accountId}/auth/token`
  const audience = `${API_BASE}/v1/accounts/${accountId}`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + btoa(`${clientId}:${clientSecret}`),
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      audience,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Dintero auth failed: ${res.status} ${text}`)
  }

  const payload = (await res.json()) as { access_token: string; expires_in?: number }
  const expiresInMs = (payload.expires_in ?? 3600) * 1000

  cachedToken = {
    token: payload.access_token,
    expiresAt: now + expiresInMs,
  }

  return payload.access_token
}

// ---------- Typed fetch ----------

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

async function dinteroFetch<T>(
  baseUrl: string,
  method: Method,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getAccessToken()
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const text = await res.text()

  if (!res.ok) {
    throw new Error(`Dintero ${method} ${path} -> ${res.status}: ${text}`)
  }

  if (!text) {
    return {} as T
  }

  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Dintero ${method} ${path}: invalid JSON response`)
  }
}

// GET against the accounts API (api.dintero.com) that degrades gracefully:
// 404 and empty bodies both resolve to null (sandbox payout/settlement reads
// routinely 404). Reuses the cached access token from getAccessToken(), so
// callers don't mint a fresh token per request.
export async function dinteroGet<T>(path: string): Promise<T | null> {
  const token = await getAccessToken()
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  if (res.status === 404) return null
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Dintero GET ${path} -> ${res.status}: ${text}`)
  }
  const text = await res.text()
  if (!text) return null
  return JSON.parse(text) as T
}

// ---------- Checkout / Transactions ----------

export function createSession(req: DinteroSessionRequest): Promise<DinteroSessionResponse> {
  return dinteroFetch<DinteroSessionResponse>(CHECKOUT_BASE, 'POST', '/v1/sessions-profile', req)
}

export function getTransaction(transactionId: string): Promise<DinteroTransaction> {
  return dinteroFetch<DinteroTransaction>(CHECKOUT_BASE, 'GET', `/v1/transactions/${transactionId}`)
}

export function captureTransaction(
  transactionId: string,
  amount: number,
  captureReference?: string,
): Promise<DinteroTransaction> {
  return dinteroFetch<DinteroTransaction>(
    CHECKOUT_BASE,
    'POST',
    `/v1/transactions/${transactionId}/capture`,
    captureReference === undefined
      ? { amount }
      : { amount, capture_reference: captureReference },
  )
}

/**
 * Idempotent capture. Re-fetches the live transaction first and short-circuits
 * if it's already CAPTURED or PARTIALLY_CAPTURED — that happens when both the
 * webhook and the client-driven finalize race to capture the same authorization.
 * Without this guard, the loser treats Dintero's "already captured" error as a
 * capture failure and stomps signups.payment_status back to 'failed'.
 *
 * Returns the final transaction state (whatever capture path produced it).
 */
export async function captureIfAuthorized(
  transactionId: string,
  amount: number,
  captureReference?: string,
): Promise<DinteroTransaction> {
  const current = await getTransaction(transactionId)
  if (current.status === 'CAPTURED' || current.status === 'PARTIALLY_CAPTURED') {
    return current
  }
  if (current.status !== 'AUTHORIZED') {
    throw new Error(
      `cannot capture transaction in status ${current.status}`,
    )
  }
  return captureTransaction(transactionId, amount, captureReference)
}

export function refundTransaction(
  transactionId: string,
  amount: number,
  reason?: string,
): Promise<DinteroTransaction> {
  return dinteroFetch<DinteroTransaction>(
    CHECKOUT_BASE,
    'POST',
    `/v1/transactions/${transactionId}/refund`,
    reason === undefined ? { amount } : { amount, reason },
  )
}

export function voidTransaction(transactionId: string): Promise<DinteroTransaction> {
  return dinteroFetch<DinteroTransaction>(
    CHECKOUT_BASE,
    'POST',
    `/v1/transactions/${transactionId}/void`,
    {},
  )
}

/** List transactions filtered by session_id. Used by the sweep cron to recover orphaned pending attempts. */
export function listTransactionsForSession(sessionId: string): Promise<DinteroTransaction[]> {
  return dinteroFetch<DinteroTransaction[]>(
    CHECKOUT_BASE,
    'GET',
    `/v1/transactions?session_id=${encodeURIComponent(sessionId)}`,
  )
}

// ---------- Seller approvals (Split Payout onboarding) ----------

export function createSellerApproval(
  req: DinteroSellerApprovalRequest,
): Promise<DinteroSellerApproval> {
  return dinteroFetch<DinteroSellerApproval>(
    API_BASE,
    'POST',
    `/v1/accounts/${accountId}/management/settings/approvals/payout-destinations`,
    req,
  )
}

// List response is { payout_destinations: [...] }, observed empirically.
// Fallback to `approvals` or bare array in case of schema variance across accounts.
type ApprovalListResponse =
  | { payout_destinations?: DinteroSellerApproval[]; approvals?: DinteroSellerApproval[] }
  | DinteroSellerApproval[]

function unwrapApprovalList(list: ApprovalListResponse): DinteroSellerApproval[] {
  if (Array.isArray(list)) return list
  return list.payout_destinations ?? list.approvals ?? []
}

export async function getSellerApproval(approvalId: string): Promise<DinteroSellerApproval> {
  const list = await dinteroFetch<ApprovalListResponse>(
    API_BASE,
    'GET',
    `/v1/accounts/${accountId}/management/settings/approvals/payout-destinations`,
  )
  const match = unwrapApprovalList(list).find((a) => a.id === approvalId)
  if (!match) {
    throw new Error(`Seller approval ${approvalId} not found`)
  }
  return match
}

export function listSellerApprovals(): Promise<DinteroSellerApproval[]> {
  return dinteroFetch<ApprovalListResponse>(
    API_BASE,
    'GET',
    `/v1/accounts/${accountId}/management/settings/approvals/payout-destinations`,
  ).then(unwrapApprovalList)
}

// ---------- Signature verification ----------

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9a-f]/gi, '')
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16)
  }
  return bytes
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i]
  }
  return diff === 0
}

async function hmac(
  algorithm: 'SHA-1' | 'SHA-256',
  secret: string,
  message: Uint8Array,
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: algorithm },
    false,
    ['sign'],
  )
  const messageBuffer = message.buffer.slice(
    message.byteOffset,
    message.byteOffset + message.byteLength,
  ) as ArrayBuffer
  return crypto.subtle.sign('HMAC', key, messageBuffer)
}

/**
 * Build canonical signed string for session callback_url verification.
 * Format: {timestamp}\n{account_id}\n{METHOD}\n{hostname}\n{pathname}\n{sorted_query}
 * Query param values with spaces are encoded as `+` (not %20).
 */
function buildCanonicalString(
  timestamp: string,
  accountIdValue: string,
  method: string,
  hostname: string,
  pathname: string,
  query: string,
): string {
  return [timestamp, accountIdValue, method.toUpperCase(), hostname, pathname, query].join('\n')
}

function sortQueryString(query: string): string {
  if (!query) return ''
  const params = query.replace(/^\?/, '').split('&').filter(Boolean)
  const parsed = params
    .map((pair) => {
      const eq = pair.indexOf('=')
      if (eq === -1) return [pair, '']
      return [pair.slice(0, eq), pair.slice(eq + 1)]
    })
    .map(([k, v]) => [k, v.replace(/%20/g, '+')] as [string, string])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return parsed.map(([k, v]) => `${k}=${v}`).join('&')
}

/**
 * Structured result for callback signature verification. When the boolean
 * `ok` is false, `reason` and the other diagnostics explain why — safe to
 * log (no secrets included, only the computed + provided hashes).
 */
export interface CallbackSignatureResult {
  ok: boolean
  reason?: string
  /** Canonical string that was HMAC-signed (sans secret). Safe to log. */
  canonical?: string
  /** Our computed HMAC hex. Safe to log. */
  computedHex?: string
  /** The HMAC the caller claims they signed. Safe to log. */
  providedHex?: string
  /** Timestamp from the header (epoch seconds). */
  timestamp?: string
  /** Echoed inputs for post-mortem diffing. */
  accountId?: string
  method?: string
  hostname?: string
  pathname?: string
  query?: string
}

/**
 * Verify a Dintero session `callback_url` signature.
 *
 * The Dintero-Signature header looks like: `t=1738231234,v0-hmac-sha256=abcdef...`.
 * Verifies the HMAC-SHA256 over the canonical string and rejects timestamps older
 * than 5 minutes (replay protection).
 *
 * Returns a boolean by default. Use `verifyCallbackSignatureDetailed` if you
 * need diagnostics on why a verification failed — useful when Supabase's
 * edge runtime rewrites hostname/pathname and the signature computed by the
 * client no longer matches.
 */
export async function verifyCallbackSignature(params: {
  method: string
  url: URL
  header: string | null
  secret: string
}): Promise<boolean> {
  return (await verifyCallbackSignatureDetailed(params)).ok
}

export async function verifyCallbackSignatureDetailed(params: {
  method: string
  url: URL
  header: string | null
  secret: string
}): Promise<CallbackSignatureResult> {
  if (!params.header) return { ok: false, reason: 'missing_header' }
  if (!params.secret) return { ok: false, reason: 'missing_secret' }

  const parts = params.header.split(',')
  const tPart = parts.find((p) => p.trim().startsWith('t='))
  const sigPart = parts.find((p) => p.trim().startsWith('v0-hmac-sha256='))
  if (!tPart || !sigPart) return { ok: false, reason: 'malformed_header' }

  const timestamp = tPart.trim().slice(2)
  const provided = sigPart.trim().slice('v0-hmac-sha256='.length)

  const tsNum = parseInt(timestamp, 10)
  if (!Number.isFinite(tsNum)) {
    return { ok: false, reason: 'invalid_timestamp', timestamp }
  }
  const nowSec = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSec - tsNum) > 5 * 60) {
    return {
      ok: false,
      reason: 'timestamp_outside_replay_window',
      timestamp,
    }
  }

  const query = sortQueryString(params.url.search)
  const canonical = buildCanonicalString(
    timestamp,
    accountId,
    params.method,
    params.url.hostname,
    params.url.pathname,
    query,
  )

  const encoder = new TextEncoder()
  const digest = await hmac('SHA-256', params.secret, encoder.encode(canonical))
  const computedHex = bytesToHex(digest)

  const providedBytes = hexToBytes(provided)
  const computedBytes = hexToBytes(computedHex)

  const match = timingSafeEqual(providedBytes, computedBytes)
  if (match) {
    return { ok: true }
  }
  return {
    ok: false,
    reason: 'hmac_mismatch',
    canonical,
    computedHex,
    providedHex: provided,
    timestamp,
    accountId,
    method: params.method,
    hostname: params.url.hostname,
    pathname: params.url.pathname,
    query,
  }
}

/**
 * Roundtrip selftest. Signs a synthetic canonical string with the given
 * secret, then verifies it back via the same code path. Proves the
 * sign-side and verify-side agree on every byte. Use in a smoke test to
 * isolate "our code is broken" from "the caller's canonical string
 * doesn't match ours".
 */
export async function signCallbackForTest(params: {
  method: string
  url: URL
  timestamp: string
  secret: string
}): Promise<string> {
  const query = sortQueryString(params.url.search)
  const canonical = buildCanonicalString(
    params.timestamp,
    accountId,
    params.method,
    params.url.hostname,
    params.url.pathname,
    query,
  )
  const encoder = new TextEncoder()
  const digest = await hmac('SHA-256', params.secret, encoder.encode(canonical))
  const sig = bytesToHex(digest)
  return `t=${params.timestamp},v0-hmac-sha256=${sig}`
}

/**
 * Verify a Dintero hook-subscription signature.
 *
 * Different mechanism from session callback_url:
 *   - Header is `event-signature`
 *   - Algorithm is HMAC-SHA1
 *   - Signs the raw JSON body directly (no canonical string)
 */
export async function verifyHookSubscriptionSignature(params: {
  rawBody: string
  header: string | null
  secret: string
}): Promise<boolean> {
  if (!params.header || !params.secret) return false
  const encoder = new TextEncoder()
  const digest = await hmac('SHA-1', params.secret, encoder.encode(params.rawBody))
  const computed = bytesToHex(digest)
  const providedBytes = hexToBytes(params.header)
  const computedBytes = hexToBytes(computed)
  return timingSafeEqual(providedBytes, computedBytes)
}

// ---------- Helpers ----------

export function getProfileId(): string {
  return Deno.env.get('DINTERO_PROFILE_ID') || 'default'
}

export function getAccountId(): string {
  return accountId
}

export function isSandbox(): boolean {
  return accountId.startsWith('T')
}
