import { supabase } from '@/lib/supabase'
import { isTransientAuthError } from '@/lib/auth-errors'
import { logger } from '@/lib/logger'

// Deduped: rapid repeat clicks on a failing action must not stack checks.
let checking = false

/**
 * Recovery for the looks-logged-in-but-session-is-dead state: an edge
 * function answered 401 while the client still holds a session. PostgREST
 * only checks the JWT signature, so data queries keep succeeding after the
 * session is revoked server-side (e.g. a global sign-out from another tab) —
 * the app renders normally while every edge action 401s. Confirm the verdict
 * with getUser() and, if the session is definitively dead, clear it locally;
 * ProtectedRoute redirects to login as soon as the user state clears.
 *
 * No-ops for guests (no local session) and on transient getUser failures —
 * flaky network must never log anyone out.
 */
export async function recoverIfSessionDead(): Promise<void> {
  if (checking) return
  checking = true
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return
    const { error } = await supabase.auth.getUser()
    if (!error || isTransientAuthError(error)) return
    logger.warn('Edge function 401 with a revoked session — clearing local session')
    await supabase.auth.signOut({ scope: 'local' })
  } catch (err) {
    // Called fire-and-forget from the error path — never throw back into it.
    logger.error('Dead-session recovery failed:', err)
  } finally {
    checking = false
  }
}
