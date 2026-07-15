// Auth-flow route constants. Kept separate from src/lib/routes.ts because
// these are referenced by auth components that intentionally avoid pulling
// in app-level dashboard routing. `dashboard` here is the post-login
// destination — must stay in sync with routes.dashboard.
export const AUTH_ROUTES = {
  auth: '/auth',
  callback: '/auth/callback',
  dashboard: '/overview',
  onboarding: '/onboarding',
} as const

// SessionStorage handshake between signInWithGoogle and AuthCallbackPage.
// createAuthStorage isolates PKCE verifier ownership per tab, preventing the
// known cross-tab deletion race. These keys remain a second line of defence:
// if a verifier is unavailable for another reason, the callback recognizes a
// Google return and silently restarts the flow once instead of showing a
// dead-link error. Session-scoped on purpose: the OAuth redirect returns to
// the same tab that set them.
export const OAUTH_PROVIDER_STORAGE_KEY = 'os-oauth-provider'
export const OAUTH_RETRIED_STORAGE_KEY = 'os-oauth-retried'

// Entry-context role intent (§ 21.3a). Carried as `?intent=` from the door
// the user walked in through (landing "Kom i gang" → seller, invite link →
// seller, public booking surfaces → buyer) so onboarding can skip the role
// chooser. Direct /auth visits have no intent and fall back to the chooser.
export type AuthIntent = 'buyer' | 'seller'

export function parseAuthIntent(value: string | null | undefined): AuthIntent | null {
  return value === 'buyer' || value === 'seller' ? value : null
}

// `?next=` comes from the URL, so treat it as untrusted: only allow
// same-origin absolute paths (no `//evil.com` protocol-relative redirects).
export function sanitizeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null
  return value
}

// Single source of truth for "where should this user land after auth".
// Used by every post-auth entry point (callback, OTP verify, ProtectedRoute)
// so the destination is decided *before* navigation — no /overview flash
// followed by a bounce to /onboarding. When onboarding is pending, `intent`
// and a non-default `fallback` ride along as query params so the role
// chooser can be skipped and the deep-link target survives onboarding.
export function resolvePostAuthDestination(
  profile: { onboarding_completed_at: string | null } | null,
  fallback: string = AUTH_ROUTES.dashboard,
  intent: AuthIntent | null = null,
): string {
  if (!profile?.onboarding_completed_at) {
    const params = new URLSearchParams()
    if (intent) params.set('intent', intent)
    if (fallback !== AUTH_ROUTES.dashboard) params.set('next', fallback)
    const query = params.toString()
    return query ? `${AUTH_ROUTES.onboarding}?${query}` : AUTH_ROUTES.onboarding
  }
  return fallback
}
