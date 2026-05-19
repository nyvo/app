import { Link, Navigate } from 'react-router-dom'
import { Check } from '@/lib/icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { motion } from 'framer-motion'
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader'
import { pageTransition, pageVariants } from '@/lib/motion'
import { routes } from '@/lib/routes'
import { useSellerSetupStatus } from '@/hooks/use-seller-setup-status'
import { cn } from '@/lib/utils'

// Dedicated checklist page — studio-design §16.3.
// Reachable from the sidebar onboarding card. When everything is done we
// route back to the dashboard so the user isn't left on a finished list.
export default function GetStartedPage() {
  const { steps, completedCount, totalCount, isSetupComplete } = useSellerSetupStatus()

  if (isSetupComplete) {
    return <Navigate to={routes.dashboard} replace />
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background h-full">
      <MobileTeacherHeader title="Kom i gang" />
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-12">
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          transition={pageTransition}
        >
          <header className="mb-8 flex items-baseline justify-between gap-4">
            <h1 className="text-2xl font-medium tracking-tight text-foreground">
              Kom i gang
            </h1>
            <p className="text-sm text-foreground-muted tabular-nums">
              {completedCount} av {totalCount} fullført
            </p>
          </header>

          <div className="overflow-hidden rounded-lg border border-border">
            {steps.map((step, index) => {
              const isLast = index === steps.length - 1
              const rowClass = cn(
                'group flex w-full items-center gap-4 px-5 py-4 text-left no-underline transition-colors hover:bg-muted focus-visible:outline-none focus-visible:bg-muted',
                !isLast && 'border-b border-border',
              )
              const body = (
                <>
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
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-base font-medium',
                        step.isComplete ? 'text-foreground-muted' : 'text-foreground',
                      )}
                    >
                      {step.title}
                    </p>
                    <p className="text-sm text-foreground-muted">{step.description}</p>
                  </div>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={16}
                    strokeWidth={1.75}
                    className="text-foreground-muted shrink-0"
                  />
                </>
              )

              return step.actionHref ? (
                <Link key={step.id} to={step.actionHref} className={rowClass}>
                  {body}
                </Link>
              ) : (
                <button key={step.id} type="button" onClick={step.actionOnClick} className={rowClass}>
                  {body}
                </button>
              )
            })}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
