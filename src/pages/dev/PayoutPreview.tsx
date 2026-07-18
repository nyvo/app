import { Button } from '@/components/ui/button';
import {
  PayoutSetupCard,
  PayoutFaqSection,
  type PayoutSetupViewModel,
} from '@/components/teacher/PayoutSetupCard';
import { PayoutStats, type PayoutRow } from '@/components/teacher/PayoutStats';
import { PayoutStatsSkeleton } from '@/pages/teacher/PaymentsPage';
import { ErrorState } from '@/components/ui/error-state';
import { COMPANY } from '@/lib/company';
import { DevPage, PreviewSection } from './_kit';

/**
 * /dev/payout-preview — auth-free preview of the payouts settings page.
 * Production lives at src/pages/teacher/PaymentsPage.tsx + route
 * /settings/payouts. Renders every onboarding timeline state (including the
 * two 'restricted' variants and the payouts-blocked step 3), the onboarded
 * PayoutStats view (data / tom / laster / feil), the FAQ row and the
 * hydrate-failed error state, with no-op handlers so the design can be
 * reviewed without a real Stripe Connect account.
 */

const STEP_1_TITLE = 'Bekreft identiteten din';
const STEP_2_TITLE = 'Vi sjekker opplysningene';
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
      steps: [
        {
          title: STEP_1_TITLE,
          status: 'current',
          description: 'Legg inn kontonummer og bekreft identiteten din hos Stripe.',
          action: <Button onClick={noop}>Kom i gang</Button>,
        },
        { title: STEP_2_TITLE, status: 'upcoming' },
        { title: STEP_3_TITLE, status: 'upcoming' },
      ],
    },
  },
  {
    id: 'pending',
    label: '2 — Påbegynt, ikke fullført',
    description:
      'Selgeren forlot Stripe-skjemaet før alt var sendt inn (details_submitted = false). Ingenting er til sjekk, så steg 1 står fortsatt som deres — aldri «vi sjekker».',
    viewModel: {
      h2: 'Fullfør oppsettet',
      steps: [
        {
          title: STEP_1_TITLE,
          status: 'current',
          statusLabel: 'Startet',
          description: 'Du er ikke helt ferdig hos Stripe. Fortsett der du slapp.',
          action: <Button onClick={noop}>Fortsett oppsettet</Button>,
        },
        { title: STEP_2_TITLE, status: 'upcoming' },
        { title: STEP_3_TITLE, status: 'upcoming' },
      ],
    },
  },
  {
    id: 'restricted-verifying',
    label: '3 — Under kontroll',
    description:
      'restricted med tom requirements_due — alt er sendt inn og Stripe sjekker. Ingen handling kreves, derfor ingen knapp.',
    viewModel: {
      h2: 'Vi sjekker opplysningene',
      steps: [
        { title: STEP_1_TITLE, status: 'done' },
        {
          title: STEP_2_TITLE,
          status: 'current',
          tone: 'info',
          statusLabel: 'Pågår',
          description: 'Stripe sjekker opplysningene dine. Du trenger ikke gjøre noe nå.',
        },
        { title: STEP_3_TITLE, status: 'upcoming' },
      ],
    },
  },
  {
    id: 'restricted-due',
    label: '4 — Mangler informasjon',
    description: 'restricted med requirements_due — Stripe trenger mer fra selgeren før kontoen kan aktiveres.',
    viewModel: {
      h2: 'Vi mangler litt informasjon',
      steps: [
        { title: STEP_1_TITLE, status: 'done' },
        {
          title: STEP_2_TITLE,
          status: 'current',
          tone: 'warning',
          statusLabel: 'Venter på deg',
          description: 'Fyll inn det som mangler, så aktiverer vi utbetalinger.',
          action: <Button onClick={noop}>Fortsett oppsettet</Button>,
        },
        { title: STEP_3_TITLE, status: 'upcoming' },
      ],
    },
  },
  {
    id: 'restricted-unknown',
    label: '4b — Mangler informasjon? (statussjekk feilet)',
    description:
      'restricted, men requirements-sjekken mot Stripe feilet — nøytral tekst som verken lover «ingenting å gjøre» eller krever handling, med knappen som fluktrute.',
    viewModel: {
      h2: 'Vi sjekker opplysningene',
      steps: [
        { title: STEP_1_TITLE, status: 'done' },
        {
          title: STEP_2_TITLE,
          status: 'current',
          description: 'Vi aktiverer utbetalinger så snart alt er godkjent.',
          action: <Button onClick={noop}>Fortsett oppsettet</Button>,
        },
        { title: STEP_3_TITLE, status: 'upcoming' },
      ],
    },
  },
  {
    id: 'rejected',
    label: '5 — Avslått',
    description: 'Stripe avslo søknaden om en betalingskonto.',
    viewModel: {
      h2: 'Søknaden ble avslått',
      steps: [
        { title: STEP_1_TITLE, status: 'done' },
        {
          title: STEP_2_TITLE,
          status: 'current',
          tone: 'danger',
          statusLabel: 'Avslått',
          description: `Ta gjerne kontakt på ${COMPANY.email}, så hjelper vi deg.`,
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
];

// Payouts-blocked — the only state where the connected seller still sees the
// stepper (once payouts actually flow, PayoutStats replaces it entirely).
// Step 3 is in progress with a warning, never a green "Fullført": the page
// must not say payouts are ready while Stripe still blocks the transfer.
const BLOCKED_VIEW_MODEL: PayoutSetupViewModel = {
  h2: 'Utbetalinger er ikke aktive ennå',
  steps: [
    { title: STEP_1_TITLE, status: 'done' },
    { title: STEP_2_TITLE, status: 'done' },
    {
      title: STEP_3_TITLE,
      status: 'current',
      tone: 'warning',
      statusLabel: 'Venter på deg',
      description: 'Kortbetalinger virker, men Stripe trenger noe mer før pengene kan overføres til deg.',
      action: <Button onClick={noop}>Åpne Stripe</Button>,
    },
  ],
};

// Live never shows the bank last4 — derivePayoutStats renders the date only.
const MOCK_PAYOUTS: PayoutRow[] = [
  { id: 'p1', date: '11. juli 2026', amount: 3200, status: 'in_transit' },
  { id: 'p2', date: '4. juli 2026', amount: 1750, status: 'paid' },
  { id: 'p3', date: '27. juni 2026', amount: 2400, status: 'paid' },
  { id: 'p4', date: '20. juni 2026', amount: 900, status: 'paid' },
];

const PayoutPreview = () => {
  return (
    <DevPage
      title="Utbetalingskonto"
      description="Alle tilstander for /settings/payouts (PaymentsPage): onboardingstegene (inkl. begge restricted-variantene), det blokkerte steg 3, statistikk-visningen (data/tom/laster/feil), FAQ-seksjonen og feiltilstanden."
    >
      {STATES.map((s) => (
        <PreviewSection key={s.id} label={s.label} description={s.description}>
          <PayoutSetupCard viewModel={s.viewModel} />
        </PreviewSection>
      ))}

      <PreviewSection
        label="6 — Aktiv, men utbetalinger holdes igjen"
        description="stripePayoutsBlocked — kortbetalinger virker, men Stripe holder igjen bankoverføringen. Steg 3 står som pågående med advarselstone; det tidligere varselet over kortet er foldet inn i kortet."
      >
        <PayoutSetupCard viewModel={BLOCKED_VIEW_MODEL} />
      </PreviewSection>

      <PreviewSection
        label="Statistikk — ferdig onboardet"
        description="Erstatter tidslinjen når utbetalinger er aktive: tre nøkkeltall (på vei / utbetalt i år / neste utbetaling), siste utbetalinger og en lenke til Stripe. Den ekte siden henter tallene fra en Stripe-edge-funksjon."
      >
        <PayoutStats
          inTransit={3200}
          paidYearToDate={24850}
          nextPayoutDate="14. juli"
          payouts={MOCK_PAYOUTS}
          onOpenStripe={noop}
        />
      </PreviewSection>

      <PreviewSection
        label="Statistikk — ingen utbetalinger ennå"
        description="Tom liste — det en fersk (nettopp onboardet) selger ser før første betalte kurs."
      >
        <PayoutStats
          inTransit={0}
          paidYearToDate={0}
          nextPayoutDate={null}
          payouts={[]}
          onOpenStripe={noop}
        />
      </PreviewSection>

      <PreviewSection
        label="Statistikk — laster"
        description="PayoutStatsSkeleton — vises mens utbetalingene hentes fra Stripe."
      >
        <PayoutStatsSkeleton />
      </PreviewSection>

      <PreviewSection
        label="Statistikk — feil"
        description="Utbetalingene kunne ikke hentes — egen ErrorState med retry, atskilt fra kontofeilen nederst."
      >
        <ErrorState
          title="Kunne ikke hente utbetalinger"
          message="Prøv igjen om litt."
          onRetry={noop}
        />
      </PreviewSection>

      <PreviewSection
        label="FAQ"
        description="PayoutFaqSection — vises under stegene/statistikken i alle tilstander."
      >
        <PayoutFaqSection />
      </PreviewSection>

      <PreviewSection
        label="Feil"
        description="currentSellerHydrateFailed — samme ErrorState som PaymentsPage viser i stedet for stegene når kontoinformasjonen ikke kan hentes."
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
