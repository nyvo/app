import { useCallback, useEffect, useState } from 'react';
import { Check } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { PageShell } from '@/components/teacher/PageShell';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  createDinteroSeller,
  checkDinteroSellerStatus,
  type DinteroOnboardingStatus,
} from '@/services/dintero-seller';
import { friendlyError } from '@/lib/error-messages';
import { toast } from 'sonner';

interface OnboardingFormState {
  organizationNumber: string;
}

const STATUS_LABEL: Record<DinteroOnboardingStatus, string> = {
  PENDING: 'Venter på bekreftelse',
  WAITING_FOR_DECLARATION: 'Venter på bekreftelse fra deg',
  WAITING_FOR_SIGNATURE: 'Venter på signatur',
  ACTIVE: 'Aktiv',
  DECLINED: 'Avslått',
  TERMINATED: 'Avsluttet',
};

// Dintero's merchant backoffice. Generic landing — Dintero handles login and
// routes the merchant to their account from there. We don't have a per-account
// deep link in the wrapper as of 2026-04-25.
const DINTERO_BACKOFFICE_URL = 'https://backoffice.dintero.com/';

/**
 * Payments page. Three states based on the org's Dintero onboarding flags:
 *
 *   1. !hasApproval && !isConnected → minimal onboarding form
 *   2.  hasApproval && !isConnected → "fullfør hos Dintero" with status + buttons
 *   3.  isConnected                → success state + link to Dintero backoffice
 *
 * No balance / settlements / transactions display — the merchant manages all of
 * that on Dintero's own dashboard. Keeps this surface as small as possible.
 */
