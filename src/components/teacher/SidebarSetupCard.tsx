import { Link, useLocation } from 'react-router-dom'
import { routes } from '@/lib/routes'
import { SidebarMenuButton, SidebarSeparator } from '@/components/ui/sidebar'
import { useSellerSetupStatus } from '@/hooks/use-seller-setup-status'

// Sits under the primary sidebar nav — a quiet "Oppsett" entry with a small
// progress ring, whole-row click → /get-started. One design for the entire
// setup lifetime: the ring tracks required + optional steps together, so the
// entry never changes shape as steps complete (an earlier version swapped a
// loud bar-card for this entry once required steps were done, which read as
// two different components).
// Removed entirely once everything — required and optional — is done
// (skill §16 + components.md "Setup checklist"). Deliberately NOT
// dismissible — it disappears only by finishing the steps.
export function SidebarSetupCard() {
  const location = useLocation()
  const { completedCount, totalCount, isSetupComplete, optionalSteps, isLoading, loadFailed } =
    useSellerSetupStatus()

  const remainingOptional = optionalSteps.filter((step) => !step.isComplete).length
  const isActive = location.pathname === routes.getStarted

  // Overall setup completion (required + optional) — drives the progress ring.
  const overallTotal = totalCount + optionalSteps.length
  const overallDone = completedCount + (optionalSteps.length - remainingOptional)
  const overallProgress = overallTotal > 0 ? (overallDone / overallTotal) * 100 : 0

  // Hold until the first fetch resolves — no point painting the ring at a
  // stale zero. A failed fetch stays hidden too — this is a nag, not a
  // surface that should show an error card; /get-started carries the retry.
  if (isLoading || loadFailed) return null

  // Everything done — required and polish alike. Nothing left to nudge.
  if (isSetupComplete && remainingOptional === 0) return null

  return (
    <div className="mt-2">
      <SidebarSeparator className="mx-0 mb-2" />
      <SidebarMenuButton asChild isActive={isActive} tooltip="Oppsett">
        <Link
          to={routes.getStarted}
          aria-label={`Oppsett – ${overallDone} av ${overallTotal} fullført`}
        >
          <ProgressRing progress={overallProgress} />
          <span>Oppsett</span>
        </Link>
      </SidebarMenuButton>
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
