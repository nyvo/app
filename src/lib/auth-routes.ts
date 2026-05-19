// Auth-flow route constants. Kept separate from src/lib/routes.ts because
// these are referenced by auth components that intentionally avoid pulling
// in app-level dashboard routing. `dashboard` here is the post-login
// destination — must stay in sync with routes.dashboard.
export const AUTH_ROUTES = {
  auth: '/auth',
  callback: '/auth/callback',
  dashboard: '/overview',
} as const
