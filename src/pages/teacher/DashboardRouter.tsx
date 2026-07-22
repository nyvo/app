import { lazy, use } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { PageLoader } from '@/components/ui/page-loader'
import { DelayedFallback } from '@/components/ui/delayed-fallback'
import { PageState } from '@/components/page-state/page-state'

const TeacherDashboard = lazy(() => import('./TeacherDashboard'))
const BuyerDashboard = lazy(() => import('./BuyerDashboard'))

/**
 * /overview is shared between buyers and sellers. The dashboard skeleton
 * (sidebar, topbar, layout) is in TeacherLayout; this file just picks
 * which body to render. Membership in `seller_members` (sellers.length > 0)
 * is the authoritative seller test — `profiles.role` is a UX hint only.
 */
export default function DashboardRouter() {
  const { isInitialized, isLoading, sellers, sellersLoadFailed, initPromise } = useAuth()
  // First boot: suspend into the surrounding boundary — one continuous
  // loader mount instead of a fallback of our own (see ProtectedRoute).
  if (!isInitialized) use(initPromise)
  // Mid-login (SIGNED_IN reload): sellers can land after profile; picking
  // BuyerDashboard in that window flashes the wrong dashboard for sellers.
  // Delayed loader, not bare null — null blanks the screen mid-wait.
  if (isLoading) {
    return (
      <DelayedFallback>
        <PageLoader />
      </DelayedFallback>
    )
  }

  // Failed fetch is "unknown", not "buyer" — show a retryable error instead
  // of confidently rendering the wrong dashboard.
  if (sellersLoadFailed) {
    return <PageState variant="server-error" as="div" />
  }

  const Dashboard = sellers.length > 0 ? TeacherDashboard : BuyerDashboard

  // No Suspense boundary of our own — deliberately. On first boot the lazy
  // chunk suspends up to RootChrome's boundary, so the full-screen loader
  // stays put until sidebar AND dashboard commit together (an inner boundary
  // here made the spinner remount and shift right when the sidebar appeared).
  // On in-app navigations React Router wraps the update in startTransition,
  // so React holds the previous page instead of showing any fallback.
  return <Dashboard />
}
