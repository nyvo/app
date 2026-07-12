import { Button } from '@/components/ui/button';
import {
  PayoutSetupCard,
  PayoutFaqSection,
  type PayoutSetupViewModel,
} from '@/components/teacher/PayoutSetupCard';
import { ErrorState } from '@/components/ui/error-state';
import { COMPANY } from '@/lib/company';
import { DevPage, PreviewSection } from './_kit';

/**
 * /dev/payout-preview — auth-free preview of the payouts settings timeline.
 * Production lives at src/pages/teacher/PaymentsPage.tsx + route
 * /settings/payouts. Renders all five onboarding states, the FAQ and the
 * hydrate-failed error state, with no-op handlers so the design can be
 * reviewed without a real Stripe Connect account.
 */

const STEP_1_TITLE = 'Bekreft virksomheten';
const STEP_2_TITLE = 'Vi kontrollerer opplysningene';
const STEP_3_TITLE = 'Motta utbetalinger';

function noop() {
  // no-op — dev preview only, not wired to real Stripe/auth handlers
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
    <DevPage
      title="Utbetalinger"
      description="Fem onboardingtilstander for /settings/payouts (PaymentsPage), FAQ-seksjonen og feiltilstanden ved mislykket kontohenting."
    >
      {STATES.map((s) => (
        <PreviewSection key={s.id} label={s.label} description={s.description}>
          <PayoutSetupCard viewModel={s.viewModel} />
        </PreviewSection>
      ))}

      <PreviewSection label="FAQ" description="Vises under kortet i alle fem tilstander.">
        <PayoutFaqSection />
      </PreviewSection>

      <PreviewSection
        label="Feil"
        description="currentSellerHydrateFailed — samme ErrorState som PaymentsPage viser i stedet for tidslinjen når kontoinformasjonen ikke kan hentes."
      >
        <ErrorState
          title="Kunne ikke hente kontoinformasjon"
          message="Prøv igjen om litt."
          onRetry={noop}
        />
      </PreviewSection>
    </DevPage>
  );
};

export default PayoutPreview;
