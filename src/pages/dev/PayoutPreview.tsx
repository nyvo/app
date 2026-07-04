import { Button } from '@/components/ui/button';
import {
  PayoutSetupCard,
  PayoutFaqSection,
  type PayoutSetupViewModel,
} from '@/components/teacher/PayoutSetupCard';
import { COMPANY } from '@/lib/company';

/**
 * /dev/payout-preview — auth-free preview of the payouts settings timeline.
 * Production lives at src/pages/teacher/PaymentsPage.tsx + route
 * /settings/payouts. Renders all five onboarding states with no-op handlers
 * so the design can be reviewed without a real Stripe Connect account.
 */

const STEP_1_TITLE = 'Bekreft virksomheten';
const STEP_2_TITLE = 'Vi kontrollerer opplysningene';
const STEP_3_TITLE = 'Motta utbetalinger';

function noop() {
  // no-op — dev preview only, not wired to real Stripe/auth handlers
}

function PreviewFrame({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="border-b border-border pb-2">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-1 text-sm text-foreground-muted">{description}</p>
      </div>
      {children}
    </div>
  );
}

const STATES: { id: string; label: string; description: string; viewModel: PayoutSetupViewModel }[] = [
  {
    id: 'not-started',
    label: '1 — Ikke startet',
    description: 'Selgeren har ikke startet Stripe-onboardingen ennå.',
    viewModel: {
      h2: 'Sett opp utbetalinger',
      counter: 'Steg 1 av 3',
      steps: [
        {
          title: STEP_1_TITLE,
          status: 'current',
          description:
            'Du blir sendt til Stripe – betalingspartneren vår – for å bekrefte virksomheten og legge inn kontonummeret pengene skal gå til.',
          action: <Button onClick={noop}>Kom i gang</Button>,
        },
        { title: STEP_2_TITLE, status: 'upcoming' },
        { title: STEP_3_TITLE, status: 'upcoming' },
      ],
    },
  },
  {
    id: 'pending',
    label: '2 — Venter',
    description: 'Startet hos Stripe, venter på at kontrollen fullføres.',
    viewModel: {
      h2: 'Fullfør oppsettet',
      counter: 'Steg 2 av 3',
      steps: [
        { title: STEP_1_TITLE, status: 'done' },
        {
          title: STEP_2_TITLE,
          status: 'current',
          description:
            'Vi aktiverer utbetalinger automatisk så snart alt er godkjent. Mangler det noe, kan du fortsette der du slapp.',
          action: <Button onClick={noop}>Fortsett oppsettet</Button>,
        },
        { title: STEP_3_TITLE, status: 'upcoming' },
      ],
    },
  },
  {
    id: 'restricted',
    label: '3 — Mangler informasjon',
    description: 'Stripe trenger mer informasjon før kontoen kan aktiveres.',
    viewModel: {
      h2: 'Fullfør oppsettet',
      counter: 'Steg 2 av 3',
      steps: [
        { title: STEP_1_TITLE, status: 'done' },
        {
          title: 'Vi mangler litt informasjon',
          status: 'current',
          tone: 'warning',
          description: 'Fyll inn det som gjenstår, så aktiverer vi utbetalinger så snart alt er på plass.',
          action: <Button onClick={noop}>Fortsett oppsettet</Button>,
        },
        { title: STEP_3_TITLE, status: 'upcoming' },
      ],
    },
  },
  {
    id: 'rejected',
    label: '4 — Avslått',
    description: 'Stripe avslo søknaden om en betalingskonto.',
    viewModel: {
      h2: 'Søknaden ble avslått',
      counter: 'Steg 2 av 3',
      steps: [
        { title: STEP_1_TITLE, status: 'done' },
        {
          title: 'Søknaden ble ikke godkjent',
          status: 'current',
          tone: 'danger',
          description: `Ta gjerne kontakt på ${COMPANY.email}, så hjelper vi deg videre.`,
          action: (
            <Button asChild>
              <a href={`mailto:${COMPANY.email}`}>Kontakt oss</a>
            </Button>
          ),
        },
        { title: STEP_3_TITLE, status: 'upcoming' },
      ],
    },
  },
  {
    id: 'enabled',
    label: '5 — Aktiv',
    description: 'Utbetalinger er satt opp og klare til bruk.',
    viewModel: {
      h2: 'Utbetalingene er klare',
      counter: 'Fullført',
      steps: [
        { title: STEP_1_TITLE, status: 'done' },
        { title: STEP_2_TITLE, status: 'done' },
        {
          title: STEP_3_TITLE,
          status: 'current',
          tone: 'success',
          description: 'Pengene overføres automatisk til bankkontoen din. Saldo og alle utbetalinger finner du i oversikten.',
          action: <Button onClick={noop}>Se oversikt</Button>,
        },
      ],
    },
  },
];

const PayoutPreview = () => {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Utbetalingskonto — 5 tilstander</h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Dev preview, ikke koblet til ekte data. Fem tilstander stablet — bla nedover eller bruk lenkene under.
          </p>
          <nav className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {STATES.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="text-foreground underline-offset-4 hover:underline">
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10 space-y-12">
        {STATES.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-6">
            <PreviewFrame label={s.label} description={s.description}>
              <PayoutSetupCard viewModel={s.viewModel} />
            </PreviewFrame>
          </section>
        ))}

        <section id="faq" className="scroll-mt-6">
          <PreviewFrame label="FAQ" description="Vises under kortet i alle fem tilstander.">
            <PayoutFaqSection />
          </PreviewFrame>
        </section>

        <footer className="border-t border-border pt-6 pb-12">
          <p className="text-xs text-foreground-muted">
            Implementasjon: <code className="font-medium">src/pages/teacher/PaymentsPage.tsx</code> (ruten{' '}
            <code className="font-medium">/settings/payouts</code>).
          </p>
        </footer>
      </div>
    </main>
  );
};

export default PayoutPreview;
