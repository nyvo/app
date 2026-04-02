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
    <div className="col-span-1 md:col-span-2 lg:col-span-2 flex flex-col">
      <h2 className="text-sm font-medium text-foreground mb-3">Kom i gang</h2>
      <Card className="p-6 flex-1">
        {/* Progress header */}
        <div className="mb-6">
          <div className="flex items-baseline justify-between mb-1.5">
            <p className="text-sm font-medium text-foreground">
              {motivationalSubtitle}
            </p>
            <p className="text-xs text-muted-foreground">
              {completedCount} av {totalCount}
            </p>
          </div>
          {/* Progress bar */}
          <div
            className="h-1 rounded-full bg-muted overflow-hidden"
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
                className={`flex items-start gap-3 rounded-lg px-3 py-3 transition-colors duration-150 ${
                  isNext ? 'bg-muted' : ''
                }`}
              >
                {/* Step number */}
                <span className={`text-xs font-medium shrink-0 tabular-nums mt-0.5 ${
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
                  <p className={`text-sm ${
                    step.isComplete
                      ? 'text-muted-foreground'
                      : isNext
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </p>
                  {isNext && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {step.description}
                    </p>
                  )}
                </div>

                {/* Completed check (right side) */}
                {step.isComplete && (
                  <div className="mt-0.5 shrink-0 size-5 rounded-full flex items-center justify-center bg-status-confirmed-bg border border-status-confirmed-border">
                    <Check className="h-3 w-3 text-status-confirmed-text" />
                  </div>
                )}

                {/* Action */}
                {!step.isComplete && isNext && (
                  <>
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin shrink-0" />
                    ) : step.actionHref ? (
                      <Button variant="outline" size="xs" asChild>
                        <Link to={step.actionHref}>
                          {step.actionLabel}
                          {step.timeEstimate && (
                            <span className="text-muted-foreground font-normal ml-1">· {step.timeEstimate}</span>
                          )}
                        </Link>
                      </Button>
                    ) : (
                      <Button size="xs" onClick={step.actionOnClick}>
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
