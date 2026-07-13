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

// Toned markers (done + current warning/danger) use the same subtle coloured
// pill as our status badges — a light tint with the coloured glyph — rather
// than a grey circle, so completed and attention states read in colour.
const toneMarkerClass: Record<'warning' | 'danger' | 'success', string> = {
  warning: 'bg-warning-subtle text-warning',
  danger: 'bg-danger-subtle text-danger',
  success: 'bg-success-subtle text-success',
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
        className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-success-subtle text-success text-xs font-medium tabular-nums"
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
        className={`flex size-[26px] shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums ${toneMarkerClass[tone]}`}
      >
        {glyph}
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
  const { h2, steps } = viewModel;
  const current = steps.find((step) => step.status === 'current');

  return (
    // The 1-2-3 progress rail sits on the canvas to the left; the active step's
    // detail lives in the card on the right. Completed steps turn green so the
    // ladder reads as genuinely done, not mid-process. Stacks on narrow widths.
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-10">
      <ol className="shrink-0 sm:w-56 sm:pt-1">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          return (
            <li key={step.title + index} className="grid grid-cols-[26px_1fr] gap-x-3">
              <div className="flex flex-col items-center">
                <StepMarker index={index} status={step.status} tone={step.tone} />
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className={`my-1 w-px flex-1 ${step.status === 'done' ? 'bg-success' : 'bg-border-subtle'}`}
                  />
                )}
              </div>
              <div className={`min-w-0 pt-[3px] ${isLast ? 'pb-0.5' : 'pb-5'}`}>
                <StepTitle status={step.status} title={step.title} />
              </div>
            </li>
          );
        })}
      </ol>

      <div className="min-w-0 flex-1">
        <Card>
          <CardContent>
            {/* The card describes the current situation; the rail on the left
                carries the process position, so no step counter is repeated here. */}
            <h2 className="mb-2 text-base font-medium text-foreground">{h2}</h2>
            {current?.description && (
              <p className="max-w-prose text-base text-foreground-muted">{current.description}</p>
            )}
            {current?.action && <div className="mt-4">{current.action}</div>}
          </CardContent>
        </Card>
      </div>
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

/** Bare FAQ accordion — for surfaces that already provide their own section
 *  label (e.g. the payouts SettingsRow). */
export function PayoutFaq() {
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

export function PayoutFaqSection() {
  return (
    // mt-12 = THE page section gap; this component owns its distance from the
    // setup card above it (the dev preview renders them as adjacent siblings).
    <section className="mt-12">
      <h2 className="text-sm font-medium text-foreground">Vanlige spørsmål</h2>
      <div className="mt-3">
        <PayoutFaq />
      </div>
    </section>
  );
}
