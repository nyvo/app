import { Link, Navigate } from 'react-router-dom'
import { Check } from '@/lib/icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader'
import { PageShell } from '@/components/teacher/PageShell'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { routes } from '@/lib/routes'
import { useSellerSetupStatus } from '@/hooks/use-seller-setup-status'
import type { SetupStep } from '@/hooks/use-setup-progress'
import { cn } from '@/lib/utils'

// Dedicated checklist page — studio-design §16.3.
// Reachable from the sidebar onboarding card. Three states:
//   1. Required steps pending → the full checklist (required + optional).
//   2. Required done, polish left → a "you're live" state that keeps the
//      optional steps reachable instead of evicting the user (the old code
//      redirected the moment required was done, so logo/address were never
//      seen — that's why they got skipped).
//   3. Everything done → route back to the dashboard; nothing left to show.
export default function GetStartedPage() {
  const { steps, optionalSteps, completedCount, totalCount, isSetupComplete, isLoading } =
    useSellerSetupStatus()

  const remainingOptional = optionalSteps.filter((step) => !step.isComplete)

  // Hold until the first fetch resolves. Deciding before `hasPublishedCourse`
  // is known would paint the incomplete checklist for a frame, then snap to the
  // live state — the flash this page used to show on refresh.
  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto bg-canvas h-full">
        <MobileTeacherHeader />
        <PageShell narrow="centered" title="Kom i gang">
          <div className="space-y-3" aria-hidden="true">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </PageShell>
      </div>
    )
  }

  // Nothing left on the list — don't strand the user on a finished page.
  if (isSetupComplete && remainingOptional.length === 0) {
    return <Navigate to={routes.dashboard} replace />
  }

  const isLive = isSetupComplete

  return (
    <div className="flex-1 overflow-y-auto bg-canvas h-full">
      <MobileTeacherHeader />
      <PageShell
        narrow="centered"
        title="Kom i gang"
        action={
          isLive ? null : (
            <p className="text-base text-foreground-muted tabular-nums">
              {completedCount} av {totalCount} fullført
            </p>
          )
        }
      >
        {isLive ? (
          <>
            {/* Go-live banner — celebratory green panel + emoji, per the
                approved /get-started preview. Uses the success-subtle (jade-3)
                tint with a soft jade border. The dashboard button is the
                deliberate exit that replaces the old auto-redirect. */}
            <div className="flex flex-col gap-4 rounded-xl border border-success/20 bg-success-subtle px-5 py-4 sm:flex-row sm:items-center">
              <span aria-hidden="true" className="shrink-0 text-2xl leading-none">
                🎉
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-foreground">
                  Studioet ditt er live
                </p>
                <p className="text-base text-foreground-muted">
                  Du kan ta imot påmeldinger og betaling. Gjør gjerne siden ferdig nedenfor.
                </p>
              </div>
              <Button asChild className="w-full shrink-0 sm:w-auto">
                <Link to={routes.dashboard}>Gå til dashbordet</Link>
              </Button>
            </div>

            <p className="mt-8 mb-3 text-base font-medium text-foreground">
              Gjør studiosiden ferdig
            </p>
            <Card className="overflow-hidden p-0 gap-0">
              {optionalSteps.map((step, index) => (
                <StepRow
                  key={step.id}
                  step={step}
                  isLast={index === optionalSteps.length - 1}
                />
              ))}
            </Card>
          </>
        ) : (
          <>
            <Card className="overflow-hidden p-0 gap-0">
              {steps.map((step, index) => (
                <StepRow key={step.id} step={step} isLast={index === steps.length - 1} />
              ))}
            </Card>

            {optionalSteps.length > 0 && (
              <>
                <p className="mt-8 mb-3 text-base font-medium text-foreground">
                  Valgfritt
                </p>
                <Card className="overflow-hidden p-0 gap-0">
                  {optionalSteps.map((step, index) => (
                    <StepRow
                      key={step.id}
                      step={step}
                      isLast={index === optionalSteps.length - 1}
                    />
                  ))}
                </Card>
              </>
            )}
          </>
        )}
      </PageShell>
    </div>
  )
}

function StepRow({ step, isLast }: { step: SetupStep; isLast: boolean }) {
  const hasAction = !!step.actionHref || !!step.actionOnClick
  const rowClass = cn(
    'group flex w-full items-center gap-4 px-5 py-4 text-left no-underline',
    hasAction &&
      'transition-colors hover:bg-muted focus-visible:outline-none focus-visible:bg-muted',
    !isLast && 'border-b border-border',
  )

  const body = (
    <>
      <span
        className={cn(
          'grid size-5 shrink-0 place-items-center rounded-full',
          step.isComplete ? 'bg-success-subtle text-success' : 'border-2 border-border',
        )}
      >
        {step.isComplete && <Check className="size-3" strokeWidth={2.5} />}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-base font-medium',
            step.isComplete ? 'text-foreground-muted' : 'text-foreground',
          )}
        >
          {step.title}
        </p>
        {step.description && (
          <p className="text-base text-foreground-muted">{step.description}</p>
        )}
      </div>
      {!step.isComplete && step.timeEstimate && (
        <span className="shrink-0 text-sm text-foreground-muted">{step.timeEstimate}</span>
      )}
      {hasAction && (
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          size={16}
          strokeWidth={1.75}
          className="text-foreground-muted shrink-0"
        />
      )}
    </>
  )

  if (step.actionHref) {
    return (
      <Link to={step.actionHref} className={rowClass}>
        {body}
      </Link>
    )
  }
  if (step.actionOnClick) {
    return (
      <button type="button" onClick={step.actionOnClick} className={rowClass}>
        {body}
      </button>
    )
  }
  // No action (the pre-completed account step) — a static row, not a control.
  return <div className={rowClass}>{body}</div>
}
