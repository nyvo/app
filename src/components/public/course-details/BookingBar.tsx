import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { formatKroner } from '@/lib/utils';
import type { TicketTile } from './BookingRailLite';

interface BookingBarProps {
  /** Sellable tiles from `getBookingTiles` — main first, then drop-in. */
  tiles: TicketTile[];
  /** Full (non-prorated) course price — struck through above a prorated
   * main tile's reduced price. */
  coursePrice: number | null;
  courseFull: boolean;
  soldOut: boolean;
  closed: boolean;
  /** Seller can't take payment yet (Stripe onboarding incomplete) — same gate
   * that hides the rail's CTA, so the bar never offers a dead checkout. */
  paymentNotReady: boolean;
  /** Drop-in price straight from the course row — shown in the sold-out /
   * closed states where the RPC returns no tiles but prices stay useful. */
  dropInPrice: number | null;
  /** /:slug/:courseSlug/pamelding — no `?billett=`, tier choice lives on checkout. */
  checkoutHref: string;
  /** CTA label. Defaults to "Meld deg på". */
  ctaLabel?: string;
}

/**
 * Persistent bottom booking bar — the page's one booking surface, pinned at
 * ALL viewports (previously an elevated inline card on desktop and a
 * separate <768px bar). A long course-detail page otherwise pushes price +
 * CTA below the fold; pinning removes that regardless of scroll position.
 * Mirrors Airbnb's mobile booking bar: price + qualifier left, single CTA
 * right, hairline top border, fixed bottom — now the only pattern, not a
 * mobile-only fallback.
 *
 * Deliberately stateless — every value here (`tiles`, `courseFull`,
 * `soldOut`, `closed`, …) is derived by the course-detail page from the same
 * `getBookingTiles` helper `BookingRailLite` uses. This bar never re-derives
 * tier/price/state logic, so it can't drift from the rail.
 */
export function BookingBar({
  tiles,
  coursePrice,
  courseFull,
  soldOut,
  closed,
  paymentNotReady,
  dropInPrice,
  checkoutHref,
  ctaLabel = 'Meld deg på',
}: BookingBarProps) {
  const mainTile = tiles.find((t) => t.id === 'main') ?? null;
  const dropInTile = tiles.find((t) => t.id === 'drop-in') ?? null;
  // The bar keeps full geometry in every state — prices stay put and the CTA
  // becomes the message on a disabled button (the structure doc's edge-state
  // rule: no dead bar, no hidden action).
  const stateLabel = soldOut
    ? 'Kurset er fullt'
    : closed
      ? 'Påmelding stengt'
      : paymentNotReady
        ? 'Påmelding åpner snart'
        : null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border-subtle bg-background/90 backdrop-blur-sm safe-area-bottom animate-in slide-in-from-bottom-[100%] fade-in-0 duration-[250ms] ease-out">
      <div className="mx-auto flex w-full max-w-[640px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          {/* Second line: the drop-in price (live tile, or the course-row
              fallback in sold-out/closed states where the RPC returns no
              tiles). Resolved first because the PRICE size depends on it:
              a lone price line scales up to text-lg so it holds its own
              against the CTA; in the two-line stack text-base + the text-sm
              secondary already carry enough mass. Type sizes are tokens only.

              The package tile was withheld because the course is full, but
              drop-in is still open — say why the package is missing
              (steady state of a running drop-in series). */}
          {(() => {
            const hasDropInLine = dropInTile != null || (stateLabel !== null && dropInPrice != null);
            // Two lines: both at text-sm — a compact uniform block that
            // doesn't crowd the bar. A lone line steps up to text-lg to hold
            // its own against the CTA.
            const priceSize = hasDropInLine ? 'text-sm' : 'text-lg';
            return (
              <>
                {courseFull && !soldOut ? (
                  <p className="text-sm text-foreground-muted truncate">Kurspakken er full</p>
                ) : mainTile ? (
                  <p className={`${priceSize} truncate tabular-nums`}>
                    <span className="text-foreground-muted">{mainTile.label} </span>
                    {mainTile.prorated && (
                      <s className="mr-1 text-foreground-disabled">{formatKroner(coursePrice)}</s>
                    )}
                    <span className="font-medium text-foreground">{formatKroner(mainTile.amount)}</span>
                  </p>
                ) : coursePrice != null ? (
                  <p className={`${priceSize} truncate tabular-nums`}>
                    <span className="text-foreground-muted">Hele kurset </span>
                    <span className="font-medium text-foreground">{formatKroner(coursePrice)}</span>
                  </p>
                ) : null}
                {dropInTile ? (
                  <p className="truncate text-sm tabular-nums">
                    <span className="text-foreground-muted">{dropInTile.label} </span>
                    <span className="font-medium text-foreground">{formatKroner(dropInTile.amount)}</span>
                  </p>
                ) : stateLabel && dropInPrice != null ? (
                  <p className="truncate text-sm tabular-nums">
                    <span className="text-foreground-muted">Drop-in </span>
                    <span className="font-medium text-foreground">{formatKroner(dropInPrice)}</span>
                  </p>
                ) : null}
              </>
            );
          })()}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {stateLabel ? (
            <Button size="cta" disabled>
              {stateLabel}
            </Button>
          ) : (
            <Button asChild size="cta">
              <Link to={checkoutHref}>{ctaLabel}</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
