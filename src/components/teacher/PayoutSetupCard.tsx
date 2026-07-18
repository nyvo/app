import type { ReactNode } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Presentational progress tracker for the payouts settings page — a 3-step
 * "Bekreft virksomheten → Vi kontrollerer opplysningene → Motta utbetalinger"
 * horizontal segmented bar. Pure view-model in, JSX out, so the real page
 * (auth + Stripe wiring) and the auth-free dev preview can share one
 * rendering without duplicating markup.
 *
 * Structure copied from Airwallex's verification tracker (horizontal steps,
 * title + one-word status under each, detail card below) with the marker
 * circles swapped for equal-width bar segments (Relevance AI / Uxcel
 * onboarding bars) so the segment colour itself carries the step state.
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
   * One-word state under the current step's title («Pågår», «Krever handling»,
   * «Avslått») — the tracker's visible status, adopted from Mercury's
   * application timeline / Airwallex's verification stepper (every step
   * carries its state in words — colour never stands alone). Done steps
   * auto-label «Fullført».
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

// Solid thin bars, same treatment as the old rail's solid-jade travelled
// line — a line of colour, not a saturated fill behind a glyph, so the
// "status = light tint" rule doesn't apply. Neutral current is ink («your
// move», not a status), upcoming is the empty grey track.
const toneBarClass: Record<'info' | 'warning' | 'danger' | 'success', string> = {
  info: 'bg-info',
  warning: 'bg-warning',
  danger: 'bg-danger',
  success: 'bg-success',
};

function stepBarClass({ status, tone }: Pick<PayoutStepViewModel, 'status' | 'tone'>): string {
  if (status === 'done') return 'bg-success';
  if (status === 'current') {
    return tone && tone !== 'neutral' ? toneBarClass[tone] : 'bg-foreground';
  }
  return 'bg-muted';
}

// The sub-label's ink matches the bar (amber bar + amber word) so segment +
// word read as one status unit; neutral states stay muted.
const toneLabelClass: Record<'info' | 'warning' | 'danger' | 'success', string> = {
  info: 'text-info',
  warning: 'text-warning',
  danger: 'text-danger',
  success: 'text-success',
};

function StepStatusLabel({ status, tone, statusLabel }: Pick<PayoutStepViewModel, 'status' | 'tone' | 'statusLabel'>) {
  // Done steps always read «Fullført» — the state in words, not just colour
  // (Mercury/Airwallex label every resolved step).
  if (status === 'done') {
    return <p className="mt-0.5 text-xs text-foreground-muted">Fullført</p>;
  }
  if (status !== 'current' || !statusLabel) return null;
  const ink = tone && tone !== 'neutral' ? toneLabelClass[tone] : 'text-foreground-muted';
  return <p className={`mt-0.5 text-xs ${ink}`}>{statusLabel}</p>;
}

export function PayoutSetupCard({ viewModel }: { viewModel: PayoutSetupViewModel }) {
  const { h2, steps } = viewModel;
  const current = steps.find((step) => step.status === 'current');

  return (
    <div>
      {/* Tracker on the canvas, detail card below (Airwallex's vertical order):
          one equal-width bar segment per step with the title + status word
          stacked under it. The bars are decorative (aria-hidden) — the visible
          status words carry the state, colour never stands alone. */}
      <ol className="grid grid-cols-3 gap-x-3">
        {steps.map((step, index) => (
          <li key={step.title + index} className="min-w-0">
            <span
              aria-hidden="true"
              className={`block h-1 w-full rounded-full transition-colors duration-200 ${stepBarClass(step)}`}
            />
            <p
              className={`mt-2.5 text-sm leading-snug ${
                step.status === 'current' ? 'font-medium text-foreground' : 'font-normal text-foreground-muted'
              }`}
            >
              {step.title}
            </p>
            <StepStatusLabel status={step.status} tone={step.tone} statusLabel={step.statusLabel} />
          </li>
        ))}
      </ol>

      <Card className="mt-6">
        <CardContent>
          {/* The card describes the current situation; the tracker above
              carries the process position, so no step counter is repeated here. */}
          <h2 className="mb-2 text-base font-medium text-foreground">{h2}</h2>
          {current?.description && (
            <p className="max-w-prose text-base text-foreground-muted">{current.description}</p>
          )}
          {current?.action && <div className="pt-4">{current.action}</div>}
        </CardContent>
      </Card>
    </div>
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
