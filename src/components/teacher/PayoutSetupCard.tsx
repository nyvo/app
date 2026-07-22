import type { ReactNode } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Presentational setup module for the payouts settings page — the 3-step
 * "Bekreft identiteten din → Vi sjekker opplysningene → Motta utbetalinger"
 * journey. Pure view-model in, JSX out, so the real page (auth + Stripe
 * wiring) and the auth-free dev preview can share one rendering without
 * duplicating markup.
 *
 * Composition: a centred first-run narrative, not a settings panel — the
 * seller sees this surface only until payouts flow, then PayoutStats takes
 * over. Skeleton from Fresha's "set up payment processing" narrative
 * (display heading → sub-line → steps → one action) with the steps drawn as
 * Acctual's Payments row of three step cards (status mark, title, one-line
 * caption; the active card lifted, resolved cards quieted). Status grammar
 * unchanged: bright-green check = done, tone Badge pill = current state,
 * numbered chip = position; colour never stands alone.
 */

export type StepStatus = 'done' | 'current' | 'upcoming';

export type StepTone = 'neutral' | 'info' | 'warning' | 'danger' | 'success';

export interface PayoutStepViewModel {
  /** Stable step title (may be overridden per-state, e.g. rejected/restricted copy). */
  title: string;
  status: StepStatus;
  /** Only meaningful when status === 'current'; tones the bar segment + status sub-label. */
  tone?: StepTone;
  /**
   * Short state under the current step's title («Pågår», «Venter på deg»,
   * «Avslått») — the tracker's visible status, adopted from Mercury's
   * application timeline / Airwallex's verification stepper (every step
   * carries its state in words — colour never stands alone). Rendered as a
   * subtle-tint Badge pill, never bare coloured text. Done steps drop the
   * word: the bright bar + the circled check after the title carry it (with
   * a sr-only «Fullført» for screen readers).
   */
  statusLabel?: string;
  /** Only rendered on the current step. */
  description?: string;
  /** Only rendered on the current step. */
  action?: ReactNode;
}

export interface PayoutSetupViewModel {
  h2: string;
  steps: PayoutStepViewModel[];
}

// One fixed caption per canonical step — what that step *is*, independent of
// state (titles can be state-overridden, captions can't). Presentation copy,
// so it lives here, not in the view model.
const STEP_CAPTIONS = [
  'Kontonummer og identitet hos Stripe.',
  'Skjer automatisk hos Stripe.',
  'Pengene går rett til bankkontoen din.',
];

// Coloured status text never renders bare — it sits in the shared Badge
// pill (subtle tint + tone ink), same object as every other status chip.
const toneBadgeVariant: Record<'info' | 'warning' | 'danger' | 'success', 'info' | 'warning' | 'destructive' | 'success'> = {
  info: 'info',
  warning: 'warning',
  danger: 'destructive',
  success: 'success',
};

/**
 * The mark at the top of each step card, all 24px tall so titles align
 * across cards: bright-green check circle (done, sr-only «Fullført»), tone
 * Badge pill (current with a status word), inverted ink numeral («you are
 * here» with nothing to report), muted numeral (upcoming).
 */
function StepMark({ step, index }: { step: PayoutStepViewModel; index: number }) {
  if (step.status === 'done') {
    return (
      // The bright marker green (--success-bright), not the jade text ink;
      // 15% alpha tint of the same hue for the circle fill.
      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-success-bright/15 text-success-bright">
        {/* Hand-drawn check: at this size the app's 1.75 icon stroke renders
            thin and mushy — the heavier 1.8 stroke is tuned for it. */}
        <svg viewBox="0 0 12 12" width="11" height="11" fill="none" aria-hidden="true">
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
    );
  }

  if (step.status === 'current' && step.statusLabel) {
    const variant = step.tone && step.tone !== 'neutral' ? toneBadgeVariant[step.tone] : 'neutral';
    return <Badge variant={variant} size="sm">{step.statusLabel}</Badge>;
  }

  const numeralClass =
    step.status === 'current'
      ? 'bg-foreground text-background'
      : 'bg-muted text-foreground';
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums',
        numeralClass,
      )}
    >
      {index + 1}
    </span>
  );
}

