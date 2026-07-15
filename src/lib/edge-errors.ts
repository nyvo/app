/**
 * supabase.functions.invoke surfaces non-2xx responses as a generic
 * `FunctionsHttpError` with message "Edge Function returned a non-2xx status
 * code". The actual JSON body lives on `error.context` (a Response). Pull
 * the real message + status out so the UI can show something useful.
 *
 * Returns a normalized shape: `{ status, message }`. `status=0` means the
 * error wasn't an HTTP error at all (network failure, etc.).
 */
import { UNKNOWN_ERROR } from '@/lib/error-strings'
import { recoverIfSessionDead } from '@/lib/session-recovery'

export async function extractEdgeError(
  error: unknown,
): Promise<{ status: number; message: string }> {
  const ctx = (error as { context?: Response | undefined }).context
  if (ctx && typeof ctx.json === 'function') {
    const status = ctx.status ?? 0
    // A 401 from an edge function while the client holds a session means the
    // session was revoked elsewhere (e.g. a global sign-out from another tab):
    // RLS queries keep working on the signature-valid JWT, so the app looks
    // logged in while every edge action fails. Verify and clear the dead
    // session so the route guards send the user back to log in.
    if (status === 401) void recoverIfSessionDead()
    try {
      const body = (await ctx.json()) as { error?: string } | undefined
      if (body?.error) {
        return { status, message: body.error }
      }
      return { status, message: '' }
    } catch {
      // Body wasn't JSON — fall through.
    }
    return { status, message: '' }
  }
  return {
    status: 0,
    message: error instanceof Error ? error.message : UNKNOWN_ERROR,
  }
}
