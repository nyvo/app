/**
 * Centralized route map — single source of truth for every URL in the app.
 *
 * RULES:
 *   - All in-app navigation MUST go through this module. No `/courses/...`
 *     string literals scattered across components.
 *   - Path builders (course, etc.) take the URL params and return the
 *     full path string. Use them in `<Link to={...}>` and `navigate(...)`.
 *   - When you add a new top-level route, also add the slug to
 *     `RESERVED_SLUGS` in reservedSlugs.ts so it can't collide with a
 *     team's public slug.
 *
 * NAMING:
 *   English URLs, Norwegian UI copy. Same convention as Time2Book and
 *   most localized SaaS apps. Shorter, ASCII-only, easier to share in
 *   docs and error messages.
 */

export const routes = {
  // ─── Public ────────────────────────────────────────────────────────────
  home: '/',
  login: '/login',
  signup: '/signup',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  terms: '/terms',
  checkoutSuccess: '/checkout/success',
  confirmEmail: '/confirm-email',

  // ─── Authenticated dashboard ──────────────────────────────────────────
  // Logged-in users land here. Public landing at `/` auto-redirects.
  dashboard: '/overview',
  schedule: '/schedule',

  // Courses
  courses: '/courses',
  newCourse: '/courses/new',
  course: (id: string) => `/courses/${id}`,
  editCourse: (id: string) => `/courses/${id}/edit`,
  coursePricing: (id: string) => `/courses/${id}/pricing`,

  // Signups (seller-only)
  signups: '/signups',

  // Studio (seller's storefront management)
  studio: '/studio',

  // Settings
  settingsProfile: '/settings/profile',
  settingsPayouts: '/settings/payouts',

  // ─── Public team / course pages (flat slug at root) ───────────────────
  publicTeam: (teamSlug: string) => `/${teamSlug}`,
  publicCourse: (teamSlug: string, courseSlug: string) =>
    `/${teamSlug}/${courseSlug}`,
} as const;

/**
 * Build the post-login destination based on intent. The default lands on
 * the dashboard; future buyer flows might want to deep-link elsewhere.
 */
export function postLoginDestination(): string {
  return routes.dashboard;
}
