import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X } from '@/lib/icons'
import { routes } from '@/lib/routes'
import { useAuth } from '@/contexts/AuthContext'
import { SidebarMenuButton, SidebarSeparator } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { useSellerSetupStatus } from '@/hooks/use-seller-setup-status'

// The polish-phase entry is a nag, not a gate — it must be dismissible
// (Outseta's "Remove 'Setup' from the sidebar" pattern). Per-seller,
// device-local; the /get-started page itself stays reachable via URL.
const polishDismissKey = (sellerId: string) => `setup-polish-dismissed:${sellerId}`

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
  const { currentSeller } = useAuth()
  const { completedCount, totalCount, isSetupComplete, optionalSteps, isLoading } =
    useSellerSetupStatus()

  const sellerId = currentSeller?.id
  const [polishDismissed, setPolishDismissed] = useState(false)
  useEffect(() => {
    if (!sellerId) return
    setPolishDismissed(localStorage.getItem(polishDismissKey(sellerId)) === '1')
  }, [sellerId])

  const remainingOptional = optionalSteps.filter((step) => !step.isComplete).length
  const isActive = location.pathname === routes.getStarted

  // Overall setup completion (required + optional) — drives the progress ring
  // on the quiet "Oppsett" entry once the required steps are done.
  const overallTotal = totalCount + optionalSteps.length
  const overallDone = completedCount + (optionalSteps.length - remainingOptional)
  const overallProgress = overallTotal > 0 ? (overallDone / overallTotal) * 100 : 0

  // Hold until the first fetch resolves — otherwise the card paints its
  // required-progress phase before flipping to the quiet "polish" phase.
  if (isLoading) return null

  // Everything done — required and polish alike. Nothing left to nudge.
  if (isSetupComplete && remainingOptional === 0) return null

  // Phase 2 — live, but polish remains. Quiet, no progress bar, dismissible.
  if (isSetupComplete) {
    if (polishDismissed) return null
    return (
      <div className="mt-2">
        <SidebarSeparator className="mx-0 mb-2" />
        <div className="group/setup relative">
          <SidebarMenuButton asChild isActive={isActive} tooltip="Oppsett">
            <Link
              to={routes.getStarted}
              aria-label={`Oppsett — ${overallDone} av ${overallTotal} fullført`}
            >
              <ProgressRing progress={overallProgress} />
              <span>Oppsett</span>
            </Link>
          </SidebarMenuButton>
          <button
            type="button"
            aria-label="Skjul oppsett"
            onClick={() => {
              if (sellerId) localStorage.setItem(polishDismissKey(sellerId), '1')
              setPolishDismissed(true)
            }}
            className="absolute right-1 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-md text-sidebar-foreground-muted transition-opacity hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring md:opacity-0 md:group-hover/setup:opacity-100"
          >
            <X className="size-3.5" strokeWidth={1.75} />
          </button>
        </div>
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
          'block rounded-lg px-3 py-2.5 transition-colors duration-150',
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

/** Small circular progress indicator — the filled arc shows setup completion. */
function ProgressRing({ progress }: { progress: number }) {
  const size = 16
  const stroke = 2
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const clamped = Math.min(Math.max(progress, 0), 100)
  const offset = circumference * (1 - clamped / 100)
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0 -rotate-90"
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        stroke="currentColor"
        className="text-sidebar-border"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        stroke="currentColor"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-sidebar-foreground transition-[stroke-dashoffset] duration-300"
      />
    </svg>
  )
}
