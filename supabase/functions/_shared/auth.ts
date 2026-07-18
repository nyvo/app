// Shared authentication utilities for edge functions
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

export interface AuthResult {
  authenticated: boolean
  userId?: string
  error?: string
}

export interface AuthorizationResult {
  authorized: boolean
  role?: string
  error?: string
}

/**
 * Verify that the request has a valid JWT token
 * Returns the user ID if authenticated
 */
export async function verifyAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('authorization')

  if (!authHeader) {
    return { authenticated: false, error: 'Missing authorization header' }
  }

  const token = authHeader.replace('Bearer ', '')

  if (!token) {
    return { authenticated: false, error: 'Invalid authorization header format' }
  }

  // Create a client with the user's JWT to verify it
  const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '', {
    global: {
      headers: { Authorization: `Bearer ${token}` }
    }
  })

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { authenticated: false, error: error?.message || 'Invalid token' }
  }

  return { authenticated: true, userId: user.id }
}

/**
 * Verify that the authenticated user is a member of the seller
 * and optionally check their role
 */
export async function verifyOrgMembership(
  userId: string,
  sellerId: string,
  requiredRoles?: string[]
): Promise<AuthorizationResult> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: member, error } = await supabase
    .from('seller_members')
    .select('role')
    .eq('seller_id', sellerId)
    .eq('user_id', userId)
    .single()

  if (error || !member) {
    return { authorized: false, error: 'Not a member of this seller' }
  }

  if (requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.includes(member.role)) {
      return { authorized: false, role: member.role, error: `Requires role: ${requiredRoles.join(' or ')}` }
    }
  }

  return { authorized: true, role: member.role }
}

/**
 * Combined auth check: verify token and seller membership
 */
export async function verifyAuthAndOrgMembership(
  req: Request,
  sellerId: string,
  requiredRoles?: string[]
): Promise<{ authenticated: boolean; authorized: boolean; userId?: string; role?: string; error?: string }> {
  const authResult = await verifyAuth(req)

  if (!authResult.authenticated) {
    return { authenticated: false, authorized: false, error: authResult.error }
  }

  const authzResult = await verifyOrgMembership(authResult.userId!, sellerId, requiredRoles)

  return {
    authenticated: true,
    authorized: authzResult.authorized,
    userId: authResult.userId,
    role: authzResult.role,
    error: authzResult.error
  }
}

/**
 * Get CORS headers. Supports a whitelist of allowed origins — ALLOWED_ORIGIN
 * can be a comma-separated list, e.g.
 *   "https://www.raden.no,https://app.raden.no,http://localhost:5173"
 *
 * When the request's Origin matches any entry in the list, it's echoed back
 * in Access-Control-Allow-Origin. Local dev origins (localhost + 127.0.0.1
 * on common Vite ports) are always accepted, even when ALLOWED_ORIGIN is set
 * to a prod-only value — keeps staging/dev productive without loosening
 * prod behavior.
 *
 * Fallback when no origin is provided or no match: the first entry in
 * ALLOWED_ORIGIN, or https://www.raden.no.
 */
const LOCAL_DEV_ORIGIN_PATTERN =
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/

// Built-in defaults so the function works sanely even when ALLOWED_ORIGIN
// is unset or misconfigured. Covers prod + typical Vite dev ports.
const DEFAULT_WHITELIST = [
  'https://www.raden.no',
  'https://raden.no',
  // Legacy domain — redirects to raden.no; keep until the redirect has been
  // live long enough that no cached clients still call from it.
  'https://www.openspot.no',
  'https://openspot.no',
]

export function getCorsHeaders(origin?: string | null): Record<string, string> {
  const envValue = Deno.env.get('ALLOWED_ORIGIN') || ''
  const envEntries = envValue
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  // Union the env whitelist with the built-in defaults. Env additions take
  // precedence in iteration order; dedupe to keep it tidy.
  const whitelist = Array.from(new Set([...envEntries, ...DEFAULT_WHITELIST]))

  let allowedOrigin = whitelist[0]
  if (origin) {
    if (whitelist.includes(origin) || LOCAL_DEV_ORIGIN_PATTERN.test(origin)) {
      allowedOrigin = origin
    }
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    // Vary: Origin so caches don't serve the wrong ACAO to a different origin.
    Vary: 'Origin',
  }
}

/**
 * True when `origin` is an allowed app origin — a whitelisted prod origin
 * (ALLOWED_ORIGIN env + built-in defaults) or a localhost dev origin. Use this to
 * safely echo the caller's origin into redirect URLs (e.g. a Stripe return_url)
 * instead of trusting it blindly.
 */
export function isAllowedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false
  const envEntries = (Deno.env.get('ALLOWED_ORIGIN') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const whitelist = Array.from(new Set([...envEntries, ...DEFAULT_WHITELIST]))
  return whitelist.includes(origin) || LOCAL_DEV_ORIGIN_PATTERN.test(origin)
}

/**
 * Create an error response with proper CORS headers.
 * Pass the Request to echo the caller's origin (required for localhost dev
 * and any non-primary allowed origin). Falls back to the primary origin
 * when called without a Request.
 */
export function errorResponse(message: string, status: number, req?: Request): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...getCorsHeaders(req?.headers.get('origin')), 'Content-Type': 'application/json' } }
  )
}

/**
 * Create a success response with proper CORS headers. See errorResponse for
 * the Request-threading rationale.
 */
export function successResponse(data: unknown, status: number = 200, req?: Request): Response {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...getCorsHeaders(req?.headers.get('origin')), 'Content-Type': 'application/json' } }
  )
}

/**
 * Handle CORS preflight request. Echoes the caller's origin if it's in the
 * whitelist (see getCorsHeaders).
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req.headers.get('origin')) })
  }
  return null
}

/**
 * Client IP for rate-limit bucketing. Proxies APPEND to x-forwarded-for, so
 * the FIRST entry is client-supplied and spoofable — an attacker sending a
 * random XFF per request would get a fresh bucket every time, voiding the
 * limit entirely. The LAST entry is written by the closest trusted hop
 * (Supabase's edge), so key buckets on that.
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') || ''
  const parts = xff.split(',').map((p) => p.trim()).filter(Boolean)
  return parts[parts.length - 1] || 'unknown'
}

/**
 * Constant-time string compare for shared secrets (cron secret, service-role
 * key). Avoids the early-exit timing side channel of `===`. Returns false for
 * an empty expected secret so an unset env never authorizes.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

/**
 * Escape HTML special characters to prevent XSS in email templates.
 * Apply this to all user-supplied values before interpolating into HTML.
 */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
