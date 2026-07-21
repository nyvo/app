import { lazy, Suspense } from 'react'
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
  const { isInitialized, isLoading, sellers, sellersLoadFailed } = useAuth()
  // Hold while loading — mid-login, sellers can land after profile; picking
  // BuyerDashboard in that window flashes the wrong dashboard for sellers.
  // Delayed loader, not bare null: this hold sits between two spinner phases
  // (auth init before, chunk load after), and a null here blanks the screen
  // mid-wait — the DelayedFallback handoff keeps the spinner continuous.
  if (!isInitialized || isLoading) {
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
