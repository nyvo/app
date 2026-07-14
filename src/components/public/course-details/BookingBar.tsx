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
  /**
   * Signed-in buyer already holds a confirmed signup on this course — the bar
   * swaps price + CTA for a confirmation state (Luma/Nike "You're in"
   * pattern; plain text, no status dot per the approved 2026-07-14 design).
   * Wins over every other state: an enrolled buyer's seat is secured, so
   * sold-out/closed messaging is noise for them.
   */
  enrolled?: { email: string } | null;
}

/**
 * Persistent bottom booking bar — the page's one booking surface, pinned at
 * ALL viewports (previously an elevated inline card on desktop and a
 * separate <768px bar). A long course-detail page otherwise pushes price +
 * CTA below the fold; pinning removes that regardless of scroll position.
 *
 * Rendered as a floating capsule detached from the viewport edges (Airbnb's
 * current app footer treatment; the two-zone structure — price + qualifier
 * left, single pill CTA right — mirrors Airbnb/Viator listing-detail bars on
 * Mobbin). Fully rounded, hairline border + `shadow-soft` (the allowlisted
 * focal-floating-surface pair), CTA nested concentrically with a tight
 * right inset.
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
  enrolled = null,
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

  // Enrolled state keeps the bar's exact two-zone geometry: the two-line
  // text block takes the price stack's place, the CTA slot holds a secondary
  // pill to Min side (self-cancel is deliberately not offered — buyers reach
  // the seller via the booking, see BuyerDashboard).
  if (enrolled) {
    return (
      <div className="pointer-events-none fixed bottom-0 inset-x-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
        <div className="pointer-events-auto mx-auto flex w-full max-w-[640px] items-center justify-between gap-4 rounded-full border border-border-subtle bg-background py-2 pl-6 pr-2 shadow-soft animate-in slide-in-from-bottom-4 fade-in-0 duration-[250ms] ease-out">
          <div className="min-w-0">
            <p className="text-base font-medium text-foreground truncate">Du er påmeldt</p>
            <p className="truncate text-sm text-foreground-muted">
              Bekreftelse er sendt til {enrolled.email}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Button asChild size="cta" variant="outline">
              <Link to="/overview">Se påmelding</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed bottom-0 inset-x-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
      <div className="pointer-events-auto mx-auto flex w-full max-w-[640px] items-center justify-between gap-4 rounded-full border border-border-subtle bg-background py-2 pl-6 pr-2 shadow-soft animate-in slide-in-from-bottom-4 fade-in-0 duration-[250ms] ease-out">
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
            // Two lines: both at text-sm with a muted label / medium price
            // split — a compact uniform block that doesn't crowd the bar.
            // A single ticket drops the tier label (it adds nothing next to
            // the CTA) and instead stacks price over a muted qualifier —
            // the tile's sublabel ("8 uker", "6 uker igjen") or "Per person"
            // — the Airbnb/Viator bar shape: prominent price, context line
            // below. Keeps the bar's two-line mass in every state.
            return (
              <>
                {courseFull && !soldOut ? (
                  <p className="text-sm text-foreground-muted truncate">Kurspakken er full</p>
                ) : mainTile ? (
                  hasDropInLine ? (
                    <p className="text-sm truncate tabular-nums">
                      <span className="text-foreground-muted">{mainTile.label} </span>
                      {mainTile.prorated && (
                        <s className="mr-1 text-foreground-disabled">{formatKroner(coursePrice)}</s>
                      )}
                      <span className="font-medium text-foreground">{formatKroner(mainTile.amount)}</span>
                    </p>
                  ) : (
                    <>
                      <p className="text-base font-medium text-foreground truncate tabular-nums">
                        {mainTile.prorated && (
                          <s className="mr-1 font-normal text-foreground-disabled">
                            {formatKroner(coursePrice)}
                          </s>
                        )}
                        {mainTile.amount === 0 ? 'Gratis' : formatKroner(mainTile.amount)}
                      </p>
                      <p className="truncate text-sm text-foreground-muted">
                        {mainTile.sublabel ?? 'Per person'}
                      </p>
                    </>
                  )
                ) : coursePrice != null ? (
                  hasDropInLine ? (
                    <p className="text-sm truncate tabular-nums">
                      <span className="text-foreground-muted">Hele kurset </span>
                      <span className="font-medium text-foreground">{formatKroner(coursePrice)}</span>
                    </p>
                  ) : (
                    <>
                      <p className="text-base font-medium text-foreground truncate tabular-nums">
                        {coursePrice === 0 ? 'Gratis' : formatKroner(coursePrice)}
                      </p>
                      <p className="truncate text-sm text-foreground-muted">Per person</p>
                    </>
                  )
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
            <Button size="cta" disabled className="min-w-0 max-sm:max-w-[60%]">
              <span className="truncate">{stateLabel}</span>
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
