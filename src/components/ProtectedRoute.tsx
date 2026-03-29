import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AUTH_ROUTES } from '@/lib/auth-routes'

interface ProtectedRouteProps {
  children: React.ReactNode
  /** Which login page to redirect to if unauthenticated */
  loginRedirect?: 'teacher' | 'student'
}

export function ProtectedRoute({ children, loginRedirect = 'teacher' }: ProtectedRouteProps) {
  const { user, isLoading, isInitialized } = useAuth()
  const location = useLocation()

  if (isLoading || !isInitialized) {
    return null
  }

  if (!user) {
    const loginPath = loginRedirect === 'student' ? AUTH_ROUTES.student.login : AUTH_ROUTES.teacher.login
    return <Navigate to={loginPath} state={{ from: location }} replace />
  }

  return <>{children}</>
}
