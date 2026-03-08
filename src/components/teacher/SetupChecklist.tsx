import { Link } from 'react-router-dom'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SetupStep } from '@/hooks/use-setup-progress'

interface SetupChecklistProps {
  steps: SetupStep[]
  completedCount: number
  totalCount: number
  loadingStepId?: string
}

export const SetupChecklist = ({ steps, completedCount, totalCount, loadingStepId }: SetupChecklistProps) => {
  return (
    <div className="col-span-1 md:col-span-2 lg:col-span-2 h-[280px] sm:h-[360px] overflow-hidden rounded-2xl bg-zinc-900 text-white border border-zinc-800 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 z-0" />
      <div className="relative flex h-full flex-col p-6 sm:p-9 z-10">
        {/* Header */}
        <div className="mb-6">
          <h2 className="font-geist text-xl sm:text-2xl font-medium tracking-tight text-white mb-1">
            Kom i gang
          </h2>
          <p className="text-sm text-zinc-400">
            {completedCount} av {totalCount} fullført
          </p>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          {steps.map((step) => (
            <div
              key={step.id}
              className="flex items-center gap-4 rounded-xl border border-zinc-700 bg-zinc-700/20 px-4 py-3"
            >
              {/* Icon */}
              {step.isComplete ? (
                <CheckCircle2 className="h-5 w-5 text-success shrink-0 stroke-[1.5]" />
              ) : (
                <step.icon className="h-5 w-5 text-zinc-500 shrink-0 stroke-[1.5]" />
              )}

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${step.isComplete ? 'text-zinc-500 line-through' : 'text-white'}`}>
                  {step.title}
                </p>
                {!step.isComplete && (
                  <p className="text-xs text-zinc-400 mt-0.5 truncate">
                    {step.description}
                  </p>
                )}
              </div>

              {/* Action */}
              {!step.isComplete && (
                <>
                  {step.actionHref ? (
                    <Button asChild variant="outline-soft" size="xs" className="shrink-0 bg-white text-zinc-900 border-zinc-300 hover:bg-zinc-100">
                      <Link to={step.actionHref}>
                        {step.actionLabel}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="outline-soft"
                      size="xs"
                      className="shrink-0 bg-white text-zinc-900 border-zinc-300 hover:bg-zinc-100"
                      onClick={step.actionOnClick}
                      loading={loadingStepId === step.id}
                      loadingText={step.actionLabel}
                    >
                      {step.actionLabel}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
