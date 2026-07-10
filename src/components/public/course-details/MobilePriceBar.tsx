import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { formatCoursePrice } from '@/lib/utils';
import type { TicketTile } from './BookingRailLite';

interface MobilePriceBarProps {
  /** The rail's currently selected tile (or null when nothing is bookable). */
  selectedTile: TicketTile | null;
  /** Total incl. service fee for `selectedTile` — same figure the rail's
   * "Totalt" line shows. */
  total: number;
  /** Checkout target for the current selection, `?billett=` included — same
   * href the rail's "Reserver" button uses. */
  href: string;
  soldOut: boolean;
  closed: boolean;
  /** Seller can't take payment yet (Stripe onboarding incomplete) — same gate
   * that hides the rail's CTA, so the bar never offers a dead checkout. */
  paymentNotReady: boolean;
  /** CTA label. Defaults to "Reserver"; the T1 detail page passes "Meld deg
   * på" to match its own booking-card CTA. */
  ctaLabel?: string;
}

/**
 * Fixed bottom price bar for <768px viewports — on a long course-detail page
 * the price + "Reserver" CTA otherwise sit below the fold (the audit's
 * highest-leverage conversion fix). Mirrors Airbnb's mobile booking bar:
 * price + qualifier left, single CTA right, hairline top border, fixed
 * bottom.
 *
 * Deliberately stateless — every value here (`selectedTile`, `total`, `href`,
 * `soldOut`, `closed`) is derived by the course detail page from the same
 * `getBookingTiles`/`computeSelection` helpers `BookingRailLite` uses, off the
 * same `selectedId` state. This bar never re-derives tier/price/CTA logic, so
 * it can't drift from the rail.
 */
export function MobilePriceBar({
  selectedTile,
  total,
  href,
  soldOut,
  closed,
  paymentNotReady,
  ctaLabel = 'Reserver',
}: MobilePriceBarProps) {
  const stateText = soldOut
    ? 'Kurset er fullt'
    : closed
      ? 'Påmelding stengt'
      : paymentNotReady
        ? 'Påmelding åpner snart.'
        : null;

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-border-subtle safe-area-bottom px-4 py-3 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-[100%] fade-in-0 duration-[250ms] ease-out">
      {stateText ? (
        <p className="text-sm font-medium text-foreground">{stateText}</p>
      ) : (
        <div className="min-w-0">
          <p className="font-medium text-foreground tabular-nums truncate">
            {formatCoursePrice(total)}
          </p>
          {selectedTile && (
            <p className="text-sm text-foreground-muted truncate">{selectedTile.label}</p>
          )}
        </div>
      )}
      {!stateText && selectedTile && (
        <Button asChild size="cta" className="shrink-0">
          <Link to={href}>{ctaLabel}</Link>
        </Button>
      )}
    </div>
  );
}
