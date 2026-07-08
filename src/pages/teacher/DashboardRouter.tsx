import { lazy, Suspense } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { PageSkeleton } from '@/components/ui/page-skeleton'
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
  if (!isInitialized || isLoading) return null

  // Failed fetch is "unknown", not "buyer" — show a retryable error instead
  // of confidently rendering the wrong dashboard.
  if (sellersLoadFailed) {
    return <PageState variant="server-error" as="div" />
  }

  const Dashboard = sellers.length > 0 ? TeacherDashboard : BuyerDashboard

  return (
    <Suspense fallback={<DelayedFallback><PageSkeleton /></DelayedFallback>}>
      <Dashboard />
    </Suspense>
  )
}