const PaymentsPage = () => {
  const { currentSeller, refreshSellers } = useAuth();

  const onboardingStatus =
    (currentSeller?.dintero_onboarding_status as DinteroOnboardingStatus | null) || null;
  const isConnected = !!currentSeller?.dintero_onboarding_complete;
  const hasApproval = !!currentSeller?.dintero_seller_id;

  // dintero_contract_url is no longer on the public sellers row — it's a KYC
  // URL that's gated to seller members only. Fetch it through the
  // get_seller_private RPC, which checks membership server-side.
  const [contractUrl, setContractUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!currentSeller?.id || isConnected) {
      setContractUrl(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.rpc as any)('get_seller_private', {
        p_seller_id: currentSeller.id,
      });
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : null;
      setContractUrl(row?.dintero_contract_url ?? null);
    })();
    return () => { cancelled = true };
  }, [currentSeller?.id, isConnected, onboardingStatus]);

  const [form, setForm] = useState<OnboardingFormState>({
    organizationNumber: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const handleSubmitOnboarding = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentSeller?.id) return;
      if (!form.organizationNumber.trim()) {
        toast.error('Skriv inn organisasjonsnummer');
        return;
      }

      setSubmitting(true);
      const autoApprove = new URLSearchParams(window.location.search).get('auto_approve') === '1';
      const { data, error } = await createDinteroSeller({
        sellerId: currentSeller.id,
        organizationNumber: form.organizationNumber.trim(),
        sandboxAutoApprove: autoApprove,
      });
      setSubmitting(false);

      if (error || !data) {
        toast.error(friendlyError(error, 'Kunne ikke starte oppsettet.'));
        return;
      }

      await refreshSellers();

      if (data.alreadyOnboarded) {
        toast.success('Utbetalinger er allerede klare');
        return;
      }

      if (data.contractUrl) {
        window.open(data.contractUrl, '_blank', 'noopener,noreferrer');
        toast.success('Fortsett oppsettet hos Dintero i den nye fanen');
      } else {
        toast.success('Sjekk e-posten din for å fullføre oppsettet');
      }
    },
    [currentSeller?.id, form, refreshSellers],
  );

  const handleCheckStatus = useCallback(async () => {
    if (!currentSeller?.id) return;
    setCheckingStatus(true);
    const { data, error } = await checkDinteroSellerStatus(currentSeller.id);
    setCheckingStatus(false);
    if (error) {
      toast.error('Kunne ikke sjekke status. Prøv igjen.');
      return;
    }
    await refreshSellers();
    if (data?.onboardingComplete) {
      toast.success('Utbetalinger er klare');
    } else if (data?.status === 'DECLINED') {
      toast.error('Søknaden ble avslått. Send en e-post til hei@openspot.no.');
    } else {
      toast('Oppsettet er ikke fullført ennå. Sjekk e-posten din.');
    }
  }, [currentSeller?.id, refreshSellers]);

  const handleOpenContract = useCallback(() => {
    if (!contractUrl) return;
    window.open(contractUrl, '_blank', 'noopener,noreferrer');
  }, [contractUrl]);

  const handleOpenDintero = useCallback(() => {
    window.open(DINTERO_BACKOFFICE_URL, '_blank', 'noopener,noreferrer');
  }, []);

  // Refresh when coming back from Dintero's hosted KYC (?dintero_return=1).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('dintero_return') === '1' && currentSeller?.id) {
      void handleCheckStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSeller?.id]);

  return (
    <main className="flex-1 min-h-full overflow-y-auto bg-background">
      <MobileTeacherHeader />

      <PageShell narrow="centered" title="Betalingskonto">
        <div className="space-y-8">
          {/* ─── State 1: Not started — minimal onboarding form ─── */}
          {!hasApproval && !isConnected && (
            <section className="space-y-6">
              <div>
                <h2 className="text-base font-medium tracking-tight text-foreground">Sett opp utbetalinger</h2>
                <p className="mt-1 text-base text-foreground-muted">
                  Vi bruker Dintero til å håndtere utbetalinger. Du fullfører oppsettet hos dem.
                </p>
              </div>
              <Card>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleSubmitOnboarding}>
                    <div className="grid gap-2">
                      <label
                        htmlFor="organizationNumber"
                        className="text-sm font-medium text-foreground"
                      >
                        Organisasjonsnummer
                      </label>
                      <Input
                        id="organizationNumber"
                        inputMode="numeric"
                        pattern="\d{9}"
                        placeholder="9 siffer"
                        value={form.organizationNumber}
                        onChange={(e) =>
                          setForm({ ...form, organizationNumber: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="flex items-center justify-end pt-2">
                      <Button type="submit" loading={submitting} loadingText="Oppretter">
                        Fortsett til Dintero
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </section>
          )}

          {/* ─── State 2: Approval in progress ─── */}
          {hasApproval && !isConnected && (
            <section className="space-y-6">
              <div>
                <h2 className="text-base font-medium tracking-tight text-foreground">Fullfør hos Dintero</h2>
                <p className="mt-1 text-base text-foreground-muted">
                  Status: {onboardingStatus ? STATUS_LABEL[onboardingStatus] : 'Venter'}.
                </p>
              </div>
              <Card>
                <CardContent>
                  {onboardingStatus === 'DECLINED' || onboardingStatus === 'TERMINATED' ? (
                    <p className="text-base text-foreground">
                      {onboardingStatus === 'DECLINED'
                        ? 'Søknaden ble avslått. Kontakt oss for hjelp.'
                        : 'Avtalen er avsluttet. Kontakt oss for hjelp.'}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-base text-foreground">
                        Sjekk e-posten fra Dintero og signer avtalen. Når den er godkjent,
                        aktiverer vi utbetalinger automatisk.
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          onClick={handleCheckStatus}
                          loading={checkingStatus}
                          loadingText="Sjekker"
                        >
                          Sjekk status
                        </Button>
                        {contractUrl && (
                          <Button onClick={handleOpenContract}>
                            Åpne hos Dintero
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          )}

          {/* ─── State 3: Active — success card with Dintero link ─── */}
          {isConnected && (
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
                      Dintero håndterer utbetalingene direkte til bankkontoen din. Saldo,
                      transaksjoner og innstillinger ser du på Dintero-kontoen din.
                    </p>
                    <div className="mt-4">
                      <Button onClick={handleOpenDintero}>
                        Åpne Dintero-konto
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
