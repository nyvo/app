import { Fragment } from 'react';
import { ExternalLink } from '@/lib/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FramedCard, FramedCardPanel } from '@/components/teacher/FramedCard';
import { formatKroner } from '@/lib/utils';

/**
 * The onboarded Utbetalinger view — what replaces the "processing"-looking
 * final onboarding step once payouts are live. Presentational only: the real
 * page feeds it data from a Stripe edge function; /dev/payout-preview feeds it
 * mock data. Deliberately non-technical — plain kroner + "på vei"/"neste
 * utbetaling", with the raw settlement detail left to Stripe (the trailing
 * link), following the Fiverr/Buy Me a Coffee earnings layout.
 */

export interface PayoutRow {
  id: string;
  /** Pre-formatted display date, e.g. "11. juli 2026". */
  date: string;
  /** Amount in kroner. */
  amount: number;
  status: 'paid' | 'in_transit';
}

export interface PayoutStatsProps {
  /** Kroner currently on the way to the bank (Stripe in-transit balance). */
  inTransit: number;
  /** Kroner paid out so far this year. */
  paidYearToDate: number;
  /** Display date of the next automatic payout, or null if none is scheduled. */
  nextPayoutDate: string | null;
  payouts: PayoutRow[];
  onOpenStripe: () => void;
}

export function PayoutStats({
  inTransit,
  paidYearToDate,
  nextPayoutDate,
  payouts,
  onOpenStripe,
}: PayoutStatsProps) {
  // Same Nøkkeltall spine idiom as the course overview: label + one figure per
  // tile, short inset dividers between.
  const stats: [string, string][] = [
    ['På vei til deg', formatKroner(inTransit)],
    ['Utbetalt i år', formatKroner(paidYearToDate)],
    ['Neste utbetaling', nextPayoutDate ?? '–'],
  ];

  return (
    <div className="space-y-4">
      <FramedCard title="Nøkkeltall">
        <FramedCardPanel className="flex-row items-stretch">
          {stats.map(([label, value], i) => (
            <Fragment key={label}>
              {i > 0 && <div className="my-auto h-12 w-px shrink-0 bg-border-subtle" />}
              <div className="flex-1 px-5 py-5 text-center">
                <p className="text-sm text-foreground-muted">{label}</p>
                <p className="mt-1.5 text-2xl font-medium tabular-nums text-foreground">{value}</p>
              </div>
            </Fragment>
          ))}
        </FramedCardPanel>
      </FramedCard>

      <FramedCard title="Siste utbetalinger">
        {payouts.length === 0 ? (
          <FramedCardPanel className="items-center justify-center p-8">
            <EmptyState
              variant="compact"
              title="Ingen utbetalinger ennå"
              description="Den første utbetalingen vises her når et kurs er betalt."
            />
          </FramedCardPanel>
        ) : (
          <FramedCardPanel className="divide-y divide-border-subtle">
            {payouts.map((payout) => (
              <div
                key={payout.id}
                className="flex items-center justify-between gap-4 px-4 py-3.5"
              >
                <div className="min-w-0">
                  <p className="text-base font-medium tabular-nums text-foreground">
                    {formatKroner(payout.amount)}
                  </p>
                  <p className="mt-0.5 text-sm text-foreground-muted">{payout.date}</p>
                </div>
                {/* Only the in-transit row is flagged — a settled payout is the
                    default state and needs no badge (same idiom as the session
                    rows, where only the exceptional state carries a badge). */}
                {payout.status === 'in_transit' && (
                  <Badge variant="success" shape="pill" size="sm" className="shrink-0">
                    På vei til konto
                  </Badge>
                )}
              </div>
            ))}
          </FramedCardPanel>
        )}
      </FramedCard>

      <div className="px-1">
        <Button variant="link" onClick={onOpenStripe} className="px-0">
          Se kvitteringer og detaljer på Stripe
          <ExternalLink className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
