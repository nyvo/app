import { Link, useLocation } from 'react-router-dom'
import { routes } from '@/lib/routes'
import { SidebarSeparator } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { useSellerSetupStatus } from '@/hooks/use-seller-setup-status'

// Sits under the primary sidebar nav. Pattern from
// Notion / Vercel / Intercom — small card with progress count + thin
// progress bar, whole-card click → /get-started. Hidden once everything
// is complete (skill §16 + components.md "Setup checklist").
export function SidebarSetupCard() {
  const location = useLocation()
  const { completedCount, totalCount, isSetupComplete } = useSellerSetupStatus()

  if (isSetupComplete) return null

  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  const isActive = location.pathname === routes.getStarted

  return (
    <div className="mt-2">
      <SidebarSeparator className="mx-0 mb-2" />
      <Link
        to={routes.getStarted}
        aria-label={`Kom i gang — ${completedCount} av ${totalCount} fullført`}
        className={cn(
          'block rounded-md px-3 py-2 transition-colors duration-150',
          'hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
          isActive && 'bg-sidebar-accent',
        )}
      >
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-sidebar-foreground">Kom i gang</p>
          <p className="text-xs text-sidebar-foreground-muted tabular-nums">
            {completedCount}/{totalCount}
          </p>
        </div>
        <div
          className="mt-1.5 h-1 overflow-hidden rounded-full bg-sidebar-border"
          role="progressbar"
          aria-valuenow={completedCount}
          aria-valuemin={0}
          aria-valuemax={totalCount}
        >
          <div
            className="h-full rounded-full bg-sidebar-foreground transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </Link>
    </div>
  )
}
