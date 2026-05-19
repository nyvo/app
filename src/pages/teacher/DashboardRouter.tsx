import { lazy, Suspense } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { DelayedFallback } from '@/components/ui/delayed-fallback'

const TeacherDashboard = lazy(() => import('./TeacherDashboard'))
const BuyerDashboard = lazy(() => import('./BuyerDashboard'))

/**
 * /overview is shared between buyers and sellers. The dashboard skeleton
 * (sidebar, topbar, layout) is in TeacherLayout; this file just picks
 * which body to render. Membership in `seller_members` (sellers.length > 0)
 * is the authoritative seller test — `profiles.role` is a UX hint only.
 */
export default function DashboardRouter() {
  const { isInitialized, sellers } = useAuth()
  if (!isInitialized) return null

  const Dashboard = sellers.length > 0 ? TeacherDashboard : BuyerDashboard

  return (
    <Suspense fallback={<DelayedFallback><PageSkeleton /></DelayedFallback>}>
      <Dashboard />
    </Suspense>
  )
}
