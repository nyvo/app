import { QueryClient } from '@tanstack/react-query'

/**
 * App-wide server-state client. One instance, module-level, so the cache
 * survives route changes (storefront → detail → back must not refetch what
 * was on screen two seconds ago).
 *
 * Defaults tuned for this product:
 * - staleTime 30s: course/spots data changes on the minutes scale; 30s keeps
 *   back-navigation instant while refetch-on-focus still repairs a kept-open
 *   tab (spots_available drifting stale was review finding H-status quo).
 * - retry: one transparent retry absorbs transient blips without making a
 *   real outage feel hung; error states render after ~2 attempts. Client
 *   errors (4xx — not found, forbidden, validation) are never transient, so
 *   they skip the retry and surface immediately.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  const status =
    (error as { status?: number } | undefined)?.status ??
    (error as { context?: { status?: number } } | undefined)?.context?.status
  if (typeof status === 'number' && status >= 400 && status < 500) return false
  return failureCount < 1
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: shouldRetry,
      refetchOnWindowFocus: true,
    },
  },
})
