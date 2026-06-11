import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AUTH_ROUTES, resolvePostAuthDestination } from '@/lib/auth-routes'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, isInitialized } = useAuth()
  const location = useLocation()

  // Only blank the shell on the very first load. `isInitialized` latches
  // true and never flips back, so later background refreshes (which toggle
  // `isLoading`) no longer unmount the layout — otherwise a click landing
  // between mousedown and mouseup gets dropped as the sidebar disappears.
  if (!isInitialized) {
    return null
  }

  if (!user) {
    return <Navigate to={AUTH_ROUTES.auth} state={{ from: location }} replace />
  }

  // User is authenticated but profile hasn't loaded yet (e.g. mid background
  // refresh). Hold rather than route on a stale/missing onboarding flag.
  if (!profile) {
    return null
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