export function PayoutSetupCard({ viewModel }: { viewModel: PayoutSetupViewModel }) {
  const { h2, steps } = viewModel;
  const current = steps.find((step) => step.status === 'current');

  return (
    // First-run narrative, centred on the canvas (Fresha's payment-setup
    // skeleton). This surface is rare — seen only during onboarding — so it
    // gets a staggered entrance; index.css quiets animate-in globally under
    // prefers-reduced-motion.
    <section className="pt-2 sm:pt-6">
      <div className="mx-auto max-w-xl text-center animate-in fade-in-0 duration-200">
        {/* text-xl, one step below the 24px page h1 — same-size stacked headings
            read as a hierarchy tie */}
        <h2 className="text-xl font-medium text-foreground">{h2}</h2>
        {current?.description && (
          <p className="mx-auto mt-2 max-w-lg text-base text-foreground-muted">{current.description}</p>
        )}
      </div>

      {/* Acctual's Payments row: one card per step — status mark, title,
          one-line caption. rounded-3xl matches the dashboard's round cards
          (sidebar upsell, WelcomeBand). The active card lifts with
          shadow-soft; resolved and upcoming cards stay flat with titles on
          the secondary text tier. */}
      <ol className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={step.title + index}
            className={cn(
              'flex flex-col rounded-3xl border border-border-subtle bg-surface p-6 text-left',
              'animate-in fade-in-0 slide-in-from-bottom-1 duration-300 fill-mode-backwards',
              index === 1 && 'delay-75',
              index === 2 && 'delay-150',
              step.status === 'current' && 'shadow-soft',
            )}
          >
            <div className="flex h-6 items-center">
              <StepMark step={step} index={index} />
            </div>
            <p
              className={cn(
                'mt-4 text-sm font-medium leading-snug',
                step.status === 'current' ? 'text-foreground' : 'text-foreground-muted',
              )}
            >
              {step.title}
            </p>
            <p className="mt-1.5 text-sm text-foreground-muted">{STEP_CAPTIONS[index]}</p>
            {/* The action lives in the card of the step it advances
                (Time2book's "Connect Stripe" row) — never floating on the
                canvas. Waiting states have none and the narrative simply
                ends at the cards. */}
            {step.status === 'current' && step.action && (
              <div className="mt-auto pt-5">{step.action}</div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

const FAQ_ITEMS = [
  {
    q: 'Når får jeg pengene?',
    a: 'Pengene overføres automatisk til bankkontoen din, vanligvis 2–3 virkedager etter kjøpet.',
  },
  {
    q: 'Hva skjer når noen kjøper et kurs?',
    a: 'Beløpet trekkes hos kjøperen med en gang, og overføres til deg i neste utbetaling.',
  },
  {
    q: 'Hvorfor må jeg bekrefte identiteten min?',
    a: 'Alle som tar imot betalinger på nett, må bekrefte identiteten sin – det er lovpålagt.',
  },
  {
    q: 'Hva er Stripe?',
    a: 'Stripe håndterer kortbetalinger og utbetalinger for oss.',
  },
];

function PayoutFaq() {
  return (
    <Accordion type="single" collapsible className="border-t border-border-subtle">
      {FAQ_ITEMS.map((item) => (
        <AccordionItem key={item.q} value={item.q} className="border-border-subtle">
          <AccordionTrigger>{item.q}</AccordionTrigger>
          <AccordionContent className="text-sm text-foreground">{item.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

/** FAQ with its own stacked section heading — shared by the live payouts page
 *  and /dev/payout-preview so the treatment can't drift between them. The
 *  text-sm heading matches the FramedCard titles it sits alongside. */
export function PayoutFaqSection() {
  return (
    // mt-12 = THE page section gap; this component owns its distance from the
    // setup card / stats above it.
    <section className="mt-12">
      <h2 className="text-sm font-medium text-foreground">Vanlige spørsmål</h2>
      <div className="mt-3">
        <PayoutFaq />
      </div>
    </section>
  );
}
