import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from '@/lib/icons';
import { pageVariants, pageTransition } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { useAuth } from '@/contexts/AuthContext';
import {
  createDinteroSeller,
  checkDinteroSellerStatus,
  type DinteroOnboardingStatus,
} from '@/services/dintero-seller';
import { toast } from 'sonner';

interface OnboardingFormState {
  businessName: string;
  organizationNumber: string;
  contactEmail: string;
  bankAccountNumber: string;
  bankName: string;
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
  const { currentSeller, user, refreshSellers } = useAuth();

  const onboardingStatus =
    (currentSeller?.dintero_onboarding_status as DinteroOnboardingStatus | null) || null;
  const isConnected = !!currentSeller?.dintero_onboarding_complete;
  const hasApproval = !!currentSeller?.dintero_seller_id;
  const contractUrl = currentSeller?.dintero_contract_url || null;

  const [form, setForm] = useState<OnboardingFormState>({
    businessName: currentSeller?.name || '',
    organizationNumber: '',
    contactEmail: user?.email || '',
    bankAccountNumber: '',
    bankName: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const handleSubmitOnboarding = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentSeller?.id) return;
      if (
        !form.businessName.trim() ||
        !form.organizationNumber.trim() ||
        !form.contactEmail.trim() ||
        !form.bankAccountNumber.trim() ||
        !form.bankName.trim()
      ) {
        toast.error('Fyll ut alle feltene');
        return;
      }

      setSubmitting(true);
      const autoApprove = new URLSearchParams(window.location.search).get('auto_approve') === '1';
      const { data, error } = await createDinteroSeller({
        sellerId: currentSeller.id,
        organizationNumber: form.organizationNumber.trim(),
        businessName: form.businessName.trim(),
        contactEmail: form.contactEmail.trim(),
        bankAccountNumber: form.bankAccountNumber.trim(),
        bankName: form.bankName.trim(),
        sandboxAutoApprove: autoApprove,
      });
      setSubmitting(false);

      if (error || !data) {
        toast.error(error?.message || 'Kunne ikke starte oppsettet');
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
      toast.error('Søknaden ble avslått. Kontakt oss for hjelp.');
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
      <MobileTeacherHeader title="Betalinger" />

      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        transition={pageTransition}
        className="mx-auto w-full max-w-6xl px-6 pb-24 md:pb-8 lg:px-8"
      >
        <div className="mb-8 pt-6 lg:pt-12">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Betalinger</h1>
        </div>

        <div className="space-y-8">
          {/* ─── State 1: Not started — minimal onboarding form ─── */}
          {!hasApproval && !isConnected && (
            <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
              <div>
                <h2 className="text-base font-semibold text-foreground">Sett opp utbetalinger</h2>
                <p className="mt-1 text-sm text-foreground-muted">
                  Du fyller ut signering og bekreftelse på Dinteros side. Det tar 5–10 minutter.
                </p>
              </div>
              <Card className="md:col-span-2">
                <CardContent>
                  <form className="space-y-4" onSubmit={handleSubmitOnboarding}>
                    <div className="grid gap-2">
                      <label
                        htmlFor="businessName"
                        className="text-sm font-medium text-foreground"
                      >
                        Selskapsnavn
                      </label>
                      <Input
                        id="businessName"
                        value={form.businessName}
                        onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                        required
                      />
                    </div>
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
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <label
                          htmlFor="bankAccountNumber"
                          className="text-sm font-medium text-foreground"
                        >
                          Kontonummer
                        </label>
                        <Input
                          id="bankAccountNumber"
                          inputMode="numeric"
                          placeholder="11 siffer"
                          value={form.bankAccountNumber}
                          onChange={(e) =>
                            setForm({ ...form, bankAccountNumber: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <label
                          htmlFor="bankName"
                          className="text-sm font-medium text-foreground"
                        >
                          Banknavn
                        </label>
                        <Input
                          id="bankName"
                          value={form.bankName}
                          onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <label
                        htmlFor="contactEmail"
                        className="text-sm font-medium text-foreground"
                      >
                        Kontakt-e-post
                      </label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={form.contactEmail}
                        onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                        required
                      />
                      <p className="text-sm text-foreground-muted">
                        Dintero sender signering og oppdateringer hit.
                      </p>
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
            <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
              <div>
                <h2 className="text-base font-semibold text-foreground">Fullfør hos Dintero</h2>
                <p className="mt-1 text-sm text-foreground-muted">
                  Status: {onboardingStatus ? STATUS_LABEL[onboardingStatus] : 'Venter'}.
                </p>
              </div>
              <Card className="md:col-span-2">
                <CardContent>
                  {onboardingStatus === 'DECLINED' || onboardingStatus === 'TERMINATED' ? (
                    <p className="text-sm text-foreground">
                      {onboardingStatus === 'DECLINED'
                        ? 'Søknaden ble avslått. Kontakt oss for hjelp.'
                        : 'Avtalen er avsluttet. Kontakt oss for hjelp.'}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-foreground">
                        Sjekk e-posten fra Dintero og signer avtalen. Når den er godkjent
                        aktiverer vi utbetalinger automatisk.
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCheckStatus}
                          loading={checkingStatus}
                          loadingText="Sjekker"
                        >
                          Sjekk status
                        </Button>
                        {contractUrl && (
                          <Button size="sm" onClick={handleOpenContract}>
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
            <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
              <div>
                <h2 className="text-base font-semibold text-foreground">Utbetalinger er aktive</h2>
                <p className="mt-1 text-sm text-foreground-muted">
                  Avtalen med Dintero er på plass.
                </p>
              </div>
              <Card className="md:col-span-2">
                <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-success-subtle text-success">
                    <Check className="size-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-semibold text-foreground">
                      Utbetalinger er klare
                    </p>
                    <p className="mt-1 text-sm text-foreground-muted">
                      Dintero håndterer utbetalingene direkte til bankkontoen din. Saldo,
                      transaksjoner og innstillinger ser du på din Dintero-konto.
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
      </motion.div>
    </main>
  );
};

export default PaymentsPage;
