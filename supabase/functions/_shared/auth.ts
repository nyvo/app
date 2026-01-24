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
 * Verify that the authenticated user is a member of the organization
 * and optionally check their role
 */
export async function verifyOrgMembership(
  userId: string,
  organizationId: string,
  requiredRoles?: string[]
): Promise<AuthorizationResult> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: member, error } = await supabase
    .from('org_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .single()

  if (error || !member) {
    return { authorized: false, error: 'Not a member of this organization' }
  }

  if (requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.includes(member.role)) {
      return { authorized: false, role: member.role, error: `Requires role: ${requiredRoles.join(' or ')}` }
    }
  }

  return { authorized: true, role: member.role }
}

/**
 * Combined auth check: verify token and org membership
 */
export async function verifyAuthAndOrgMembership(
  req: Request,
  organizationId: string,
  requiredRoles?: string[]
): Promise<{ authenticated: boolean; authorized: boolean; userId?: string; role?: string; error?: string }> {
  const authResult = await verifyAuth(req)

  if (!authResult.authenticated) {
    return { authenticated: false, authorized: false, error: authResult.error }
  }

  const authzResult = await verifyOrgMembership(authResult.userId!, organizationId, requiredRoles)

  return {
    authenticated: true,
    authorized: authzResult.authorized,
    userId: authResult.userId,
    role: authzResult.role,
    error: authzResult.error
  }
}

/**
 * Get CORS headers with configurable origin
 */
export function getCorsHeaders(): Record<string, string> {
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || '*'
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

/**
 * Create an error response with proper CORS headers
 */
export function errorResponse(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } }
  )
}

/**
 * Create a success response with proper CORS headers
 */
export function successResponse(data: unknown, status: number = 200): Response {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } }
  )
}

/**
 * Handle CORS preflight request
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders() })
  }
  return null
}
