import type { ReactNode } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Presentational progress tracker for the payouts settings page — a 3-step
 * "Bekreft identiteten din → Vi sjekker opplysningene → Motta utbetalinger"
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

// Solid thin bars — a line of colour, not a saturated fill behind a glyph,
// so the "status = light tint" rule doesn't apply. Done uses the bright
// marker green (--success-bright is for exactly this scale — TimelineEntry's
// next-dot uses it too), never the jade text ink as a fill. Neutral current
// is ink («your move», not a status), upcoming is the empty grey track.
const toneBarClass: Record<'info' | 'warning' | 'danger' | 'success', string> = {
  info: 'bg-info',
  warning: 'bg-warning',
  danger: 'bg-danger',
  success: 'bg-success-bright',
};

function stepBarClass({ status, tone }: Pick<PayoutStepViewModel, 'status' | 'tone'>): string {
  if (status === 'done') return 'bg-success-bright';
  if (status === 'current') {
    return tone && tone !== 'neutral' ? toneBarClass[tone] : 'bg-foreground';
  }
  return 'bg-muted';
}

// Coloured status text never renders bare — it sits in the shared Badge
// pill (subtle tint + tone ink), same object as every other status chip.
const toneBadgeVariant: Record<'info' | 'warning' | 'danger' | 'success', 'info' | 'warning' | 'destructive' | 'success'> = {
  info: 'info',
  warning: 'warning',
  danger: 'destructive',
  success: 'success',
};

function StepStatusLabel({ status, tone, statusLabel }: Pick<PayoutStepViewModel, 'status' | 'tone' | 'statusLabel'>) {
  if (status !== 'current' || !statusLabel) return null;
  const variant = tone && tone !== 'neutral' ? toneBadgeVariant[tone] : 'neutral';
  return (
    <Badge variant={variant} size="xs" className="mt-1.5">
      {statusLabel}
    </Badge>
  );
}

// Hand-drawn 10px check (not lucide: at this size the app's 1.75 stroke
// renders thin and mushy — the heavier 1.8 stroke is tuned for it). Sits in
// a subtle-tint circle after done step titles, replacing a written
// «Fullført» — bar + check say it; sr-only text keeps it audible.
function DoneCheck() {
  return (
    <span className="inline-flex size-[18px] shrink-0 items-center justify-center rounded-full bg-success-subtle text-success">
      <svg viewBox="0 0 12 12" width="10" height="10" fill="none" aria-hidden="true">
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
            {/* Non-active titles stay on the secondary text tier
                (foreground-muted); only the current step is full ink. */}
            <p
              className={`mt-2.5 flex items-center gap-1.5 text-sm leading-snug ${
                step.status === 'current' ? 'font-medium text-foreground' : 'font-normal text-foreground-muted'
              }`}
            >
              {step.title}
              {step.status === 'done' && <DoneCheck />}
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
