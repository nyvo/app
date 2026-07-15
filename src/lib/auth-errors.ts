// Classify an auth error from getUser(). Only clearly transient transport
// failures (offline fetch, 5xx, no-status/no-code) keep the session alive; a
// definitive verdict (401/403, deleted user → auth code + 4xx) signs out. Kept
// conservative on purpose: a genuinely deleted user must never stay signed in.
export function isTransientAuthError(error: {
  name?: string
  status?: number
  code?: string
}): boolean {
  if (error.name === 'AuthRetryableFetchError') return true
  const { status, code } = error
  if (typeof status === 'number' && status >= 500) return true
  if (status === 0) return true
  return status === undefined && !code
}
