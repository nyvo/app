import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, AlertCircle } from '@/lib/icons';
import { pageVariants, pageTransition } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/error-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { useAuth } from '@/contexts/AuthContext';
import {
  createDinteroSeller,
  checkDinteroSellerStatus,
  getDinteroSettlements,
  type DinteroSettlementsResult,
  type DinteroSettlementTransfer,
  type DinteroOnboardingStatus,
} from '@/services/dintero-seller';
import { typedFrom } from '@/lib/supabase';
import { formatKroner } from '@/lib/utils';
import { toast } from 'sonner';

interface TransactionRow {
  id: string;
  participant_name: string;
  amount_paid: number | null;
  created_at: string;
  course: { id: string; title: string } | null;
}

interface OnboardingFormState {
  businessName: string;
  organizationNumber: string;
  contactEmail: string;
  contactName: string;
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

const PaymentsPage = () => {
  const { currentOrganization, user, refreshOrganizations } = useAuth();

  const onboardingStatus = (currentOrganization?.dintero_onboarding_status as DinteroOnboardingStatus | null) || null;
  const isConnected = !!currentOrganization?.dintero_onboarding_complete;
  const hasApproval = !!currentOrganization?.dintero_seller_id;
  const contractUrl = currentOrganization?.dintero_contract_url || null;

  const [settlements, setSettlements] = useState<DinteroSettlementsResult | null>(null);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<OnboardingFormState>({
    businessName: currentOrganization?.name || '',
    organizationNumber: '',
    contactEmail: user?.email || '',
    contactName: '',
    bankAccountNumber: '',
    bankName: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentOrganization?.id || !isConnected) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [settlementsResult, txResult] = await Promise.all([
      getDinteroSettlements(currentOrganization.id),
      typedFrom('signups')
        .select('id, participant_name, amount_paid, created_at, course:courses(id, title)')
        .eq('organization_id', currentOrganization.id)
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (settlementsResult.error) {
      setError(settlementsResult.error.message);
    } else {
      setSettlements(settlementsResult.data);
    }

    if (!txResult.error && txResult.data) {
      setTransactions(txResult.data as unknown as TransactionRow[]);
    }

    setLoading(false);
  }, [currentOrganization?.id, isConnected]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh when coming back from Dintero's hosted KYC
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('dintero_return') === '1' && currentOrganization?.id) {
      void handleCheckStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization?.id]);

  const handleSubmitOnboarding = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentOrganization?.id) return;
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
        organizationId: currentOrganization.id,
        organizationNumber: form.organizationNumber.trim(),
        businessName: form.businessName.trim(),
        contactEmail: form.contactEmail.trim(),
        contactName: form.contactName.trim() || undefined,
        bankAccountNumber: form.bankAccountNumber.trim(),
        bankName: form.bankName.trim(),
        sandboxAutoApprove: autoApprove,
      });
      setSubmitting(false);

      if (error || !data) {
        toast.error(error?.message || 'Kunne ikke starte oppsettet');
        return;
      }

      await refreshOrganizations();

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
    [currentOrganization?.id, form, refreshOrganizations],
  );

  const handleCheckStatus = useCallback(async () => {
    if (!currentOrganization?.id) return;
    setCheckingStatus(true);
    const { data, error } = await checkDinteroSellerStatus(currentOrganization.id);
    setCheckingStatus(false);
    if (error) {
      toast.error('Kunne ikke sjekke status. Prøv igjen.');
      return;
    }
    await refreshOrganizations();
    if (data?.onboardingComplete) {
      toast.success('Utbetalinger er klare');
    } else if (data?.status === 'DECLINED') {
      toast.error('Søknaden ble avslått. Kontakt oss for hjelp.');
    } else {
      toast('Oppsettet er ikke fullført ennå. Sjekk e-posten din.');
    }
  }, [currentOrganization?.id, refreshOrganizations]);

  const handleOpenContract = useCallback(() => {
    if (!contractUrl) return;
    window.open(contractUrl, '_blank', 'noopener,noreferrer');
  }, [contractUrl]);

  const formatDate = (dateStr: string | number | null): string => {
    if (!dateStr) return '—';
    const date = typeof dateStr === 'number' ? new Date(dateStr * 1000) : new Date(dateStr);
    return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Dintero amounts are in minor units (øre) — divide by 100 for kroner
  const oreToKroner = (amount: number): number => Math.round(amount / 100);

  return (
    <main className="flex-1 min-h-full overflow-y-auto bg-background">
      <MobileTeacherHeader title="Betalinger" />

      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        transition={pageTransition}
        className="px-6 pb-24 md:pb-8 lg:px-8"
      >
        <div className="mb-10 border-b border-border pt-6 pb-8 lg:pt-8">
          <h1 className="text-3xl font-semibold text-foreground">Betalinger</h1>
          <p className="mt-1 text-sm text-muted-foreground">Oversikt over utbetalinger og transaksjoner.</p>
        </div>

        <div className="mx-auto max-w-5xl space-y-8">
          {/* Not started yet — show onboarding form */}
          {!hasApproval && !isConnected && (
            <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
              <div>
                <h2 className="text-base font-semibold text-foreground">Sett opp utbetaling</h2>
                <p className="text-sm mt-1 text-muted-foreground">
                  Vi trenger noen detaljer før Dintero kan godkjenne utbetaling til kontoen din.
                </p>
              </div>
              <Card className="md:col-span-2">
                <CardContent>
                  <form className="space-y-4" onSubmit={handleSubmitOnboarding}>
                    <div className="space-y-1.5">
                      <label htmlFor="businessName" className="text-xs font-medium mb-1.5 block text-foreground">Selskapsnavn</label>
                      <Input
                        id="businessName"
                        value={form.businessName}
                        onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="organizationNumber" className="text-xs font-medium mb-1.5 block text-foreground">Organisasjonsnummer</label>
                      <Input
                        id="organizationNumber"
                        inputMode="numeric"
                        pattern="\d{9}"
                        placeholder="9 siffer"
                        value={form.organizationNumber}
                        onChange={(e) => setForm({ ...form, organizationNumber: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label htmlFor="contactEmail" className="text-xs font-medium mb-1.5 block text-foreground">Kontakt e-post</label>
                        <Input
                          id="contactEmail"
                          type="email"
                          value={form.contactEmail}
                          onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="contactName" className="text-xs font-medium mb-1.5 block text-foreground">Kontaktperson (valgfritt)</label>
                        <Input
                          id="contactName"
                          value={form.contactName}
                          onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label htmlFor="bankAccountNumber" className="text-xs font-medium mb-1.5 block text-foreground">Kontonummer</label>
                        <Input
                          id="bankAccountNumber"
                          inputMode="numeric"
                          placeholder="11 siffer"
                          value={form.bankAccountNumber}
                          onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="bankName" className="text-xs font-medium mb-1.5 block text-foreground">Banknavn</label>
                        <Input
                          id="bankName"
                          placeholder="f.eks. DNB, Nordea"
                          value={form.bankName}
                          onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end">
                      <Button type="submit" loading={submitting} loadingText="Oppretter">
                        Fortsett til Dintero
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Approval in progress */}
          {hasApproval && !isConnected && (
            <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
              <div>
                <h2 className="text-base font-semibold text-foreground">Fullfør hos Dintero</h2>
                <p className="text-sm mt-1 text-muted-foreground">
                  Status: {onboardingStatus ? STATUS_LABEL[onboardingStatus] : 'Venter'}.
                </p>
              </div>
              <Card className="md:col-span-2">
                <CardContent>
                  {onboardingStatus === 'DECLINED' || onboardingStatus === 'TERMINATED' ? (
                    <Alert variant="error" size="sm">
                      <AlertCircle className="size-4" />
                      <AlertDescription>
                        {onboardingStatus === 'DECLINED'
                          ? 'Søknaden ble avslått. Kontakt oss for hjelp.'
                          : 'Avtalen er avsluttet. Kontakt oss for hjelp.'}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-foreground">
                        Sjekk e-posten fra Dintero og signer avtalen. Når det er godkjent aktiverer
                        vi utbetalinger automatisk.
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
                            <ExternalLink className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          )}

          {/* Active — settlements + transactions */}
          {isConnected && (
            <>
              {settlements?.notice && (
                <Alert variant="info" size="sm">
                  <AlertDescription>{settlements.notice}</AlertDescription>
                </Alert>
              )}

              <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Oversikt</h2>
                  <p className="text-sm mt-1 text-muted-foreground">Saldo og kommende utbetalinger.</p>
                </div>
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <BalanceCard
                    label="Tilgjengelig"
                    value={
                      settlements?.balance.available[0]
                        ? formatKroner(oreToKroner(settlements.balance.available[0].amount))
                        : undefined
                    }
                    loading={loading}
                  />
                  <BalanceCard
                    label="Til utbetaling"
                    value={
                      settlements?.balance.pending[0]
                        ? formatKroner(oreToKroner(settlements.balance.pending[0].amount))
                        : undefined
                    }
                    loading={loading}
                  />
                  <BalanceCard
                    label="Neste utbetaling"
                    value={
                      settlements?.transfers.find((t) => t.status === 'pending' || t.status === 'in_transit')
                        ? formatDate(
                            settlements.transfers.find(
                              (t) => t.status === 'pending' || t.status === 'in_transit',
                            )!.arrival_date,
                          )
                        : settlements
                          ? 'Ingen planlagt'
                          : undefined
                    }
                    loading={loading}
                  />
                </div>
              </section>

              <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Siste utbetalinger</h2>
                  <p className="text-sm mt-1 text-muted-foreground">Utbetalinger til bankkontoen din.</p>
                </div>
                <Card className="md:col-span-2 gap-0 divide-y divide-border py-0">
                  {loading ? (
                    <SkeletonRows count={3} />
                  ) : error ? (
                    <ErrorState
                      variant="inline"
                      message={error}
                      onRetry={fetchData}
                      retryLabel="Prøv igjen"
                    />
                  ) : !settlements?.transfers.length ? (
                    <div className="flex flex-col items-center gap-1 py-8 text-center">
                      <p className="text-sm font-medium text-foreground">Ingen utbetalinger ennå</p>
                      <p className="text-xs text-muted-foreground">Utbetalinger vises her når de er klare.</p>
                    </div>
                  ) : (
                    settlements.transfers.map((t) => (
                      <TransferRow key={t.id} transfer={t} formatDate={formatDate} oreToKroner={oreToKroner} />
                    ))
                  )}
                </Card>
              </section>

              <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Siste transaksjoner</h2>
                  <p className="text-sm mt-1 text-muted-foreground">Betalinger fra deltakere.</p>
                </div>
                <Card className="md:col-span-2 gap-0 divide-y divide-border py-0">
                  {loading ? (
                    <SkeletonRows count={4} />
                  ) : !transactions.length ? (
                    <div className="flex flex-col items-center gap-1 py-8 text-center">
                      <p className="text-sm font-medium text-foreground">Ingen transaksjoner ennå</p>
                      <p className="text-xs text-muted-foreground">Påmeldinger fra deltakere vises her.</p>
                    </div>
                  ) : (
                    transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between px-6 py-4">
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium block text-foreground truncate">
                            {tx.participant_name}
                          </span>
                          <span className="text-xs block text-muted-foreground truncate">
                            {tx.course?.title || '—'}
                          </span>
                        </div>
                        <div className="text-right ml-4 shrink-0">
                          <span className="text-sm font-medium font-mono tabular-nums text-foreground">
                            {formatKroner(tx.amount_paid)}
                          </span>
                          <span className="text-xs tabular-nums block text-muted-foreground">
                            {formatDate(tx.created_at)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </Card>
              </section>

              <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Kontostatus</h2>
                  <p className="text-sm mt-1 text-muted-foreground">Dintero-konto og innstillinger.</p>
                </div>
                <Card className="md:col-span-2 gap-0 divide-y divide-border py-0">
                  <div className="flex items-center justify-between px-6 py-4">
                    <div>
                      <span className="text-sm font-medium block text-foreground">Status</span>
                      <span className="text-xs block text-muted-foreground">
                        {onboardingStatus ? STATUS_LABEL[onboardingStatus] : 'Aktiv'}
                        {settlements?.sandbox ? ' · Testmiljø' : ''}
                      </span>
                    </div>
                    <div className="size-2 rounded-full bg-success" />
                  </div>
                </Card>
              </section>
            </>
          )}
        </div>
      </motion.div>
    </main>
  );
};

function BalanceCard({ label, value, loading }: { label: string; value?: string; loading: boolean }) {
  return (
    <Card>
      <CardContent className="py-4 px-5">
        <span className="text-xs font-medium tracking-wide text-muted-foreground">{label}</span>
        {loading ? (
          <div className="mt-1 h-7 w-24 animate-pulse rounded bg-muted" />
        ) : (
          <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-foreground">
            {value || '—'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function TransferRow({
  transfer,
  formatDate,
  oreToKroner,
}: {
  transfer: DinteroSettlementTransfer;
  formatDate: (d: string | number | null) => string;
  oreToKroner: (a: number) => number;
}) {
  const statusColor: Record<string, string> = {
    paid: 'text-success',
    pending: 'text-muted-foreground',
    in_transit: 'text-muted-foreground',
    failed: 'text-destructive',
    canceled: 'text-destructive',
  };

  const statusLabel: Record<string, string> = {
    paid: 'Utbetalt',
    pending: 'Venter',
    in_transit: 'Underveis',
    failed: 'Feilet',
    canceled: 'Kansellert',
  };

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium font-mono tabular-nums block text-foreground">
          {formatKroner(oreToKroner(transfer.amount))}
        </span>
        <span className="text-xs tabular-nums block text-muted-foreground">
          {formatDate(transfer.arrival_date)}
        </span>
      </div>
      <span className={`text-xs font-medium ${statusColor[transfer.status] || 'text-muted-foreground'}`}>
        {statusLabel[transfer.status] || transfer.status}
      </span>
    </div>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-6 py-4">
          <div className="space-y-1.5">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </>
  );
}

export default PaymentsPage;
