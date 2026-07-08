import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AUTH_ROUTES } from '@/lib/auth-routes'
import { PageState } from '@/components/page-state/page-state'

type Role = 'buyer' | 'seller'

interface RoleRouteProps {
  allow: Role
}

/**
 * Render the child route only if the active user's role matches `allow`.
 * Mismatches bounce to /overview, where DashboardRouter picks the right
 * dashboard. Buyers reaching /settings/payouts by URL, e.g., land back on
 * their own overview instead of a half-broken seller page.
 *
 * Authority: presence of a `seller_members` row (i.e. `sellers.length > 0`)
 * is the canonical seller test — `profiles.role` is a UX hint per the
 * schema comment. ProtectedRoute upstream guarantees `user` exists, and
 * TeacherLayout guarantees onboarding is complete.
 */
export function RoleRoute({ allow }: RoleRouteProps) {
  const { isInitialized, isLoading, sellers, sellersLoadFailed } = useAuth()
  // Hold while auth data is loading — mid-login, profile can land before
  // sellers, and routing on that window would bounce a seller deep-link.
  if (!isInitialized || isLoading) return null

  // Failed fetch is "unknown", not "buyer" — never demote a seller because
  // the memberships query timed out. Reload re-runs the whole auth init.
  if (sellersLoadFailed) {
    return <PageState variant="server-error" as="div" />
  }

  const isSeller = sellers.length > 0
  const effectiveRole: Role = isSeller ? 'seller' : 'buyer'

  if (effectiveRole !== allow) {
    return <Navigate to={AUTH_ROUTES.dashboard} replace />
  }

  return <Outlet />
}
