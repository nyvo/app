import { Navigate, Link, useLocation } from 'react-router-dom'
import { useAuth, type UserType } from '@/contexts/AuthContext'
import { Infinity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AUTH_ROUTES } from '@/lib/auth-routes'
import { WelcomeFlow } from '@/components/teacher/WelcomeFlow'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireOrganization?: boolean
  requiredUserType?: UserType
}

export function ProtectedRoute({ children, requireOrganization = true, requiredUserType }: ProtectedRouteProps) {
  const { user, isLoading, isInitialized, currentOrganization, signOut, userType } = useAuth()
  const location = useLocation()

  // Loading states — return null to avoid double loader (App Suspense handles it)
  if (isLoading || !isInitialized) {
    return null
  }

  if (!user) {
    const loginPath = requiredUserType === 'student' ? AUTH_ROUTES.student.login : AUTH_ROUTES.teacher.login
    return <Navigate to={loginPath} state={{ from: location }} replace />
  }

  // No organization → show welcome flow to create one (NOT a redirect — avoids loops)
  // Must come BEFORE userType check: new user has no org yet → userType='student',
  // but they should complete org setup, not see "Ingen tilgang"
  if (requireOrganization && !currentOrganization) {
    return (
      <div className="min-h-screen w-full bg-surface flex items-center justify-center">
        <WelcomeFlow isOpen onDismiss={() => {}} requireOrg />
      </div>
    )
  }

  // Check if user type matches requirement
  if (requiredUserType && userType !== requiredUserType) {
    // Student route accessed by teacher → redirect to teacher dashboard
    if (requiredUserType === 'student' && userType === 'teacher') {
      return <Navigate to={AUTH_ROUTES.teacher.dashboard} replace />
    }
    // Teacher route accessed by student → show access denied with dashboard link
    const dashboardPath = userType === 'student' ? AUTH_ROUTES.student.dashboard : AUTH_ROUTES.teacher.dashboard
    return (
      <div className="min-h-screen w-full bg-surface flex items-center justify-center">
        <div className="w-full max-w-sm px-4">
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center text-primary-foreground">
                <Infinity className="w-3.5 h-3.5" />
              </div>
              <span className="text-lg font-medium text-text-primary">Ease</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-6 text-center">
            <h1 className="text-lg font-medium text-text-primary mb-1">
              Ingen tilgang
            </h1>
            <p className="text-sm text-text-secondary mb-4">
              Du har ikke tilgang til denne siden.
            </p>
            <div className="space-y-3">
              <Button asChild className="w-full h-11">
                <Link to={dashboardPath}>Gå til oversikten</Link>
              </Button>
              <button
                onClick={() => signOut()}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Logg ut
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
