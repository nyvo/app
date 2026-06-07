import { Link, useLocation } from 'react-router-dom'
import { routes } from '@/lib/routes'
import { cn } from '@/lib/utils'
import { useSellerSetupStatus } from '@/hooks/use-seller-setup-status'

// Sits in the sidebar footer, above the account dropdown. Pattern from
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
    <Link
      to={routes.getStarted}
      aria-label={`Kom i gang — ${completedCount} av ${totalCount} fullført`}
      className={cn(
        'block rounded-lg px-3 py-2.5 transition-colors duration-150',
        'hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
        isActive && 'bg-sidebar-accent',
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-base font-medium text-sidebar-foreground">Kom i gang</p>
        <p className="text-sm text-sidebar-foreground-muted tabular-nums">
          {completedCount}/{totalCount}
        </p>
      </div>
      <div
        className="mt-2 h-1 overflow-hidden rounded-full bg-sidebar-border"
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
  )
}
