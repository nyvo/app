import { lazy, Suspense, use } from 'react'
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

  return (
    <Suspense fallback={<DelayedFallback><PageLoader /></DelayedFallback>}>
      <Dashboard />
    </Suspense>
  )
}
