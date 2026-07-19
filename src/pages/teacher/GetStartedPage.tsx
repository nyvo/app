import { Link, Navigate } from 'react-router-dom'
import { ChevronRight } from '@/lib/icons'
import { PageShell } from '@/components/teacher/PageShell'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { routes } from '@/lib/routes'
import { useSellerSetupStatus } from '@/hooks/use-seller-setup-status'
import type { SetupStep } from '@/hooks/use-setup-progress'
import { cn } from '@/lib/utils'

// Dedicated checklist page — studio-design §16.3.
// Reachable from the sidebar onboarding card. Three states:
//   1. Steps pending → the flat checklist.
//   2. Required done, polish left → a "you're live" state that keeps the
//      remaining steps reachable instead of evicting the user (the old code
//      redirected the moment required was done, so logo/address were never
//      seen — that's why they got skipped).
//   3. Everything done → route back to the dashboard; nothing left to show.
export default function GetStartedPage() {
  const { steps, optionalSteps, isSetupComplete, isLoading, loadFailed, refresh } =
    useSellerSetupStatus()

  const remainingOptional = optionalSteps.filter((step) => !step.isComplete)

  // One flat checklist — required and optional carry equal visual weight here
  // (the optional steps' descriptions already say when they matter), and the
  // pre-completed account step is dropped: it exists to seed the sidebar
  // card's progress count, not to be read as a task on a task list.
  const checklist = [...steps, ...optionalSteps].filter((step) => step.id !== 'account')

  // Hold until the first fetch resolves. Deciding before `hasPublishedCourse`
  // is known would paint the incomplete checklist for a frame, then snap to the
  // live state — the flash this page used to show on refresh.
  if (isLoading) {
    return (
      <PageShell narrow="centered" title="Kom i gang">
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </PageShell>
    )
  }

  // The fetch that drives the checklist failed — show a retry instead of
  // committing a false-incomplete checklist from empty defaults.
  if (loadFailed) {
    return (
      <PageShell narrow="centered" title="Kom i gang">
        <ErrorState
          title="Kunne ikke laste oppsettstatus"
          message="Prøv igjen om litt."
          onRetry={refresh}
        />
      </PageShell>
    )
  }

  // Nothing left on the list — don't strand the user on a finished page.
  if (isSetupComplete && remainingOptional.length === 0) {
    return <Navigate to={routes.dashboard} replace />
  }

  const isLive = isSetupComplete

  return (
    <PageShell narrow="centered" title="Kom i gang">
      {isLive ? (
        <>
          <GoLiveBanner />

          <p className="mt-12 mb-3 text-base font-medium text-foreground">
            Gjør studiosiden ferdig
          </p>
          <div className="space-y-3">
            {optionalSteps.map((step) => (
              <StepCard key={step.id} step={step} />
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          {checklist.map((step) => (
            <StepCard key={step.id} step={step} />
          ))}
        </div>
      )}
    </PageShell>
  )
}

// Go-live banner — celebratory green panel + emoji, per the approved
// /get-started preview. Uses the success-subtle (jade-3) tint alone (no
// border — the opaque tint separates by itself). The dashboard button is the
// deliberate exit that replaces the old auto-redirect. Exported for
// /dev/get-started-preview.
export function GoLiveBanner() {
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-success-subtle px-5 py-4 sm:flex-row sm:items-center animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
      <span aria-hidden="true" className="shrink-0 text-2xl leading-none">
        🎉
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium text-foreground">
          Studioet ditt er klart
        </p>
        <p className="text-base text-foreground-muted">
          Du kan ta imot påmeldinger og betaling. Gjør gjerne siden ferdig nedenfor.
        </p>
      </div>
      <Button asChild className="w-full shrink-0 sm:w-auto">
        <Link to={routes.dashboard}>Gå til oversikten</Link>
      </Button>
    </div>
  )
}

// Reference: Adaline's "Get Started" checklist + Time2book's "Setup guide"
// (Mobbin) — each step is its own filled card row, and the trailing slot
// flips from the chevron affordance to a green check that only appears once
// the step is done; no empty-state marker, so text stays on one left edge
// across rows. Re-skinned in our tokens: bg-muted fill at radius-xl (hover =
// bg-active, the secondary-button combo), check = the standard subtle-tint
// status circle sized up. All text stays full text-foreground — muted ink on
// a muted fill is unreadable (see muted-text-on-muted-fill); done-ness reads
// from the check alone. Exported for /dev/get-started-preview.
export function StepCard({ step }: { step: SetupStep }) {
  const hasAction = !!step.actionHref || !!step.actionOnClick
  const cardClass = cn(
    'group flex w-full items-center gap-4 rounded-xl bg-muted px-5 py-4 text-left no-underline',
    hasAction &&
      'transition-colors hover:bg-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
  )

  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium text-foreground">{step.title}</p>
        {step.description && (
          <p className="text-base text-foreground">{step.description}</p>
        )}
      </div>
      {step.isComplete ? (
        // The standard status circle — success-subtle tint + jade ink, same
        // hue pair as every other status mark — sized up, with a larger
        // glyph inside for weight.
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-success-subtle text-success">
          <svg viewBox="0 0 12 12" width="15" height="15" fill="none" aria-hidden="true">
            <path
              d="M2.5 6.5L5 9l4.5-6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="sr-only">Fullført</span>
        </span>
      ) : (
        hasAction && (
          <ChevronRight
            className="size-4 shrink-0 text-foreground-muted transition-transform group-hover:translate-x-0.5"
            strokeWidth={1.75}
          />
        )
      )}
    </>
  )

  if (step.actionHref) {
    return (
      <Link to={step.actionHref} className={cardClass}>
        {body}
      </Link>
    )
  }
  if (step.actionOnClick) {
    return (
      <button type="button" onClick={step.actionOnClick} className={cardClass}>
        {body}
      </button>
    )
  }
  // No action — a static row, not a control.
  return <div className={cardClass}>{body}</div>
}
