import { Link } from 'react-router-dom'
import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { SetupStep } from '@/hooks/use-setup-progress'

interface SetupChecklistProps {
  steps: SetupStep[]
  completedCount: number
  totalCount: number
  motivationalSubtitle: string
  loadingStepId?: string
}

export const SetupChecklist = ({ steps, completedCount, totalCount, motivationalSubtitle, loadingStepId }: SetupChecklistProps) => {
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div className="flex flex-col">
      <h2 className="text-base font-medium mb-3 text-foreground">Kom i gang</h2>
      <Card className="p-6 flex-1">
        {/* Progress header */}
        <div className="mb-6">
          <div className="flex items-baseline justify-between mb-1.5">
            <p className="text-sm font-medium text-foreground">
              {motivationalSubtitle}
            </p>
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              {completedCount} av {totalCount}
            </p>
          </div>
          {/* Progress bar */}
          <div
            className="h-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={completedCount}
            aria-valuemin={0}
            aria-valuemax={totalCount}
            aria-label={`Oppsett: ${completedCount} av ${totalCount} steg fullført`}
          >
            <div
              className="h-full rounded-full bg-primary smooth-transition"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-1">
          {steps.map((step, index) => {
            const isNext = !step.isComplete && steps.slice(0, index).every(s => s.isComplete)
            const isLoading = loadingStepId === step.id

            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 rounded-lg px-3 py-3 transition-[background-color] duration-150 ${
                  isNext ? 'bg-muted' : ''
                }`}
              >
                {/* Step number */}
                <span className={`text-xs font-medium tracking-wide mt-0.5 shrink-0 tabular-nums ${
                  step.isComplete
                    ? 'text-muted-foreground'
                    : isNext
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                }`}>
                  {index + 1}
                </span>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className={`${
                    step.isComplete
                      ? 'text-sm text-muted-foreground'
                      : isNext
                        ? 'text-sm font-medium text-foreground'
                        : 'text-sm text-muted-foreground'
                  }`}>
                    {step.title}
                  </p>
                  {isNext && (
                    <p className="text-xs font-medium tracking-wide mt-0.5 text-muted-foreground">
                      {step.description}
                    </p>
                  )}
                </div>

                {/* Completed check (right side) */}
                {step.isComplete && (
                  <div className="mt-0.5 shrink-0 size-5 rounded-full flex items-center justify-center bg-green-100 border border-green-300">
                    <Check className="h-3 w-3 text-green-800" />
                  </div>
                )}

                {/* Action */}
                {!step.isComplete && isNext && (
                  <>
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin shrink-0" />
                    ) : step.actionHref ? (
                      <Button variant="outline-soft" size="compact" asChild>
                        <Link to={step.actionHref}>
                          {step.actionLabel}
                          {step.timeEstimate && (
                            <span className="text-muted-foreground font-normal ml-1">· {step.timeEstimate}</span>
                          )}
                        </Link>
                      </Button>
                    ) : (
                      <Button size="compact" onClick={step.actionOnClick}>
                        {step.actionLabel}
                        {step.timeEstimate && (
                          <span className="text-primary-foreground/60 font-normal ml-1">· {step.timeEstimate}</span>
                        )}
                      </Button>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
