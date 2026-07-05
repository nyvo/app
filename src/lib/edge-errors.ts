/**
 * supabase.functions.invoke surfaces non-2xx responses as a generic
 * `FunctionsHttpError` with message "Edge Function returned a non-2xx status
 * code". The actual JSON body lives on `error.context` (a Response). Pull
 * the real message + status out so the UI can show something useful.
 *
 * Returns a normalized shape: `{ status, message }`. `status=0` means the
 * error wasn't an HTTP error at all (network failure, etc.).
 */
export async function extractEdgeError(
  error: unknown,
): Promise<{ status: number; message: string }> {
  const ctx = (error as { context?: Response | undefined }).context
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = (await ctx.json()) as { error?: string } | undefined
      if (body?.error) {
        return { status: ctx.status ?? 0, message: body.error }
      }
      return { status: ctx.status ?? 0, message: '' }
    } catch {
      // Body wasn't JSON — fall through.
    }
    return { status: ctx.status ?? 0, message: '' }
  }
  return {
    status: 0,
    message: error instanceof Error ? error.message : 'Ukjent feil',
  }
}
