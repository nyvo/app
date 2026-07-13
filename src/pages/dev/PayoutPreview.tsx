import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  PayoutSetupCard,
  PayoutFaqSection,
  type PayoutSetupViewModel,
} from '@/components/teacher/PayoutSetupCard';
import { PayoutStats, type PayoutRow } from '@/components/teacher/PayoutStats';
import { IncomeChart } from '@/components/teacher/dashboard/IncomeChart';
import { ErrorState } from '@/components/ui/error-state';
import { COMPANY } from '@/lib/company';
import { DevPage, PreviewSection } from './_kit';
import { buildMockSeries, buildEmptySeries } from './IncomeChartPreview';
import type { IncomeRange } from '@/services/income';

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
    label: '2 — Venter',
    description: 'Startet hos Stripe, venter på at kontrollen fullføres.',
    viewModel: {
      h2: 'Fullfør oppsettet',
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
    id: 'restricted',
    label: '3 — Mangler informasjon',
    description: 'Stripe trenger mer informasjon før kontoen kan aktiveres.',
    viewModel: {
      h2: 'Vi mangler litt informasjon',
      steps: [
        { title: STEP_1_TITLE, status: 'done' },
        {
          title: STEP_2_TITLE,
          status: 'current',
          tone: 'warning',
          description: 'Fyll inn det som mangler, så aktiverer vi utbetalinger.',
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
      steps: [
        { title: STEP_1_TITLE, status: 'done' },
        {
          title: STEP_2_TITLE,
          status: 'current',
          tone: 'danger',
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
  {
    id: 'enabled',
    label: '5 — Aktiv',
    description: 'Utbetalinger er satt opp og klare til bruk.',
    viewModel: {
      h2: 'Utbetalingene er klare',
      steps: [
        { title: STEP_1_TITLE, status: 'done' },
        { title: STEP_2_TITLE, status: 'done' },
        {
          title: STEP_3_TITLE,
          status: 'current',
          tone: 'success',
          description: 'Pengene overføres automatisk til kontoen din.',
          action: <Button onClick={noop}>Se oversikt</Button>,
        },
      ],
    },
  },
];

const MOCK_PAYOUTS: PayoutRow[] = [
  { id: 'p1', date: '11. juli 2026', amount: 3200, status: 'in_transit', accountLast4: '1234' },
  { id: 'p2', date: '4. juli 2026', amount: 1750, status: 'paid', accountLast4: '1234' },
  { id: 'p3', date: '27. juni 2026', amount: 2400, status: 'paid', accountLast4: '1234' },
  { id: 'p4', date: '20. juni 2026', amount: 900, status: 'paid', accountLast4: '1234' },
];

// Wraps PayoutStats with the reused dashboard IncomeChart + its own range
// state, mirroring how the real page composes them.
function PayoutStatsPreview({ empty }: { empty?: boolean }) {
  const [range, setRange] = useState<IncomeRange>('month');
  const series = empty ? buildEmptySeries(range) : buildMockSeries(range);
  return (
    <PayoutStats
      inTransit={empty ? 0 : 3200}
      paidYearToDate={empty ? 0 : 24850}
      nextPayoutDate={empty ? null : '14. juli'}
      payouts={empty ? [] : MOCK_PAYOUTS}
      onOpenStripe={noop}
      chart={
        <IncomeChart series={series} isLoading={false} range={range} onRangeChange={setRange} />
      }
    />
  );
}

const PayoutPreview = () => {
  return (
    <DevPage
      title="Utbetalinger"
      description="Onboardet statistikk-visning (forslag) + de fem onboardingtilstandene for /settings/payouts (PaymentsPage), FAQ-seksjonen og feiltilstanden."
    >
      <PreviewSection
        label="Statistikk — ferdig onboardet (forslag)"
        description="Erstatter «steg 3»-visningen når utbetalinger er aktive: tre nøkkeltall (på vei / utbetalt i år / neste utbetaling), siste utbetalinger, og en lenke til Stripe for kvitteringer. Fôret med mock-data — den ekte siden henter tallene fra en Stripe-edge-funksjon."
      >
        <PayoutStatsPreview />
      </PreviewSection>

      <PreviewSection
        label="Statistikk — ingen utbetalinger ennå"
        description="Tom liste — det en fersk (nettopp onboardet) selger ser før første betalte kurs."
      >
        <PayoutStatsPreview empty />
      </PreviewSection>

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
