import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { formatCoursePrice, formatKroner } from '@/lib/utils';
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
  spotsLeft: number;
  lowStock: boolean;
  /** Seller can't take payment yet (Stripe onboarding incomplete) — same gate
   * that hides the rail's CTA, so the bar never offers a dead checkout. */
  paymentNotReady: boolean;
  /** /:slug/:courseSlug/pamelding — no `?billett=`, tier choice lives on checkout. */
  checkoutHref: string;
  sellerName: string | null;
  sellerSlug: string | null;
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
  spotsLeft,
  lowStock,
  paymentNotReady,
  checkoutHref,
  sellerName,
  sellerSlug,
  ctaLabel = 'Meld deg på',
}: BookingBarProps) {
  const mainTile = tiles.find((t) => t.id === 'main') ?? null;
  const dropInTile = tiles.find((t) => t.id === 'drop-in') ?? null;
  const showControls = !soldOut && !closed;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border-subtle bg-background/90 backdrop-blur-sm safe-area-bottom animate-in slide-in-from-bottom-[100%] fade-in-0 duration-[250ms] ease-out">
      <div className="mx-auto flex w-full max-w-[640px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {soldOut ? (
          <div className="min-w-0">
            <p className="text-base font-medium text-foreground-muted">Kurset er fullt</p>
            {sellerName && sellerSlug && (
              <Link
                to={`/${sellerSlug}`}
                className="text-sm text-foreground-muted underline decoration-foreground-disabled underline-offset-2 hover:text-foreground hover:decoration-foreground transition-colors"
              >
                Se andre kurs fra {sellerName}
              </Link>
            )}
          </div>
        ) : closed ? (
          <div className="min-w-0">
            <p className="text-base font-medium text-foreground">Påmelding stengt</p>
            <p className="text-sm text-foreground-muted">Kurset har startet.</p>
          </div>
        ) : (
          <div className="min-w-0">
            {/* The package tile was withheld because the course is full, but
                drop-in is still open — say why the package is missing
                (steady state of a running drop-in series). */}
            {courseFull ? (
              <p className="text-sm text-foreground-muted truncate">Kurspakken er full.</p>
            ) : (
              mainTile && (
                <p className="truncate">
                  <span className="text-sm text-foreground-muted">{mainTile.label} </span>
                  <span className="text-[15px] font-medium tabular-nums text-foreground">
                    {mainTile.prorated && (
                      <s className="mr-1.5 text-[13.5px] font-normal text-foreground/40">
                        {formatKroner(coursePrice)}
                      </s>
                    )}
                    {formatCoursePrice(mainTile.amount)}
                  </span>
                </p>
              )
            )}
            {dropInTile && (
              <p className="truncate text-[13px] text-foreground-muted tabular-nums">
                {dropInTile.label} {formatCoursePrice(dropInTile.amount)}
              </p>
            )}
          </div>
        )}

        {showControls && (
          <div className="flex shrink-0 items-center gap-3">
            {lowStock && (
              <span className="text-[13px] text-warning whitespace-nowrap">
                {spotsLeft} {spotsLeft === 1 ? 'plass' : 'plasser'} igjen
              </span>
            )}
            {paymentNotReady ? (
              <span className="text-sm text-foreground-muted whitespace-nowrap">Påmelding åpner snart.</span>
            ) : (
              <Button asChild size="cta">
                <Link to={checkoutHref}>{ctaLabel}</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
