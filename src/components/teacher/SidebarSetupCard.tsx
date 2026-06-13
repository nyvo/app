import { Link, useLocation } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { routes } from '@/lib/routes'
import { SidebarSeparator } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { useSellerSetupStatus } from '@/hooks/use-seller-setup-status'

// Sits under the primary sidebar nav. Pattern from
// Notion / Vercel / Intercom — small card with progress count + thin
// progress bar, whole-card click → /get-started.
//
// Two phases:
//   1. Required pending → the loud progress card (count + bar).
//   2. Required done, polish left → a quiet "Gjør siden ferdig" entry (no
//      bar) so the optional steps stay reachable from nav; without it the
//      /get-started "you're live" state is unreachable once the card hides.
// Removed entirely once everything — required and optional — is done
// (skill §16 + components.md "Setup checklist").
export function SidebarSetupCard() {
  const location = useLocation()
  const { completedCount, totalCount, isSetupComplete, optionalSteps, isLoading } =
    useSellerSetupStatus()

  const remainingOptional = optionalSteps.filter((step) => !step.isComplete).length
  const isActive = location.pathname === routes.getStarted

  // Hold until the first fetch resolves — otherwise the card paints its
  // required-progress phase before flipping to the quiet "polish" phase.
  if (isLoading) return null

  // Everything done — required and polish alike. Nothing left to nudge.
  if (isSetupComplete && remainingOptional === 0) return null

  // Phase 2 — live, but polish remains. Quiet, no progress bar.
  if (isSetupComplete) {
    return (
      <div className="mt-2">
        <SidebarSeparator className="mx-0 mb-2" />
        <Link
          to={routes.getStarted}
          aria-label="Gjør studioet ferdig"
          className={cn(
            'flex items-center justify-between gap-2 rounded-md px-3 py-2 transition-colors duration-150',
            'text-sidebar-foreground-muted hover:bg-sidebar-accent hover:text-sidebar-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
            isActive && 'bg-sidebar-accent text-sidebar-foreground',
          )}
        >
          <span className="text-sm font-medium">Gjør studioet ferdig</span>
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            size={16}
            strokeWidth={1.75}
            className="shrink-0"
          />
        </Link>
      </div>
    )
  }

  // Phase 1 — required steps pending. The loud, motivating progress card.
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div className="mt-2">
      <SidebarSeparator className="mx-0 mb-2" />
      <Link
        to={routes.getStarted}
        aria-label={`Kom i gang — ${completedCount} av ${totalCount} fullført`}
        className={cn(
          'block rounded-md px-3 py-2 transition-colors duration-150',
          'hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
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
