import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { PageShell } from '@/components/teacher/PageShell';
import {
  PayoutSetupCard,
  PayoutFaqSection,
  type PayoutSetupViewModel,
  type PayoutStepViewModel,
} from '@/components/teacher/PayoutSetupCard';
import { PayoutStats, type PayoutRow } from '@/components/teacher/PayoutStats';
import { useAuth } from '@/contexts/AuthContext';
import {
  startStripeConnectOnboarding,
  refreshStripeConnectStatus,
  getStripeSettlements,
  type ConnectStatusResult,
  type StripeSettlementsResult,
  type StripeSettlementMoney,
} from '@/services/stripe-connect';
import { COMPANY } from '@/lib/company';
import { toast } from 'sonner';

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
 * are not gated on plan). The copy tracks what Stripe's flags actually mean:
 *
 *   • not started            → step 1 current, "Kom i gang" (hosted Stripe onboarding)
 *   • pending                → step 1 STILL current — details_submitted is false, i.e.
 *       the seller left Stripe's form before finishing. Nothing is under review;
 *       the copy sends them back ("Fortsett der du slapp"), never "we're checking".
 *   • restricted             → step 2 current — details ARE submitted. Whether the
 *       seller must wait (requirements.pending_verification: Stripe says "no action
 *       needed") or act (currently_due/past_due non-empty) is fetched live from
 *       check-stripe-connect-status (requirements_due) and picks the copy + tone.
 *   • rejected               → step 2 danger, contact support
 *   • connected, payouts off → step 3 current with warning — charges work but Stripe
 *       still blocks the bank transfer (unverified bank, risk hold). Surfaced only —
 *       never gates checkout/publish, which key off stripe_onboarding_complete alone.
 *
 * Once payouts flow, the stepper is replaced by the PayoutStats overview (key
 * figures + recent payouts from the settlements edge function); the raw
 * settlement detail stays on Stripe's own Express dashboard. Status re-syncs
 * automatically on return from Stripe
 * (?stripe=return) and server-side via the account.updated webhook, so there
 * is no manual "check status" control.
 */

// Stripe amounts are øre; the app displays kroner (mirrors CheckoutPage's amountOre).
// Exact kroner (no whole-krone rounding) so a small payout like 9,50 kr shows as
// "9,5 kr" instead of rounding up to "10 kr" and overstating what's owed.
const oreToKroner = (ore: number): number => ore / 100;

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
 * "Utbetalt i år" sums this calendar year's settled payouts.
 */
function derivePayoutStats(data: StripeSettlementsResult): {
  inTransit: number;
  paidYearToDate: number;
  nextPayoutDate: string | null;
  payouts: PayoutRow[];
} {
  const currentYear = new Date().getFullYear();
  const { payouts, balance } = data;

  // "På vei til deg" is everything owed to the studio that hasn't reached their
  // bank yet: money still settling in Stripe (pending balance), money settled
  // but not yet swept into a payout (available balance), plus payouts already
  // in flight. Without the balance a fresh sale shows nothing here — Stripe only
  // creates a payout object once it batches the transfer, so the funds sit in
  // the balance (invisible to a payouts-only view) for a day or two after a sale.
  const nokOnly = (m: StripeSettlementMoney): boolean =>
    (m.currency ?? '').toLowerCase() === 'nok';
  const sumMoney = (money: StripeSettlementMoney[]): number =>
    money.filter(nokOnly).reduce((sum, m) => sum + m.amount, 0);

  const inTransitOre =
    sumMoney(balance.pending) +
    sumMoney(balance.available) +
    payouts
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

// Height-matched placeholder while the settlements fetch is in flight — two
// blocks standing in for Nøkkeltall and the payout list.
// Exported so /dev/payout-preview can render the loading state without auth.
export function PayoutStatsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 w-full rounded-xl" />
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

  const settlementsQuery = useQuery({
    queryKey: ['payout-settlements', currentSeller?.id],
    enabled: !!currentSeller?.id && showStats,
    queryFn: async (): Promise<StripeSettlementsResult> => {
      const { data, error } = await getStripeSettlements(currentSeller!.id);
      if (error || !data) throw error ?? new Error('Utbetalinger utilgjengelig');
      return data;
    },
  });

  // 'restricted' covers two opposite situations — Stripe is verifying (wait) vs
  // Stripe needs more info (act). Only requirements_due can tell them apart, so
  // fetch it live; the call also re-syncs the persisted status server-side.
  const requirementsQuery = useQuery({
    queryKey: ['stripe-connect-requirements', currentSeller?.id],
    enabled: !!currentSeller?.id && stripeStarted && !stripeConnected && stripeStatus === 'restricted',
    staleTime: 60_000,
    queryFn: async (): Promise<ConnectStatusResult> => {
      const { data, error } = await refreshStripeConnectStatus(currentSeller!.id);
      if (error || !data) throw error ?? new Error('Status utilgjengelig');
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
  const queryClient = useQueryClient();
  const returnRequirementsDue = useRef<string[] | null>(null);
  const handleReturnFromStripe = useCallback(async () => {
    if (!currentSeller?.id) return;
    setCheckingReturn(true);
    const { data, error } = await refreshStripeConnectStatus(currentSeller.id);
    if (data) {
      // Seed the restricted-state query so the card doesn't re-fetch what the
      // return check just learned, and keep requirements_due for the toast.
      queryClient.setQueryData(['stripe-connect-requirements', currentSeller.id], data);
      returnRequirementsDue.current = data.requirements_due ?? null;
    }
    await refreshSellers();
    setCheckingReturn(false);
    if (error) {
      toast.error('Kunne ikke sjekke status. Prøv igjen.');
      return;
    }
    returnToastPending.current = true;
  }, [currentSeller?.id, refreshSellers, queryClient]);

  // Fire the return toast only once the refreshed seller row is in state, so the
  // message matches what the timeline shows.
  useEffect(() => {
    if (!returnToastPending.current || checkingReturn) return;
    returnToastPending.current = false;
    if (stripeConnected) {
      toast.success('Utbetalingene er klare.');
    } else if (stripeStatus === 'rejected') {
      // One terse sentence — the card behind the toast carries the contact CTA.
      toast.error('Søknaden ble avslått.');
    } else if (stripeStatus === 'restricted' && returnRequirementsDue.current?.length === 0) {
      // Everything submitted, Stripe is verifying — the seller finished their
      // part, so don't tell them the setup is unfinished.
      toast.success('Opplysningene er sendt inn.');
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
  // (State → Stripe mapping in the header comment.)
  const continueButton = (
    <Button
      onClick={handleStartStripe}
      loading={stripeLoading || checkingReturn}
      loadingText={checkingReturn ? 'Sjekker status' : 'Åpner'}
    >
      Fortsett oppsettet
    </Button>
  );

  let h2: string;
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
      steps = [
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
      ];
    } else if (stripeStatus === 'restricted') {
      // 'restricted' means details_submitted is true — step 1 is genuinely
      // done. Whether step 2 is "wait" or "act" comes from requirements_due.
      const due = requirementsQuery.data?.requirements_due;
      let step2: PayoutStepViewModel;
      if (due && due.length > 0) {
        h2 = 'Vi mangler litt informasjon';
        step2 = {
          title: STEP_2_TITLE,
          status: 'current',
          tone: 'warning',
          statusLabel: 'Krever handling',
          description: 'Fyll inn det som mangler, så aktiverer vi utbetalinger.',
          action: continueButton,
        };
      } else if (requirementsQuery.isError) {
        // Couldn't ask Stripe what (if anything) is missing — neutral copy
        // that neither promises "nothing to do" nor demands action, with the
        // button as an escape hatch.
        h2 = 'Vi kontrollerer opplysningene';
        step2 = {
          title: STEP_2_TITLE,
          status: 'current',
          description: 'Vi aktiverer utbetalinger så snart alt er godkjent.',
          action: continueButton,
        };
      } else {
        // Nothing due (or the check is still loading): Stripe is verifying —
        // per their docs "no action needed", so no CTA to a form with nothing
        // to fill in. The webhook flips the status when verification lands.
        h2 = 'Vi kontrollerer opplysningene';
        step2 = {
          title: STEP_2_TITLE,
          status: 'current',
          tone: 'info',
          statusLabel: 'Pågår',
          description: 'Stripe kontrollerer opplysningene dine. Du trenger ikke gjøre noe nå.',
        };
      }
      steps = [{ title: STEP_1_TITLE, status: 'done' }, step2, { title: STEP_3_TITLE, status: 'upcoming' }];
    } else {
      // 'pending' — the seller left Stripe's form before submitting it.
      // Nothing is under review, so step 1 is still theirs to finish; never
      // show it as done or imply we're waiting on Stripe.
      h2 = 'Fullfør oppsettet';
      steps = [
        {
          title: STEP_1_TITLE,
          status: 'current',
          statusLabel: 'Påbegynt',
          description: 'Du er ikke helt ferdig hos Stripe. Fortsett der du slapp.',
          action: continueButton,
        },
        { title: STEP_2_TITLE, status: 'upcoming' },
        { title: STEP_3_TITLE, status: 'upcoming' },
      ];
    }
  } else {
    // Connected. When payouts also flow, showStats swaps the stepper for the
    // PayoutStats overview — so this card only ever renders while Stripe still
    // blocks the bank transfer (unverified bank, risk hold). Step 3 is in
    // progress with a warning, not "done": the page must not say payouts are
    // ready when they aren't.
    h2 = 'Utbetalinger er ikke aktive ennå';
    steps = [
      { title: STEP_1_TITLE, status: 'done' },
      { title: STEP_2_TITLE, status: 'done' },
      {
        title: STEP_3_TITLE,
        status: 'current',
        tone: 'warning',
        statusLabel: 'Krever handling',
        description: 'Kortbetalinger virker, men Stripe trenger noe mer før pengene kan overføres til deg.',
        action: <Button onClick={handleOpenStripeDashboard}>Åpne Stripe</Button>,
      },
    ];
  }

  const viewModel: PayoutSetupViewModel = { h2, steps };

  // Full-width shell like the other dashboard pages — this is a status
  // surface, not a settings form, so no label-column SettingsRows.
  return (
    <PageShell
      title="Utbetalingskonto"
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
          />
        )
      ) : (
        <PayoutSetupCard viewModel={viewModel} />
      )}
      <PayoutFaqSection />
    </PageShell>
  );
};

export default PaymentsPage;
