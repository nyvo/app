import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from '@/lib/icons';
import { pageVariants, pageTransition } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { useAuth } from '@/contexts/AuthContext';
import {
  getStripeBalance,
  createStripeConnectLink,
  createStripeDashboardLink,
  checkStripeStatus,
} from '@/services/stripe-connect';
import type { StripeBalanceResult, StripePayout } from '@/services/stripe-connect';
import { typedFrom } from '@/lib/supabase';
import { formatKroner } from '@/lib/utils';
import { toast } from 'sonner';

interface TransactionRow {
  id: string
  participant_name: string
  amount_paid: number | null
  created_at: string
  course: { id: string; title: string } | null
}

const PaymentsPage = () => {
  const { currentOrganization, refreshOrganizations } = useAuth();

  const isStripeConnected = !!currentOrganization?.stripe_onboarding_complete;
  const hasStripeAccount = !!currentOrganization?.stripe_account_id;

  const [balanceData, setBalanceData] = useState<StripeBalanceResult | null>(null);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stripeLoading, setStripeLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentOrganization?.id || !isStripeConnected) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Fetch Stripe data and transactions in parallel
    const [balanceResult, txResult] = await Promise.all([
      getStripeBalance(currentOrganization.id),
      typedFrom('signups')
        .select('id, participant_name, amount_paid, created_at, course:courses(id, title)')
        .eq('organization_id', currentOrganization.id)
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (balanceResult.error) {
      setError(balanceResult.error.message);
    } else {
      setBalanceData(balanceResult.data);
    }

    if (!txResult.error && txResult.data) {
      setTransactions(txResult.data as unknown as TransactionRow[]);
    }

    setLoading(false);
  }, [currentOrganization?.id, isStripeConnected]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSetupStripe = useCallback(async () => {
    if (!currentOrganization?.id) return;
    setStripeLoading(true);
    const { data, error } = await createStripeConnectLink(currentOrganization.id);
    if (error || !data?.url) {
      toast.error(error?.message || 'Kunne ikke opprette Stripe-tilkobling');
      setStripeLoading(false);
      return;
    }
    window.location.href = data.url;
  }, [currentOrganization?.id]);

  const handleCheckStatus = useCallback(async () => {
    if (!currentOrganization?.id) return;
    setCheckingStatus(true);
    const { data, error } = await checkStripeStatus(currentOrganization.id);
    if (error) {
      toast.error('Kunne ikke sjekke status. Prøv igjen.');
    } else if (data?.onboardingComplete) {
      await refreshOrganizations();
      toast.success('Betalinger er satt opp');
    } else {
      toast('Oppsettet er ikke fullført ennå. Gå til Stripe for å fullføre.');
    }
    setCheckingStatus(false);
  }, [currentOrganization?.id, refreshOrganizations]);

  const handleOpenDashboard = useCallback(async () => {
    if (!currentOrganization?.id) return;
    setStripeLoading(true);
    const { data, error } = await createStripeDashboardLink(currentOrganization.id);
    if (error || !data?.url) {
      toast.error(error?.message || 'Kunne ikke åpne Stripe-oversikten');
      setStripeLoading(false);
      return;
    }
    window.location.href = data.url;
  }, [currentOrganization?.id]);

  const formatDate = (dateStr: string | number): string => {
    const date = typeof dateStr === 'number' ? new Date(dateStr * 1000) : new Date(dateStr);
    return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Stripe amounts are in øre (cents) — divide by 100 for kroner
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
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Betalinger
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Oversikt over utbetalinger og transaksjoner.</p>
        </div>

        <div className="mx-auto max-w-5xl space-y-8">
          {/* Not onboarded — show setup CTA */}
          {!isStripeConnected && (
            <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
              <div>
                <h2 className="text-base font-medium text-foreground">Sett opp betalinger</h2>
                <p className="text-sm mt-1 text-muted-foreground">Knytt kontoen din til Stripe for å motta betaling fra deltakere.</p>
              </div>
              <Card className="md:col-span-2">
                <CardContent className="md:px-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-foreground">
                        {hasStripeAccount
                          ? 'Oppsettet er ikke fullført. Gå til Stripe for å fullføre.'
                          : 'Du må koble til Stripe før du kan publisere kurs og motta betaling.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {hasStripeAccount && (
                        <Button
                          variant="ghost"
                          size="compact"
                          onClick={handleCheckStatus}
                          loading={checkingStatus}
                          loadingText="Sjekker"
                        >
                          Sjekk status
                        </Button>
                      )}
                      <Button
                        onClick={handleSetupStripe}
                        loading={stripeLoading}
                        loadingText="Sender deg til Stripe …"
                      >
                        Sett opp
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Onboarded — show dashboard data */}
          {isStripeConnected && (
            <>
              {/* Oversikt — balance cards */}
              <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                <div>
                  <h2 className="text-base font-medium text-foreground">Oversikt</h2>
                  <p className="text-sm mt-1 text-muted-foreground">Saldo og kommende utbetalinger.</p>
                </div>
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <BalanceCard
                    label="Tilgjengelig"
                    value={balanceData ? formatKroner(oreToKroner(balanceData.balance.available[0]?.amount ?? 0)) : undefined}
                    loading={loading}
                  />
                  <BalanceCard
                    label="Til utbetaling"
                    value={balanceData ? formatKroner(oreToKroner(balanceData.balance.pending[0]?.amount ?? 0)) : undefined}
                    loading={loading}
                  />
                  <BalanceCard
                    label="Neste utbetaling"
                    value={
                      balanceData
                        ? balanceData.payouts.find(p => p.status === 'pending' || p.status === 'in_transit')
                          ? formatDate(balanceData.payouts.find(p => p.status === 'pending' || p.status === 'in_transit')!.arrival_date)
                          : 'Ingen planlagt'
                        : undefined
                    }
                    loading={loading}
                  />
                </div>
              </section>

              {/* Siste utbetalinger */}
              <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                <div>
                  <h2 className="text-base font-medium text-foreground">Siste utbetalinger</h2>
                  <p className="text-sm mt-1 text-muted-foreground">Utbetalinger til bankkontoen din.</p>
                </div>
                <Card className="md:col-span-2 gap-0 divide-y divide-border py-0">
                  {loading ? (
                    <SkeletonRows count={3} />
                  ) : error ? (
                    <div className="px-6 py-8 text-center">
                      <p className="text-sm text-muted-foreground">{error}</p>
                      <Button variant="ghost" size="compact" onClick={fetchData} className="mt-2">
                        Prøv igjen
                      </Button>
                    </div>
                  ) : !balanceData?.payouts.length ? (
                    <div className="px-6 py-8 text-center">
                      <p className="text-sm text-muted-foreground">Ingen utbetalinger ennå</p>
                    </div>
                  ) : (
                    balanceData.payouts.map((payout) => (
                      <PayoutRow key={payout.id} payout={payout} formatDate={formatDate} oreToKroner={oreToKroner} />
                    ))
                  )}
                </Card>
              </section>

              {/* Siste transaksjoner */}
              <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                <div>
                  <h2 className="text-base font-medium text-foreground">Siste transaksjoner</h2>
                  <p className="text-sm mt-1 text-muted-foreground">Betalinger fra deltakere.</p>
                </div>
                <Card className="md:col-span-2 gap-0 divide-y divide-border py-0">
                  {loading ? (
                    <SkeletonRows count={4} />
                  ) : !transactions.length ? (
                    <div className="px-6 py-8 text-center">
                      <p className="text-sm text-muted-foreground">Ingen transaksjoner ennå</p>
                    </div>
                  ) : (
                    transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between px-6 py-3.5">
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium block text-foreground truncate">{tx.participant_name}</span>
                          <span className="text-xs font-medium tracking-wide block text-muted-foreground truncate">
                            {tx.course?.title || '—'}
                          </span>
                        </div>
                        <div className="text-right ml-4 shrink-0">
                          <span className="text-sm font-medium tabular-nums text-foreground">
                            {formatKroner(tx.amount_paid)}
                          </span>
                          <span className="text-xs font-medium tracking-wide block text-muted-foreground">
                            {formatDate(tx.created_at)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </Card>
              </section>

              {/* Kontostatus */}
              <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                <div>
                  <h2 className="text-base font-medium text-foreground">Kontostatus</h2>
                  <p className="text-sm mt-1 text-muted-foreground">Stripe-konto og innstillinger.</p>
                </div>
                <Card className="md:col-span-2 gap-0 divide-y divide-border py-0">
                  {/* Status */}
                  <div className="flex items-center justify-between px-6 py-4">
                    <div>
                      <span className="text-sm font-medium block text-foreground">Status</span>
                      <span className="text-xs font-medium tracking-wide block text-muted-foreground">
                        {balanceData?.account.charges_enabled && balanceData?.account.payouts_enabled
                          ? 'Aktiv'
                          : 'Under behandling'}
                      </span>
                    </div>
                    <div className={`h-2 w-2 rounded-full ${
                      balanceData?.account.charges_enabled && balanceData?.account.payouts_enabled
                        ? 'bg-success'
                        : 'bg-amber-500'
                    }`} />
                  </div>

                  {/* Stripe Dashboard */}
                  <div className="flex items-center justify-between px-6 py-4">
                    <div>
                      <span className="text-sm font-medium block text-foreground">Stripe-oversikt</span>
                      <span className="text-xs font-medium tracking-wide block text-muted-foreground">
                        Se detaljer, endre bankkonto og utbetalingsinnstillinger.
                      </span>
                    </div>
                    <Button
                      variant="outline-soft"
                      size="compact"
                      onClick={handleOpenDashboard}
                      loading={stripeLoading}
                      loadingText="Åpner"
                    >
                      Åpne
                      <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Pending requirements */}
                  {balanceData?.account.requirements_due && balanceData.account.requirements_due.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-4">
                      <div>
                        <span className="text-sm font-medium block text-foreground">Stripe trenger mer informasjon</span>
                        <span className="text-xs font-medium tracking-wide block text-muted-foreground">
                          Fullfør oppsettet for å unngå avbrudd i utbetalingene.
                        </span>
                      </div>
                      <Button
                        variant="outline-soft"
                        size="compact"
                        onClick={handleSetupStripe}
                        loading={stripeLoading}
                        loadingText="Åpner"
                      >
                        Fullfør
                      </Button>
                    </div>
                  )}
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
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {loading ? (
          <div className="mt-1 h-7 w-24 animate-pulse rounded bg-muted" />
        ) : (
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

function PayoutRow({
  payout,
  formatDate,
  oreToKroner,
}: {
  payout: StripePayout;
  formatDate: (d: string | number) => string;
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
    <div className="flex items-center justify-between px-6 py-3.5">
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium block text-foreground">
          {formatKroner(oreToKroner(payout.amount))}
        </span>
        <span className="text-xs font-medium tracking-wide block text-muted-foreground">
          {formatDate(payout.arrival_date)}
          {payout.destination_last4 && ` · •••• ${payout.destination_last4}`}
        </span>
      </div>
      <span className={`text-xs font-medium ${statusColor[payout.status] || 'text-muted-foreground'}`}>
        {statusLabel[payout.status] || payout.status}
      </span>
    </div>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-6 py-3.5">
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
