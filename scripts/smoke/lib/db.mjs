// scripts/smoke/lib/db.mjs
//
// Supabase client factory. Importing this module never creates a client or
// throws — clients are created lazily on first call so `run.mjs --confirm`'s
// plan-printing path (and any test that doesn't need DB access) never
// requires SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from '@supabase/supabase-js'
import { env } from './env.mjs'

let serviceClient = null
let anonClient = null

/**
 * Service-role client — bypasses RLS. Needed to read signups/payment_attempts
 * (RLS-protected) and for cleanup.mjs's deletes. SUPABASE_SERVICE_ROLE_KEY is
 * NOT currently in .env.local (by design — it's not committed); this throws a
 * clear, actionable error the first time something actually needs it.
 */
export function getServiceClient() {
  if (serviceClient) return serviceClient
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY not set in .env.local — needed for DB assertions/cleanup. ' +
        'Get it from Supabase Dashboard → Project Settings → API → service_role key, and add it ' +
        'to .env.local (never commit it).',
    )
  }
  if (!env.VITE_SUPABASE_URL) {
    throw new Error('VITE_SUPABASE_URL not set in .env.local — cannot create a Supabase client')
  }
  serviceClient = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return serviceClient
}

/**
 * Fresh, NON-cached anon-key client for flows that sign in a user (e.g.
 * fixtures.sellerOwnerAuthHeader). Signing in on the shared getAnonClient()
 * attaches that user's JWT to every later "anon" read — which made F3 report
 * the seller's own signups as an anon RLS leak. Auth flows must use their own
 * client so the shared one stays genuinely anonymous.
 */
export function createAuthClient() {
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
    throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set in .env.local')
  }
  return createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Anon client — subject to RLS. Used for F3 spot-checks and guest-flow reads. */
export function getAnonClient() {
  if (anonClient) return anonClient
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
    throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set in .env.local')
  }
  anonClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return anonClient
}
