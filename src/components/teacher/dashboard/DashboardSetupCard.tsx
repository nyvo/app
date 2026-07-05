import { Link } from 'react-router-dom'
import { Check } from '@/lib/icons'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { SetupStep } from '@/hooks/use-setup-progress'

// First-run checklist card at the top of the dashboard home. Structure copied
// from Eventbrite's "Your checklist" home card — the reference whose CONTEXT
// matches (a compact card coexisting with other dashboard content, unlike the
// full-page Shopify/Patreon guides): one container, title + count, tasks as
// single check-circle lines where the pending task title IS the link. No
// internal borders, no buttons, no accordion.
// Presentational: TeacherDashboard feeds it from useSellerSetupStatus, the
// dev preview from mock data.
export function DashboardSetupCard({
  steps,
  completedCount,
  totalCount,
}: {
  steps: SetupStep[]
  completedCount: number
  totalCount: number
}) {
  return (
    <Card className="gap-0 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-base font-medium text-foreground">Kom i gang</p>
        <p className="text-sm text-foreground-muted tabular-nums">
          {completedCount} av {totalCount} fullført
        </p>
      </div>

      <ul className="mt-4 space-y-3">
        {steps.map((step) => (
          <li key={step.id} className="flex items-center gap-3">
            <span
              className={cn(
                'grid size-5 shrink-0 place-items-center rounded-full',
                step.isComplete
                  ? 'bg-success-subtle text-success'
                  : 'border-2 border-border',
              )}
            >
              {step.isComplete && <Check className="size-3" strokeWidth={2.5} />}
            </span>
            {step.isComplete ? (
              <span className="text-sm text-foreground-muted">{step.title}</span>
            ) : (
              <>
                {step.actionHref ? (
                  <Link
                    to={step.actionHref}
                    className="text-sm font-medium text-foreground hover:underline"
                  >
                    {step.title}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={step.actionOnClick}
                    className="text-sm font-medium text-foreground hover:underline"
                  >
                    {step.title}
                  </button>
                )}
                {step.timeEstimate && (
                  <span className="text-sm text-foreground-muted">{step.timeEstimate}</span>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}
