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
 * - retry 1: one transparent retry absorbs transient blips without making a
 *   real outage feel hung; error states render after ~2 attempts.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})
