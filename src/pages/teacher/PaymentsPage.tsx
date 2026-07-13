import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { PageShell } from '@/components/teacher/PageShell';
import {
  PayoutSetupCard,
  PayoutFaq,
  type PayoutSetupViewModel,
  type MarkerTone,
} from '@/components/teacher/PayoutSetupCard';
import { PayoutStats, type PayoutRow } from '@/components/teacher/PayoutStats';
import { SettingsRows, SettingsRow } from '@/components/teacher/SettingsRows';
import { useAuth } from '@/contexts/AuthContext';
import {
  startStripeConnectOnboarding,
  refreshStripeConnectStatus,
  getStripeSettlements,
  type StripeSettlementsResult,
} from '@/services/stripe-connect';
import { fetchIncomeSeries, type IncomeRange, type IncomeSeries } from '@/services/income';
import { COMPANY } from '@/lib/company';
import { toast } from 'sonner';

// Lazy: IncomeChart pulls in recharts — keep it out of the payments route's
// main chunk, same as TeacherDashboard.
const IncomeChart = lazy(() =>
  import('@/components/teacher/dashboard/IncomeChart').then((m) => ({ default: m.IncomeChart })),
);

const STEP_1_TITLE = 'Bekreft virksomheten';
const STEP_2_TITLE = 'Vi kontrollerer opplysningene';
const STEP_3_TITLE = 'Motta utbetalinger';

/**
 * Payments page — a single "payout account" surface: a Card holding a 3-step
 * vertical timeline (Bekreft virksomheten → Vi kontrollerer opplysningene →
 * Motta utbetalinger), plus a FAQ accordion below. No status badge next to
 * the page title — progress is entirely conveyed by which step is current
 * and its marker tone. The Card matches the other Settings pages (billing,
 * get-started) on the dampened canvas. The content is driven by the
 * seller's Stripe Connect onboarding state (every tier — integrated payments
 * are not gated on plan):
 *
 *   • not started         → step 1 current, "Kom i gang" (hosted Stripe onboarding)
 *   • started, !connected → step 2 current, "Fortsett oppsettet" (+ restricted/rejected sub-cases)
 *   • connected           → step 3 current, "Se oversikt" (Stripe Express dashboard)
 *     — if charges are enabled but payouts are still blocked (unverified bank, risk
 *       hold), a warning callout sits above the card. Surfaced only — never gates
 *       checkout/publish, which key off stripe_onboarding_complete alone.
 *
 * No balance / settlements UI — the merchant manages all of that on Stripe's
 * own Express dashboard. Status re-syncs automatically on return from Stripe
 * (?stripe=return) and server-side via the account.updated webhook, so there
 * is no manual "check status" control.
 */

// Stripe amounts are øre; the app displays kroner (mirrors CheckoutPage's amountOre).
const oreToKroner = (ore: number): number => Math.round(ore / 100);

// A payout that has left Stripe but not yet landed in the seller's bank.
const IN_TRANSIT_STATUSES = new Set(['pending', 'in_transit']);

const nbLongDate = new Intl.DateTimeFormat('nb-NO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const nbShortDate = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'long' });
const payoutDate = (unixSeconds: number): Date => new Date(unixSeconds * 1000);

/**
 * Fold the raw Stripe settlements into the presentational PayoutStats figures.
 * "På vei til deg" / "Neste utbetaling" come from payouts still in flight;
 * "Utbetalt i år" sums this calendar year's settled payouts. The bank last4 is
 * not in the settlements payload yet, so rows show the date only.
 */
function derivePayoutStats(data: StripeSettlementsResult): {
  inTransit: number;
  paidYearToDate: number;
  nextPayoutDate: string | null;
  payouts: PayoutRow[];
} {
  const currentYear = new Date().getFullYear();
  const { payouts } = data;

  const inTransitOre = payouts
    .filter((p) => IN_TRANSIT_STATUSES.has(p.status))
    .reduce((sum, p) => sum + p.amount, 0);

  const paidYtdOre = payouts
    .filter((p) => p.status === 'paid' && payoutDate(p.arrival_date).getFullYear() === currentYear)
    .reduce((sum, p) => sum + p.amount, 0);

  const nextPayout = payouts
    .filter((p) => IN_TRANSIT_STATUSES.has(p.status))
    .sort((a, b) => a.arrival_date - b.arrival_date)[0];

  const rows: PayoutRow[] = payouts
    .filter((p) => p.status === 'paid' || IN_TRANSIT_STATUSES.has(p.status))
    .slice(0, 8)
    .map((p) => ({
      id: p.id,
      date: nbLongDate.format(payoutDate(p.arrival_date)),
      amount: oreToKroner(p.amount),
      status: p.status === 'paid' ? 'paid' : 'in_transit',
    }));

  return {
    inTransit: oreToKroner(inTransitOre),
    paidYearToDate: oreToKroner(paidYtdOre),
    nextPayoutDate: nextPayout ? nbShortDate.format(payoutDate(nextPayout.arrival_date)) : null,
    payouts: rows,
  };
}

// Height-matched placeholder while the settlements fetch is in flight — three
// blocks standing in for Nøkkeltall, the trend chart, and the payout list.
function PayoutStatsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-[340px] w-full rounded-xl" />
      <Skeleton className="h-44 w-full rounded-xl" />
    </div>
  );
}

