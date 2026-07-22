import { use } from 'react'
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
  const { user, profile, isInitialized, isLoading, initPromise } = useAuth()
  const location = useLocation()

  // Suspend until the initial auth check completes — this joins the SAME
  // Suspense boundary (RootChrome) that just covered this route's lazy chunk,
  // so the full-screen loader mounts once and simply stays up. Returning our
  // own delayed fallback here instead would unmount/remount the indicator
  // between the chunk phase and the auth phase (the spinner flash).
  // `isInitialized` latches true and never flips back, so this can only
  // suspend during first boot — later background refreshes (which toggle
  // `isLoading`) never unmount the layout.
  if (!isInitialized) use(initPromise)

  if (!user) {
    return <Navigate to={AUTH_ROUTES.auth} state={{ from: location }} replace />
  }

  // User is authenticated but profile hasn't loaded. Mid background refresh
  // (isLoading) it's transient — hold. But once settled with no profile (a
  // transient boot failure kept the session — see AuthContext), the old `null`
  // was a permanent white screen; surface a retry instead.
  if (!profile) {
    // Same delayed loader as the init hold — a bare null here blanks the
    // screen between two spinner phases during login.
    if (isLoading) {
      return (
        <DelayedFallback>
          <PageLoader />
        </DelayedFallback>
      )
    }
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
