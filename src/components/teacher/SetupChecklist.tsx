import { Link } from 'react-router-dom'
import { Check, ArrowRight, Loader2 } from 'lucide-react'
import type { SetupStep } from '@/hooks/use-setup-progress'

interface SetupChecklistProps {
  steps: SetupStep[]
  completedCount: number
  totalCount: number
  loadingStepId?: string
}

export const SetupChecklist = ({ steps, completedCount, totalCount, loadingStepId }: SetupChecklistProps) => {
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div className="col-span-1 md:col-span-2 lg:col-span-2 flex flex-col">
      <h2 className="text-sm font-medium text-text-primary mb-3">Kom i gang</h2>
      <div className="rounded-xl bg-white border border-zinc-200 p-6 flex-1">
        {/* Progress header */}
        <div className="mb-6">
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-sm font-medium text-text-primary">
              Sett opp kontoen din
            </p>
            <p className="text-xs text-text-tertiary">
              {completedCount} av {totalCount}
            </p>
          </div>
          {/* Progress bar */}
          <div className="h-1 rounded-full bg-zinc-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-zinc-900 smooth-transition"
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
                className={`flex items-center gap-3 rounded-lg px-3 py-3 transition-colors duration-150 ${
                  isNext ? 'bg-zinc-50' : ''
                }`}
              >
                {/* Check circle */}
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  step.isComplete
                    ? 'bg-zinc-900 text-white'
                    : isNext
                      ? 'border-2 border-zinc-900'
                      : 'border-2 border-zinc-200'
                }`}>
                  {step.isComplete && <Check className="h-3.5 w-3.5" />}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${
                    step.isComplete
                      ? 'text-text-tertiary line-through'
                      : 'font-medium text-text-primary'
                  }`}>
                    {step.title}
                  </p>
                  {isNext && (
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {step.description}
                    </p>
                  )}
                </div>

                {/* Action */}
                {!step.isComplete && isNext && (
                  <>
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 text-text-tertiary animate-spin shrink-0" />
                    ) : step.actionHref ? (
                      <Link
                        to={step.actionHref}
                        className="flex items-center gap-1 text-xs font-medium text-text-primary hover:text-text-secondary smooth-transition shrink-0"
                      >
                        {step.actionLabel}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    ) : (
                      <button
                        onClick={step.actionOnClick}
                        className="flex items-center gap-1 text-xs font-medium text-text-primary hover:text-text-secondary smooth-transition shrink-0"
                      >
                        {step.actionLabel}
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