const PaymentsPage = () => {
  const { currentSeller, refreshSellers, currentSellerHydrateFailed } = useAuth();

  const stripeConnected = !!currentSeller?.stripe_onboarding_complete;
  const stripeStarted = !!currentSeller?.stripe_account_id;
  const stripeStatus = currentSeller?.stripe_account_status ?? null;
  // Charges work as soon as stripe_onboarding_complete is true, but Stripe can still
  // block the actual bank transfer (unverified account, risk hold) — surfaced only,
  // never gates checkout/publish.
  const stripePayoutsBlocked = stripeConnected && !currentSeller?.stripe_payouts_enabled;
  const [stripeLoading, setStripeLoading] = useState(false);
  // True while the ?stripe=return status re-sync runs — the current step's
  // action shows a "Sjekker status" indicator instead of looking idle.
  const [checkingReturn, setCheckingReturn] = useState(false);
  // Set once the return check has synced + refreshed; a toast then fires from
  // the refreshed seller row so it can't contradict the card.
  const returnToastPending = useRef(false);

  // The onboarded happy path — payouts are live and not blocked — swaps the
  // "step 3" stepper for the PayoutStats overview. Only then do we fetch.
  const showStats = stripeConnected && !stripePayoutsBlocked;
  const [incomeRange, setIncomeRange] = useState<IncomeRange>('month');

  const settlementsQuery = useQuery({
    queryKey: ['payout-settlements', currentSeller?.id],
    enabled: !!currentSeller?.id && showStats,
    queryFn: async (): Promise<StripeSettlementsResult> => {
      const { data, error } = await getStripeSettlements(currentSeller!.id);
      if (error || !data) throw error ?? new Error('Utbetalinger utilgjengelig');
      return data;
    },
  });

  // Income trend for the chart slot — reuses the dashboard series/component;
  // keyed on the range so the Uke/Måned/År toggle caches per window.
  const incomeQuery = useQuery({
    queryKey: ['payout-income-series', currentSeller?.id, incomeRange],
    enabled: !!currentSeller?.id && showStats,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<IncomeSeries> => {
      const { data, error } = await fetchIncomeSeries(currentSeller!.id, incomeRange);
      if (error || !data) throw error ?? new Error('Inntektsserie utilgjengelig');
      return data;
    },
  });

  const handleStartStripe = useCallback(async () => {
    if (!currentSeller?.id) return;
    setStripeLoading(true);
    const { data, error } = await startStripeConnectOnboarding(currentSeller.id);
    setStripeLoading(false);
    if (error || !data?.url) {
      // The service resolved a display-ready message (server body or fallback).
      toast.error(error?.message || 'Kunne ikke starte oppsettet.');
      return;
    }
    // Full-page redirect into Stripe's hosted Express onboarding; it returns to
    // /settings/payouts?stripe=return when done.
    window.location.href = data.url;
  }, [currentSeller?.id]);

  // Return from Stripe: force a server-side status sync, pull the persisted row,
  // then let the effect below toast from that row (not the check response).
  const handleReturnFromStripe = useCallback(async () => {
    if (!currentSeller?.id) return;
    setCheckingReturn(true);
    const { error } = await refreshStripeConnectStatus(currentSeller.id);
    await refreshSellers();
    setCheckingReturn(false);
    if (error) {
      toast.error('Kunne ikke sjekke status. Prøv igjen.');
      return;
    }
    returnToastPending.current = true;
  }, [currentSeller?.id, refreshSellers]);

  // Fire the return toast only once the refreshed seller row is in state, so the
  // message matches what the timeline shows.
  useEffect(() => {
    if (!returnToastPending.current || checkingReturn) return;
    returnToastPending.current = false;
    if (stripeConnected) {
      toast.success('Utbetalinger er klare');
    } else if (stripeStatus === 'rejected') {
      toast.error(`Søknaden ble avslått. Ta gjerne kontakt på ${COMPANY.email}.`);
    } else {
      toast('Oppsettet er ikke fullført ennå.');
    }
  }, [checkingReturn, stripeConnected, stripeStatus]);

  const handleOpenStripeDashboard = useCallback(async () => {
    if (!currentSeller?.id) return;
    // Open the tab synchronously inside the click gesture so the browser doesn't popup-block it
    // (window.open after an await is treated as untrusted). We point the already-open tab at the
    // single-use dashboard URL once it arrives — the blank tab also hides the fetch latency.
    const dashboardTab = window.open('about:blank', '_blank');
    const { data, error } = await getStripeSettlements(currentSeller.id);
    if (error || !data?.dashboardUrl) {
      dashboardTab?.close();
      toast.error('Kunne ikke åpne Stripe akkurat nå. Prøv igjen.');
      return;
    }
    if (dashboardTab) {
      dashboardTab.opener = null;
      dashboardTab.location.href = data.dashboardUrl;
    } else {
      // Popup blocked despite the synchronous open — fall back to a direct open.
      window.open(data.dashboardUrl, '_blank', 'noopener,noreferrer');
    }
  }, [currentSeller?.id]);

  // Re-check status when returning from Stripe (?stripe=return); re-mint an
  // expired onboarding link when Stripe sends ?stripe=refresh. Consume the param
  // once and strip it — otherwise ?stripe=refresh re-redirects to Stripe on every
  // mount (Back button unusable) and ?stripe=return re-fires toasts on reload.
  const [searchParams, setSearchParams] = useSearchParams();
  const stripeParamHandled = useRef(false);
  useEffect(() => {
    if (!currentSeller?.id) return;
    const stripeParam = searchParams.get('stripe');
    if (!stripeParam || stripeParamHandled.current) return;
    stripeParamHandled.current = true;

    if (stripeParam === 'return') void handleReturnFromStripe();
    else if (stripeParam === 'refresh') void handleStartStripe();

    const next = new URLSearchParams(searchParams);
    next.delete('stripe');
    setSearchParams(next, { replace: true });
  }, [currentSeller?.id, searchParams, setSearchParams, handleReturnFromStripe, handleStartStripe]);

  // ─── One view-model per onboarding state, rendered by PayoutSetupCard ───
  let h2: string;
  let step2Tone: MarkerTone = 'neutral';
  let step2Desc: string;
  let step2Action: ReactNode;
  let steps: PayoutSetupViewModel['steps'];

  if (!stripeStarted && !stripeConnected) {
    h2 = 'Sett opp utbetalinger';
    steps = [
      {
        title: STEP_1_TITLE,
        status: 'current',
        description: 'Legg inn kontonummer og bekreft identiteten din hos Stripe.',
        action: (
          <Button
            onClick={handleStartStripe}
            loading={stripeLoading || checkingReturn}
            loadingText={checkingReturn ? 'Sjekker status' : 'Starter'}
          >
            Kom i gang
          </Button>
        ),
      },
      { title: STEP_2_TITLE, status: 'upcoming' },
      { title: STEP_3_TITLE, status: 'upcoming' },
    ];
  } else if (stripeStarted && !stripeConnected) {
    if (stripeStatus === 'rejected') {
      h2 = 'Søknaden ble avslått';
      step2Tone = 'danger';
      step2Desc = `Ta gjerne kontakt på ${COMPANY.email}, så hjelper vi deg.`;
      step2Action = (
        <Button asChild>
          <a href={`mailto:${COMPANY.email}`}>Kontakt oss</a>
        </Button>
      );
    } else {
      if (stripeStatus === 'restricted') {
        h2 = 'Vi mangler litt informasjon';
        step2Tone = 'warning';
        step2Desc = 'Fyll inn det som mangler, så aktiverer vi utbetalinger.';
      } else {
        h2 = 'Fullfør oppsettet';
        step2Desc = 'Vi aktiverer utbetalinger så snart alt er godkjent.';
      }
      step2Action = (
        <Button
          onClick={handleStartStripe}
          loading={stripeLoading || checkingReturn}
          loadingText={checkingReturn ? 'Sjekker status' : 'Åpner'}
        >
          Fortsett oppsettet
        </Button>
      );
    }
    steps = [
      { title: STEP_1_TITLE, status: 'done' },
      { title: STEP_2_TITLE, status: 'current', tone: step2Tone, description: step2Desc, action: step2Action },
      { title: STEP_3_TITLE, status: 'upcoming' },
    ];
  } else {
    h2 = 'Utbetalingene er klare';
    steps = [
      { title: STEP_1_TITLE, status: 'done' },
      { title: STEP_2_TITLE, status: 'done' },
      {
        title: STEP_3_TITLE,
        status: 'current',
        tone: 'success',
        description: 'Pengene overføres automatisk til kontoen din.',
        action: <Button onClick={handleOpenStripeDashboard}>Se oversikt</Button>,
      },
    ];
  }

  const viewModel: PayoutSetupViewModel = { h2, steps };

  // Same layout skeleton as the other settings pages (profile, studio):
  // default-width PageShell + SettingsRows sections, not a centered column.
  return (
    <PageShell title="Utbetalingskonto">
      <SettingsRows>
        <SettingsRow
          title="Utbetalinger"
          description={showStats ? undefined : 'Slik får du betalt for kursene dine.'}
        >
          {currentSellerHydrateFailed ? (
            // stripe_account_id is a stale safe-default (null) — the timeline
            // would show step 1 to a seller who already started onboarding.
            // Bail to a bounded retry instead. The FAQ below is static, so it stays.
            <ErrorState
              title="Kunne ikke hente kontoinformasjon"
              message="Prøv igjen om litt."
              onRetry={refreshSellers}
            />
          ) : showStats ? (
            // Onboarded + payouts flowing → the overview replaces the stepper.
            settlementsQuery.isLoading ? (
              <PayoutStatsSkeleton />
            ) : settlementsQuery.isError || !settlementsQuery.data ? (
              <ErrorState
                title="Kunne ikke hente utbetalinger"
                message="Prøv igjen om litt."
                onRetry={() => void settlementsQuery.refetch()}
              />
            ) : (
              <PayoutStats
                {...derivePayoutStats(settlementsQuery.data)}
                onOpenStripe={handleOpenStripeDashboard}
                chart={
                  <Suspense fallback={<Skeleton className="h-[340px] w-full rounded-xl" />}>
                    <IncomeChart
                      series={incomeQuery.data ?? null}
                      isLoading={incomeQuery.isLoading}
                      isFetching={incomeQuery.isFetching}
                      range={incomeRange}
                      onRangeChange={setIncomeRange}
                    />
                  </Suspense>
                }
              />
            )
          ) : (
            <>
              {stripePayoutsBlocked && (
                <Alert variant="warning">
                  <AlertTitle className="text-base">Utbetalinger er ikke aktive ennå</AlertTitle>
                  <AlertDescription className="text-base text-foreground">
                    Stripe mangler noe informasjon før pengene kan utbetales til deg. Åpne
                    Stripe-dashbordet for å fullføre.
                  </AlertDescription>
                  <div className="mt-3">
                    <Button onClick={handleOpenStripeDashboard}>Åpne Stripe</Button>
                  </div>
                </Alert>
              )}
              <PayoutSetupCard viewModel={viewModel} />
            </>
          )}
        </SettingsRow>
        <SettingsRow title="Vanlige spørsmål">
          <PayoutFaq />
        </SettingsRow>
      </SettingsRows>
    </PageShell>
  );
};

export default PaymentsPage;
