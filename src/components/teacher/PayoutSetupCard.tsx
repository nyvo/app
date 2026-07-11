import type { ReactNode } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Presentational timeline for the payouts settings page — a 3-step "Bekreft
 * virksomheten → Vi kontrollerer opplysningene → Motta utbetalinger" ladder.
 * Pure view-model in, JSX out, so the real page (auth + Stripe wiring) and the
 * auth-free dev preview can share one rendering without duplicating markup.
 */

export type StepStatus = 'done' | 'current' | 'upcoming';

export type MarkerTone = 'neutral' | 'warning' | 'danger' | 'success';

export interface PayoutStepViewModel {
  /** Stable step title (may be overridden per-state, e.g. rejected/restricted copy). */
  title: string;
  status: StepStatus;
  /** Only meaningful when status === 'current'; tones the glyph/numeral, circle stays bg-muted. */
  tone?: MarkerTone;
  /** Only rendered on the current step. */
  description?: string;
  /** Only rendered on the current step. */
  action?: ReactNode;
}

export interface PayoutSetupViewModel {
  h2: string;
  counter: string;
  steps: PayoutStepViewModel[];
}

// These three 12×12 glyphs are hand-drawn on purpose, not missing-lucide
// drift: at 12px inside the step circles, lucide's Check/AlertTriangle/X at
// the app's 1.75 stroke render thin and mushy — the custom paths carry a
// heavier 1.8 stroke tuned for this size. Don't swap them for size-3 lucide.
function CheckGlyph() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" fill="none" aria-hidden="true">
      <path
        d="M2.5 6.5L5 9l4.5-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExclamationGlyph() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" fill="none" aria-hidden="true">
      <path d="M6 2.5v4.2M6 9.4v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CrossGlyph() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" fill="none" aria-hidden="true">
      <path d="M3.5 3.5l5 5M8.5 3.5l-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const toneTextClass: Record<MarkerTone, string> = {
  neutral: '',
  warning: 'text-warning',
  danger: 'text-danger',
  success: 'text-success',
};

// Mirrors the done marker's "Fullført" label — the toned current-step glyph
// is the only cue for warning/danger/success states, so it needs the same
// role="img" + aria-label treatment or screen readers only get a bare circle.
const toneAriaLabel: Record<'warning' | 'danger' | 'success', string> = {
  warning: 'Krever handling',
  danger: 'Avslått',
  success: 'Fullført',
};

function StepMarker({ index, status, tone }: { index: number; status: StepStatus; tone?: MarkerTone }) {
  if (status === 'done') {
    return (
      <span
        role="img"
        aria-label="Fullført"
        className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-foreground text-background text-xs font-medium tabular-nums"
      >
        <CheckGlyph />
      </span>
    );
  }

  if (status === 'current' && tone && tone !== 'neutral') {
    const glyph =
      tone === 'warning' ? <ExclamationGlyph /> : tone === 'danger' ? <CrossGlyph /> : <CheckGlyph />;
    return (
      <span
        role="img"
        aria-label={toneAriaLabel[tone]}
        className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums"
      >
        <span className={toneTextClass[tone]}>{glyph}</span>
      </span>
    );
  }

  const numeralClass = status === 'current' ? 'bg-muted text-foreground' : 'bg-muted text-foreground-muted';
  return (
    <span
      className={`flex size-[26px] shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums ${numeralClass}`}
    >
      {index + 1}
    </span>
  );
}

function StepTitle({ status, title }: { status: StepStatus; title: string }) {
  if (status === 'done') {
    return <p className="text-base font-normal text-foreground-muted leading-normal">{title}</p>;
  }
  if (status === 'upcoming') {
    return <p className="text-base font-normal text-foreground-muted leading-normal">{title}</p>;
  }
  return <p className="text-base font-medium text-foreground leading-normal">{title}</p>;
}

export function PayoutSetupCard({ viewModel }: { viewModel: PayoutSetupViewModel }) {
  const { h2, counter, steps } = viewModel;

  return (
    <Card>
      <CardContent>
        <div className="flex items-baseline justify-between gap-4 mb-6">
          <h2 className="text-base font-medium text-foreground">{h2}</h2>
          <span className="text-xs text-foreground-muted tabular-nums whitespace-nowrap">{counter}</span>
        </div>

        <ol>
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;
            return (
              <li key={step.title + index} className="grid grid-cols-[26px_1fr] gap-x-3">
                <div className="flex flex-col items-center">
                  <StepMarker index={index} status={step.status} tone={step.tone} />
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className={`my-1 w-px flex-1 ${step.status === 'done' ? 'bg-border' : 'bg-border-subtle'}`}
                    />
                  )}
                </div>
                <div className={`min-w-0 pt-[3px] ${isLast ? 'pb-0.5' : 'pb-4'}`}>
                  <StepTitle status={step.status} title={step.title} />
                  {step.status === 'current' && step.description && (
                    <p className="mt-1 text-base text-foreground-muted max-w-prose">{step.description}</p>
                  )}
                  {step.status === 'current' && step.action && <div className="mt-4">{step.action}</div>}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
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
    a: 'Alle som tar imot betalinger på nett, må bekrefte identiteten sin. Det er lovpålagt og gjelder alle plattformer.',
  },
  {
    q: 'Hva er Stripe?',
    a: 'Stripe er betalingspartneren vår. De håndterer betalinger for millioner av virksomheter verden over, og sørger for at pengene kommer trygt frem til kontoen din.',
  },
];

export function PayoutFaqSection() {
  return (
    // mt-12 = THE page section gap; this component owns its distance from the
    // setup card above it (PaymentsPage renders them as adjacent siblings).
    <section className="mt-12">
      <h2 className="text-sm font-medium text-foreground">Vanlige spørsmål</h2>
      <Accordion type="single" collapsible className="mt-3 border-t border-border-subtle">
        {FAQ_ITEMS.map((item) => (
          <AccordionItem key={item.q} value={item.q} className="border-border-subtle">
            <AccordionTrigger>{item.q}</AccordionTrigger>
            <AccordionContent className="text-sm text-foreground">{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
