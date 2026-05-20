import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AUTH_ROUTES } from '@/lib/auth-routes'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, isLoading, isInitialized } = useAuth()
  const location = useLocation()

  if (isLoading || !isInitialized) {
    return null
  }

  if (!user) {
    return <Navigate to={AUTH_ROUTES.auth} state={{ from: location }} replace />
  }

  if (profile && !profile.onboarding_completed_at) {
    return <Navigate to={AUTH_ROUTES.onboarding} replace />
  }

  return <>{children}</>
}
