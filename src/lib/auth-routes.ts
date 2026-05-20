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

// Single source of truth for "where should this user land after auth".
// Used by every post-auth entry point (callback, OTP verify, ProtectedRoute)
// so the destination is decided *before* navigation — no /overview flash
// followed by a bounce to /onboarding.
export function resolvePostAuthDestination(
  profile: { onboarding_completed_at: string | null } | null,
  fallback: string = AUTH_ROUTES.dashboard,
): string {
  if (!profile?.onboarding_completed_at) return AUTH_ROUTES.onboarding
  return fallback
}
