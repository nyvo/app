import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { PageShell } from '@/components/teacher/PageShell';
import { useAuth } from '@/contexts/AuthContext';
import { routes } from '@/lib/routes';
import { isProSeller } from '@/lib/payments';
import {
  startStripeConnectOnboarding,
  refreshStripeConnectStatus,
  getStripeSettlements,
} from '@/services/stripe-connect';
import { friendlyError } from '@/lib/error-messages';
import { toast } from 'sonner';

type StatusTone = {
  variant: 'success' | 'warning' | 'destructive' | 'neutral';
  /** Subtle same-hue border ring — the Copilot-style badge anatomy. */
  ring: string;
  label: string;
};

// Stripe Connect account status → badge tone + Norwegian label.
const STRIPE_STATUS_BADGE: Record<'pending' | 'restricted' | 'rejected' | 'enabled', StatusTone> = {
  pending: { variant: 'warning', ring: 'border-warning/30', label: 'Venter på fullføring' },
  restricted: { variant: 'warning', ring: 'border-warning/30', label: 'Mangler informasjon' },
  rejected: { variant: 'destructive', ring: 'border-danger/25', label: 'Avslått' },
  enabled: { variant: 'success', ring: 'border-success/30', label: 'Aktiv' },
};

const NOT_STARTED_BADGE: StatusTone = { variant: 'neutral', ring: 'border-foreground-muted/20', label: 'Ikke satt opp' };
const PRO_LOCKED_BADGE: StatusTone = { variant: 'neutral', ring: 'border-foreground-muted/20', label: 'Pro-funksjon' };

function StatusPill({ tone }: { tone: StatusTone }) {
  return (
    <Badge
      variant={tone.variant}
      shape="pill"
      size="sm"
      className={tone.ring}
      role="status"
      aria-label={`Status: ${tone.label}`}
    >
      {tone.label}
    </Badge>
  );
}

/**
 * Payments page — a single flat "payout account" surface (modeled on Copilot's
 * Payout account screen): page title with an inline status badge, then a
 * subtitle and a divider; below it a short sub-headline, a one-sentence
 * description, and a single primary action. The content is driven by the
 * seller's Stripe Connect onboarding state:
 *
 *   • !isPro                   → upsell: card payments are a Pro feature
 *   • Pro, not started         → "Kom i gang" (hosted Stripe onboarding)
 *   • Pro, started, !connected → "Fortsett oppsettet" (+ rejected sub-case)
 *   • Pro, connected           → "Se oversikt" (Stripe Express dashboard)
 *
 * No balance / settlements UI — the merchant manages all of that on Stripe's
 * own Express dashboard. Status re-syncs automatically on return from Stripe
 * (?stripe=return) and server-side via the account.updated webhook, so there
 * is no manual "check status" control.
 */
const PaymentsPage = () => {
  const { currentSeller, refreshSellers } = useAuth();
  const isPro = isProSeller(currentSeller);

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
      toast.error('Søknaden ble avslått. Ta gjerne kontakt på hei@openspot.no.');
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
    if (!currentSeller?.id || !isPro) return;
    const stripeParam = new URLSearchParams(window.location.search).get('stripe');
    if (stripeParam === 'return') void handleCheckStripe();
    else if (stripeParam === 'refresh') void handleStartStripe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSeller?.id, isPro]);

  // ─── One view-model per onboarding state, rendered by the flat layout below ───
  let subhead: string;
  let tone: StatusTone;
  let desc: string;
  let action: ReactNode;

  if (!isPro) {
    subhead = 'Ta betalt med kort';
    tone = PRO_LOCKED_BADGE;
    desc =
      'I dag avtaler du betaling direkte med deltakerne. Med Pro får du kortbetaling og automatiske utbetalinger.';
    action = (
      <Button asChild>
        <Link to={routes.settingsBilling}>Oppgrader til Pro</Link>
      </Button>
    );
  } else if (!stripeStarted && !stripeConnected) {
    subhead = 'Sett opp utbetalinger';
    tone = NOT_STARTED_BADGE;
    desc =
      'Vi sender deg til Stripe for å bekrefte virksomheten og legge til kontonummeret utbetalingene skal gå til.';
    action = (
      <Button onClick={handleStartStripe} loading={stripeLoading} loadingText="Starter">
        Kom i gang
      </Button>
    );
  } else if (stripeStarted && !stripeConnected) {
    if (stripeStatus === 'rejected') {
      subhead = 'Søknaden ble avslått';
      tone = STRIPE_STATUS_BADGE.rejected;
      desc = 'Ta gjerne kontakt på hei@openspot.no, så hjelper vi deg.';
      action = (
        <Button asChild>
          <a href="mailto:hei@openspot.no">Kontakt oss</a>
        </Button>
      );
    } else {
      subhead = 'Fullfør oppsettet';
      if (stripeStatus === 'restricted') {
        tone = STRIPE_STATUS_BADGE.restricted;
        desc = 'Stripe mangler litt informasjon. Vi aktiverer utbetalinger så snart alt er på plass.';
      } else {
        tone = STRIPE_STATUS_BADGE.pending;
        desc = 'Vi aktiverer utbetalinger automatisk når kontoen er klar hos Stripe.';
      }
      action = (
        <Button onClick={handleStartStripe} loading={stripeLoading} loadingText="Åpner">
          Fortsett oppsettet
        </Button>
      );
    }
  } else {
    subhead = 'Utbetalingene er klare';
    tone = STRIPE_STATUS_BADGE.enabled;
    desc =
      'Stripe håndterer utbetalingene direkte til bankkontoen din. Saldo, utbetalinger og innstillinger finner du i oversikten.';
    action = <Button onClick={handleOpenStripeDashboard}>Se oversikt</Button>;
  }

  return (
    <main className="flex-1 min-h-full overflow-y-auto bg-background">
      <MobileTeacherHeader />

      <PageShell
        narrow="centered"
        title="Utbetalingskonto"
        badge={<StatusPill tone={tone} />}
        description="Slik får du betalt for kursene dine."
      >
        <div className="border-t border-border-subtle pt-8">
          <h2 className="text-base font-medium tracking-tight text-foreground">{subhead}</h2>
          <p className="mt-1 max-w-prose text-base text-foreground-muted">{desc}</p>
          <div className="mt-5">{action}</div>
        </div>
      </PageShell>
    </main>
  );
};

export default PaymentsPage;
