import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepperStep {
  id: string;
  label: string;
}

export interface StepperProps {
  /** Steps to display (e.g. Detaljer, Tid og sted, Påmelding). */
  steps: readonly StepperStep[];
  /** Current step index (0-based). 0 = step 1, 1 = step 2, 2 = step 3. */
  currentStep: number;
  /** Optional. When provided, completed steps are clickable to go back. */
  onStepSelect?: (index: number) => void;
  className?: string;
}

/**
 * Zen-style horizontal stepper with a 2px track.
 * - Track: completed segments black (zinc-900), upcoming light grey (zinc-200).
 * - Done: solid circle + white check; label medium grey.
 * - Active: solid black circle + white number; label bold black.
 * - Upcoming: white circle, light grey border + grey number; label light grey.
 * Aligns with Ease design system (Shadowless Zinc).
 */
export function Stepper({ steps, currentStep, onStepSelect, className }: StepperProps) {
  const total = steps.length;
  const clampedStep = Math.max(0, Math.min(currentStep, total - 1));

  return (
    <nav
      className={cn('flex flex-col gap-4', className)}
      aria-label={`Steg ${clampedStep + 1} av ${total}`}
    >
      {/* Status text: "Steg X av 3" — small, quiet label */}
      <p
        className="text-xs font-medium text-text-tertiary"
        aria-hidden
      >
        Steg {clampedStep + 1} av {total}
      </p>

      {/* Stepper: track + step circles and labels */}
      <div className="relative flex w-full items-start">
        {/* 2px horizontal track behind the circles (runs between circle centers) */}
        <div
          className="absolute left-0 right-0 top-4 flex h-0.5 gap-0"
          style={{ left: '1rem', right: '1rem' }}
          aria-hidden
        >
          {total > 1 &&
            Array.from({ length: total - 1 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  'flex-1',
                  clampedStep > i ? 'bg-zinc-900' : 'bg-zinc-200'
                )}
              />
            ))}
        </div>

        {/* Steps: circle + label centered under each */}
        <ol role="list" className="flex w-full justify-between">
          {steps.map((step, index) => {
            const isActive = index === clampedStep;
            const isCompleted = index < clampedStep;
            const isUpcoming = index > clampedStep;
            const isClickable = onStepSelect != null && index < clampedStep;

            const stepContent = (
              <>
                <span
                  className={cn(
                    'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors',
                    isCompleted && 'bg-zinc-900 text-white',
                    isActive && 'bg-zinc-900 text-white',
                    isUpcoming &&
                      'border border-zinc-200 bg-white text-text-tertiary'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 text-white" aria-hidden />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={cn(
                    'mt-2 text-center text-xs',
                    isCompleted && 'text-text-secondary',
                    isActive && 'font-medium text-text-primary',
                    isUpcoming && 'text-text-tertiary'
                  )}
                >
                  {step.label}
                </span>
              </>
            );

            return (
              <li
                key={step.id}
                className="flex flex-1 flex-col items-center first:items-center last:items-center"
              >
                {isClickable ? (
                  <button
                    type="button"
                    onClick={() => onStepSelect(index)}
                    className="flex flex-col items-center rounded-lg py-1 px-2 -mx-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    aria-current={isActive ? 'step' : undefined}
                    aria-label={`${step.label}, steg ${index + 1} av ${total}`}
                  >
                    {stepContent}
                  </button>
                ) : (
                  <div
                    className="flex flex-col items-center"
                    aria-current={isActive ? 'step' : undefined}
                  >
                    {stepContent}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
