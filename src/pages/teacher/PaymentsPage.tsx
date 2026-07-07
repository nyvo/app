import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/teacher/PageShell';
import {
  PayoutSetupCard,
  PayoutFaqSection,
  type PayoutSetupViewModel,
  type MarkerTone,
} from '@/components/teacher/PayoutSetupCard';
import { useAuth } from '@/contexts/AuthContext';
import {
  startStripeConnectOnboarding,
  refreshStripeConnectStatus,
  getStripeSettlements,
} from '@/services/stripe-connect';
import { friendlyError } from '@/lib/error-messages';
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
 *
 * No balance / settlements UI — the merchant manages all of that on Stripe's
 * own Express dashboard. Status re-syncs automatically on return from Stripe
 * (?stripe=return) and server-side via the account.updated webhook, so there
 * is no manual "check status" control.
 */
const PaymentsPage = () => {
  const { currentSeller, refreshSellers } = useAuth();

  const stripeConnected = !!currentSeller?.stripe_onboarding_complete;
  const stripeStarted = !!currentSeller?.stripe_account_id;
  const stripeStatus = currentSeller?.stripe_account_status ?? null;
  const [stripeLoading, setStripeLoading] = useState(false);

  const handleStartStripe = useCallback(async () => {
    if (!currentSeller?.id) return;
    setStripeLoading(true);
    const { data, error } = await startStripeConnectOnboarding(currentSeller.id);
    setStripeLoading(false);
    if (error || !data?.url) {
      toast.error(friendlyError(error, 'Kunne ikke starte oppsettet.'));
      return;
    }
    // Full-page redirect into Stripe's hosted Express onboarding; it returns to
    // /settings/payouts?stripe=return when done.
    window.location.href = data.url;
  }, [currentSeller?.id]);

  const handleCheckStripe = useCallback(async () => {
    if (!currentSeller?.id) return;
    const { data, error } = await refreshStripeConnectStatus(currentSeller.id);
    if (error) {
      toast.error('Kunne ikke sjekke status. Prøv igjen.');
      return;
    }
    await refreshSellers();
    if (data?.onboarding_complete) {
      toast.success('Utbetalinger er klare');
    } else if (data?.status === 'rejected') {
      toast.error(`Søknaden ble avslått. Ta gjerne kontakt på ${COMPANY.email}.`);
    } else {
      toast('Oppsettet er ikke fullført ennå.');
    }
  }, [currentSeller?.id, refreshSellers]);

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
  // expired onboarding link when Stripe sends ?stripe=refresh.
  useEffect(() => {
    if (!currentSeller?.id) return;
    const stripeParam = new URLSearchParams(window.location.search).get('stripe');
    if (stripeParam === 'return') void handleCheckStripe();
    else if (stripeParam === 'refresh') void handleStartStripe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSeller?.id]);

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
          'Du blir sendt til Stripe – betalingspartneren vår – for å bekrefte virksomheten og legge inn kontonummeret pengene skal gå til.',
        action: (
          <Button onClick={handleStartStripe} loading={stripeLoading} loadingText="Starter">
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
      step2Title = 'Søknaden ble ikke godkjent';
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
        <Button onClick={handleStartStripe} loading={stripeLoading} loadingText="Åpner">
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
          'Pengene overføres automatisk til bankkontoen din. Saldo og alle utbetalinger finner du i oversikten.',
        action: <Button onClick={handleOpenStripeDashboard}>Se oversikt</Button>,
      },
    ];
  }

  const viewModel: PayoutSetupViewModel = { h2, counter, steps };

  return (
    <PageShell narrow="centered" title="Utbetalingskonto" description="Slik får du betalt for kursene dine.">
      <PayoutSetupCard viewModel={viewModel} />
      <PayoutFaqSection />
    </PageShell>
  );
};

export default PaymentsPage;
