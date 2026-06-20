import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

const STRIPE_STATUS_LABEL: Record<string, string> = {
  pending: 'Venter på fullføring',
  restricted: 'Mangler informasjon',
  rejected: 'Avslått',
  enabled: 'Aktiv',
};

/**
 * Payments page. Three states based on the seller's Stripe Connect onboarding:
 *
 *   1. !stripeStarted && !stripeConnected → minimal onboarding CTA
 *   2.  stripeStarted && !stripeConnected → "fullfør hos Stripe" with status + buttons
 *   3.  stripeConnected                  → success state + link to Stripe dashboard
 *
 * No balance / settlements / transactions display — the merchant manages all of
 * that on Stripe's own Express dashboard.
 */
const PaymentsPage = () => {
  const { currentSeller, refreshSellers } = useAuth();
  const isPro = isProSeller(currentSeller);

  const stripeConnected = !!currentSeller?.stripe_onboarding_complete;
  const stripeStarted = !!currentSeller?.stripe_account_id;
  const stripeStatus = currentSeller?.stripe_account_status ?? null;
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeChecking, setStripeChecking] = useState(false);

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
    setStripeChecking(true);
    const { data, error } = await refreshStripeConnectStatus(currentSeller.id);
    setStripeChecking(false);
    if (error) {
      toast.error('Kunne ikke sjekke status. Prøv igjen.');
      return;
    }
    await refreshSellers();
    if (data?.onboarding_complete) {
      toast.success('Utbetalinger er klare');
    } else if (data?.status === 'rejected') {
      toast.error('Søknaden ble avslått. Send en e-post til hei@openspot.no.');
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

  if (!isPro) {
    return (
      <main className="flex-1 min-h-full overflow-y-auto bg-background">
        <MobileTeacherHeader />

        <PageShell narrow="centered" title="Betalingskonto">
          <Card>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-base font-medium text-foreground">
                  Integrerte betalinger er Pro
                </p>
                <p className="mt-1 text-base text-foreground-muted">
                  Start-kontoer tar imot påmeldinger med betaling avtalt direkte med instruktør.
                  Oppgrader til Pro for kortbetaling, servicegebyr og automatiske utbetalinger.
                </p>
              </div>
              <Button asChild className="shrink-0">
                <Link to={routes.settingsBilling}>Se abonnement</Link>
              </Button>
            </CardContent>
          </Card>
        </PageShell>
      </main>
    );
  }

  return (
    <main className="flex-1 min-h-full overflow-y-auto bg-background">
      <MobileTeacherHeader />

      <PageShell narrow="centered" title="Betalingskonto">
        <div className="space-y-8">
          {/* ─── Not started — single CTA; Stripe collects the details in hosted onboarding ─── */}
          {!stripeStarted && !stripeConnected && (
            <section className="space-y-6">
              <div>
                <h2 className="text-base font-medium tracking-tight text-foreground">Sett opp utbetalinger</h2>
                <p className="mt-1 text-base text-foreground-muted">
                  Vi bruker Stripe til å håndtere utbetalinger. Du fullfører oppsettet hos dem.
                </p>
              </div>
              <Card>
                <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-base text-foreground">
                    Du blir sendt til Stripe for å bekrefte virksomheten og legge til kontonummeret utbetalingene skal gå til.
                  </p>
                  <Button
                    className="shrink-0"
                    onClick={handleStartStripe}
                    loading={stripeLoading}
                    loadingText="Starter"
                  >
                    Kom i gang
                  </Button>
                </CardContent>
              </Card>
            </section>
          )}

          {/* ─── In progress ─── */}
          {stripeStarted && !stripeConnected && (
            <section className="space-y-6">
              <div>
                <h2 className="text-base font-medium tracking-tight text-foreground">Fullfør hos Stripe</h2>
                <p className="mt-1 text-base text-foreground-muted">
                  Status: {stripeStatus ? (STRIPE_STATUS_LABEL[stripeStatus] ?? 'Venter') : 'Venter'}.
                </p>
              </div>
              <Card>
                <CardContent>
                  {stripeStatus === 'rejected' ? (
                    <p className="text-base text-foreground">
                      Søknaden ble avslått. Kontakt oss på hei@openspot.no for hjelp.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-base text-foreground">
                        Fullfør oppsettet hos Stripe. Når kontoen er klar, aktiverer vi utbetalinger automatisk.
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          onClick={handleCheckStripe}
                          loading={stripeChecking}
                          loadingText="Sjekker"
                        >
                          Sjekk status
                        </Button>
                        <Button onClick={handleStartStripe} loading={stripeLoading} loadingText="Åpner">
                          Fortsett hos Stripe
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          )}

          {/* ─── Active — success card with a link into the Express dashboard ─── */}
          {stripeConnected && (
            <section>
              <Card>
                <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground-muted">
                    <Check className="size-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-medium text-foreground">
                      Utbetalinger er klare
                    </p>
                    <p className="mt-1 text-base text-foreground-muted">
                      Stripe håndterer utbetalingene direkte til bankkontoen din. Saldo, utbetalinger og innstillinger ser du i Stripe-panelet.
                    </p>
                    <div className="mt-4">
                      <Button onClick={handleOpenStripeDashboard}>
                        Åpne Stripe-panelet
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}
        </div>
      </PageShell>
    </main>
  );
};

export default PaymentsPage;
