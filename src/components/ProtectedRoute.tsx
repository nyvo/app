import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AUTH_ROUTES, resolvePostAuthDestination } from '@/lib/auth-routes'
import { DelayedFallback } from '@/components/ui/delayed-fallback'
import { PageLoader } from '@/components/ui/page-loader'
import { PageState } from '@/components/page-state/page-state'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, isInitialized, isLoading } = useAuth()
  const location = useLocation()

  // Only blank the shell on the very first load. `isInitialized` latches
  // true and never flips back, so later background refreshes (which toggle
  // `isLoading`) no longer unmount the layout — otherwise a click landing
  // between mousedown and mouseup gets dropped as the sidebar disappears.
  // Hold with a delayed spinner (nothing for fast loads) so a slow init isn't
  // indistinguishable from a crash.
  if (!isInitialized) {
    return (
      <DelayedFallback>
        <PageLoader />
      </DelayedFallback>
    )
  }

  if (!user) {
    return <Navigate to={AUTH_ROUTES.auth} state={{ from: location }} replace />
  }

  // User is authenticated but profile hasn't loaded. Mid background refresh
  // (isLoading) it's transient — hold. But once settled with no profile (a
  // transient boot failure kept the session — see AuthContext), the old `null`
  // was a permanent white screen; surface a retry instead.
  if (!profile) {
    if (isLoading) return null
    return <PageState variant="server-error" />
  }

  if (!profile.onboarding_completed_at) {
    // Carry the deep-link target as `?next=` so it survives onboarding
    // instead of being flattened to /overview on completion.
    return (
      <Navigate
        to={resolvePostAuthDestination(profile, location.pathname + location.search)}
        replace
      />
    )
  }

  return <>{children}</>
}
