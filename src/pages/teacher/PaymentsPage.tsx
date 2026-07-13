import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { PageShell } from '@/components/teacher/PageShell';
import {
  PayoutSetupCard,
  PayoutFaq,
  type PayoutSetupViewModel,
  type MarkerTone,
} from '@/components/teacher/PayoutSetupCard';
import { SettingsRows, SettingsRow } from '@/components/teacher/SettingsRows';
import { useAuth } from '@/contexts/AuthContext';
import {
  startStripeConnectOnboarding,
  refreshStripeConnectStatus,
  getStripeSettlements,
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
  let counter: string;
  let step2Title = STEP_2_TITLE;
  let step2Tone: MarkerTone = 'neutral';
  let step2Desc: string;
  let step2Action: ReactNode;
  let steps: PayoutSetupViewModel['steps'];

  if (!stripeStarted && !stripeConnected) {
    h2 = 'Sett opp utbetalinger';
    counter = 'Steg 1 av 3';
    steps = [
      {
        title: STEP_1_TITLE,
        status: 'current',
        description:
          'Du blir sendt til Stripe for å bekrefte virksomheten og legge inn kontonummeret pengene skal gå til.',
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
    counter = 'Steg 2 av 3';
    if (stripeStatus === 'rejected') {
      h2 = 'Søknaden ble avslått';
      step2Title = 'Søknaden ble avslått';
      step2Tone = 'danger';
      step2Desc = `Ta gjerne kontakt på ${COMPANY.email}, så hjelper vi deg videre.`;
      step2Action = (
        <Button asChild>
          <a href={`mailto:${COMPANY.email}`}>Kontakt oss</a>
        </Button>
      );
    } else {
      h2 = 'Fullfør oppsettet';
      if (stripeStatus === 'restricted') {
        step2Title = 'Vi mangler litt informasjon';
        step2Tone = 'warning';
        step2Desc = 'Fyll inn det som gjenstår, så aktiverer vi utbetalinger så snart alt er på plass.';
      } else {
        step2Desc =
          'Vi aktiverer utbetalinger automatisk så snart alt er godkjent. Mangler det noe, kan du fortsette der du slapp.';
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
      { title: step2Title, status: 'current', tone: step2Tone, description: step2Desc, action: step2Action },
      { title: STEP_3_TITLE, status: 'upcoming' },
    ];
  } else {
    h2 = 'Utbetalingene er klare';
    counter = 'Fullført';
    steps = [
      { title: STEP_1_TITLE, status: 'done' },
      { title: STEP_2_TITLE, status: 'done' },
      {
        title: STEP_3_TITLE,
        status: 'current',
        tone: 'success',
        description:
          'Pengene overføres automatisk til bankkontoen din. Saldo og alle utbetalinger finner du i Stripe-oversikten.',
        action: <Button onClick={handleOpenStripeDashboard}>Åpne Stripe</Button>,
      },
    ];
  }

  const viewModel: PayoutSetupViewModel = { h2, counter, steps };

  // Same layout skeleton as the other settings pages (profile, studio):
  // default-width PageShell + SettingsRows sections, not a centered column.
  return (
    <PageShell title="Utbetalingskonto">
      <SettingsRows>
        <SettingsRow title="Utbetalinger" description="Slik får du betalt for kursene dine.">
          {currentSellerHydrateFailed ? (
            // stripe_account_id is a stale safe-default (null) — the timeline
            // would show step 1 to a seller who already started onboarding.
            // Bail to a bounded retry instead. The FAQ below is static, so it stays.
            <ErrorState
              title="Kunne ikke hente kontoinformasjon"
              message="Prøv igjen om litt."
              onRetry={refreshSellers}
            />
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
