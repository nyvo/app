import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { calculateServiceFee, calculateTotalPrice } from '@/lib/pricing';
import { formatKroner, formatCoursePrice, cn } from '@/lib/utils';
import { singleDayCount, type PublicCourseWithDetails } from '@/services/publicCourses';
import type { AvailableTicketType } from '@/types/database';

interface BookingRailLiteProps {
  course: PublicCourseWithDetails;
  /** Sellable tiers from the `available_ticket_types` RPC — the same rows
   * checkout and the Stripe session resolve against, so the price shown here
   * is definitionally the price charged (incl. the prorated package price
   * once a series has started). */
  tiers: AvailableTicketType[];
  studioSlug: string;
  /** Optional override for the CTA target. Defaults to /:slug/:courseSlug/pamelding. */
  checkoutHref?: string;
  /** Sublabel for the drop-in tile — typically the next available session date. */
  dropInSublabel?: string | null;
  /** Compact meta line shown under the course title (e.g. "13. april · 06:45–07:30"). */
  metaLabel?: string | null;
  /** Controlled tier selection — pass together with `onSelectedIdChange` so a
   * sibling (e.g. `MobilePriceBar`) can mirror the rail's selection from the
   * same state instead of forking the tier/price/CTA logic. Uncontrolled
   * (internal state) when omitted. */
  selectedId?: TicketId;
  onSelectedIdChange?: (id: TicketId) => void;
}

export type TicketId = 'main' | 'drop-in';

export interface TicketTile {
  id: TicketId;
  label: string;
  sublabel: string | null;
  amount: number;
  /** True when the amount is the RPC's prorated package price (series
   * started, fewer weeks left than total). */
  prorated?: boolean;
}

/**
 * Booking rail for the course detail page. Holds ticket selection and
 * routes to the checkout page with the chosen ticket as a query param.
 * Per the modern conversion-optimized pattern: decide here, identify +
 * pay on /pamelding.
 *
 * Visual model (premium, per Navan/Airbnb/Zapier references):
 *  - The page hero owns the title, so the card leads with context + choice,
 *    not a duplicated title or price.
 *  - A single big "Totalt" near the CTA is the price focal point — the price
 *    is never repeated as a standalone hero.
 *  - Ticket choice uses brand-tinted selectable rows (not a heavy ring).
 *  - Soft elevation (`shadow-soft`) lifts the card off the flat white page.
 */
export function BookingRailLite({
  course,
  tiers,
  studioSlug,
  checkoutHref,
  dropInSublabel,
  metaLabel,
  selectedId: controlledSelectedId,
  onSelectedIdChange,
}: BookingRailLiteProps) {
  const { tiles, courseFull, soldOut, closed, spotsLeft, lowStock } = getBookingTiles(
    course,
    tiers,
    dropInSublabel ?? null,
  );

  const [uncontrolledId, setUncontrolledId] = useState<TicketId>(tiles[0]?.id ?? 'main');
  const selectedId = controlledSelectedId ?? uncontrolledId;
  const setSelectedId = onSelectedIdChange ?? setUncontrolledId;

  const baseHref = checkoutHref ?? `/${studioSlug}/${course.slug}/pamelding`;
  const { selectedTile, ticketPrice, serviceFee, total, href, paymentNotReady } = computeSelection(
    tiles,
    selectedId,
    baseHref,
    course,
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-card bg-surface shadow-soft">
      <div className="p-6 space-y-5">
        {/* Context — the "when" as a labeled booking-summary field (the
            Navan/Airbnb idiom), not a verbatim echo of the hero meta. The card
            is sticky, so this stays visible after the hero scrolls away. */}
        {(metaLabel || lowStock) && (
          <div className="flex items-start justify-between gap-3">
            {metaLabel ? (
              <div className="min-w-0">
                <p className="text-xs text-foreground-muted">Når</p>
                <p className="mt-0.5 text-base font-medium text-foreground tabular-nums truncate">
                  {metaLabel}
                </p>
              </div>
            ) : (
              <span aria-hidden />
            )}
            {lowStock && (
              <Badge variant="warning" shape="pill" size="sm">
                {spotsLeft} {spotsLeft === 1 ? 'plass' : 'plasser'} igjen
              </Badge>
            )}
          </div>
        )}

        {soldOut ? (
          <div className="rounded-xl bg-muted px-4 py-6 text-center space-y-1">
            <p className="text-base font-medium text-foreground">Kurset er fullt</p>
            {course.seller?.name && (
              <Link
                to={`/${studioSlug}`}
                className="text-sm text-foreground-muted underline decoration-foreground-disabled underline-offset-2 hover:text-foreground hover:decoration-foreground transition-colors"
              >
                Se andre kurs fra {course.seller.name}
              </Link>
            )}
          </div>
        ) : closed ? (
          <div className="rounded-xl bg-muted px-4 py-6 text-center space-y-1">
            <p className="text-base font-medium text-foreground">Påmelding stengt</p>
            <p className="text-sm text-foreground-muted">Kurset har startet.</p>
          </div>
        ) : (
          <>
            {/* The package tile was withheld because the course is full, but
                drop-in is still open — say why the package is missing. This is
                the steady state of a running drop-in series (past drop-ins
                accumulate in the course-wide count), not a rare edge. */}
            {courseFull && (
              <p className="text-sm text-foreground-muted">Kurspakken er full.</p>
            )}

            {/* Choice — only when there's a real one. A single ticket type is
                conveyed by the price breakdown below, no selector needed. */}
            {tiles.length > 1 && (
              <div
                className="space-y-2"
                role="radiogroup"
                aria-label="Velg billett"
                onKeyDown={handleTileKeyDown}
              >
                {tiles.map((tile) => (
                  <TicketTileButton
                    key={tile.id}
                    tile={tile}
                    selected={selectedId === tile.id}
                    onSelect={() => setSelectedId(tile.id)}
                  />
                ))}
              </div>
            )}

            {/* Price — line items + one prominent total (the focal price). */}
            {selectedTile && (
              <div key={selectedTile?.id ?? 'none'} className="animate-in fade-in-0 duration-150">
                {ticketPrice > 0 ? (
                  <div className="space-y-2">
                    <dl className="space-y-2.5">
                      <div className="flex items-baseline justify-between gap-3 text-base">
                        <dt className="text-foreground-muted">
                          {selectedTile.label}
                          {/* Prorated with no selector on screen: the weeks-left
                              cue is the only thing explaining the reduced price. */}
                          {tiles.length === 1 && selectedTile.prorated && selectedTile.sublabel && (
                            <span className="block text-sm">{selectedTile.sublabel}</span>
                          )}
                        </dt>
                        <dd className="tabular-nums text-foreground">{formatKroner(ticketPrice)}</dd>
                      </div>
                      {serviceFee > 0 && (
                        <div className="flex items-baseline justify-between gap-3 text-base">
                          <dt className="text-foreground-muted">Tjenestegebyr</dt>
                          <dd className="tabular-nums text-foreground-muted">{formatKroner(serviceFee)}</dd>
                        </div>
                      )}
                      <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
                        <dt className="text-base font-medium text-foreground">Totalt</dt>
                        <dd className="text-xl font-medium tabular-nums text-foreground">
                          {formatKroner(total)}
                        </dd>
                      </div>
                    </dl>
                    <p className="text-sm text-foreground-muted">Ingen mva. kommer i tillegg.</p>
                  </div>
                ) : (
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-base font-medium text-foreground">{selectedTile.label}</span>
                    <span className="text-xl font-medium text-foreground">Gratis</span>
                  </div>
                )}
              </div>
            )}

            {paymentNotReady ? (
              <div className="rounded-xl bg-muted px-4 py-6 text-center">
                <p className="text-base font-medium text-foreground">Påmelding åpner snart.</p>
              </div>
            ) : (
              <>
                <Button asChild size="cta" className="w-full">
                  <Link to={href}>Reserver</Link>
                </Button>

                {ticketPrice > 0 && (
                  <div className="border-t border-border pt-4">
                    <p className="text-center text-xs text-foreground-muted">Sikker betaling med Stripe</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Roving-tabindex arrow-key navigation for the tier radiogroup — mirrors
 * SegmentedTabs' radiogroup handler (Up/Down + Left/Right move focus AND
 * select; Home/End jump to the ends). One tab stop for the whole group.
 */
function handleTileKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
  const { key } = event;
  const isPrev = key === 'ArrowLeft' || key === 'ArrowUp';
  const isNext = key === 'ArrowRight' || key === 'ArrowDown';
  if (!isPrev && !isNext && key !== 'Home' && key !== 'End') return;

  const items = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)'),
  );
  if (items.length === 0) return;

  const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
  let nextIndex: number;
  if (key === 'Home') {
    nextIndex = 0;
  } else if (key === 'End') {
    nextIndex = items.length - 1;
  } else {
    const delta = isNext ? 1 : -1;
    nextIndex = ((currentIndex === -1 ? 0 : currentIndex) + delta + items.length) % items.length;
  }

  event.preventDefault();
  const next = items[nextIndex];
  next.focus();
  next.click();
}

function TicketTileButton({
  tile,
  selected,
  onSelect,
}: {
  tile: TicketTile;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      className={cn(
        'ios-ease w-full rounded-xl border px-4 py-3 text-left',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        selected
          ? 'border-primary bg-selection-light'
          : 'border-border hover:border-foreground-muted hover:bg-hover',
      )}
    >
      <div className="flex items-center gap-3">
        {/* Radio indicator — brand dot, not a black ring */}
        <span
          className={cn(
            'flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            selected ? 'border-primary' : 'border-border-strong',
          )}
          aria-hidden
        >
          <span
            className={cn(
              'size-2 rounded-full bg-primary transition-transform duration-150 ease-out',
              selected ? 'scale-100' : 'scale-0',
            )}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-medium text-foreground truncate">{tile.label}</p>
          {tile.sublabel && (
            <p className="text-sm text-foreground-muted truncate">{tile.sublabel}</p>
          )}
        </div>
        <span className="shrink-0 text-base font-medium text-foreground tabular-nums whitespace-nowrap">
          {formatCoursePrice(tile.amount)}
        </span>
      </div>
    </button>
  );
}

/**
 * Derive the rail's tiles + course-state booleans from the course/tiers RPC
 * data. Pure and side-effect-free so a sibling (e.g. `MobilePriceBar`, from
 * the course detail page) can compute the exact same sold-out/closed state
 * the rail shows, without forking the logic.
 */
export function getBookingTiles(
  course: PublicCourseWithDetails,
  tiers: AvailableTicketType[],
  dropInSublabel: string | null,
): {
  tiles: TicketTile[];
  courseFull: boolean;
  soldOut: boolean;
  closed: boolean;
  spotsLeft: number;
  lowStock: boolean;
} {
  const spotsLeft = course.spots_available;
  const lowStock = spotsLeft > 0 && spotsLeft <= 3;
  // No cap (max_participants null) means unlimited spots — upstream
  // spots_available bottoms out at 0 for uncapped courses, so guard on the
  // cap itself. Mirrors courseBookability in studioFacts.
  const courseFull = course.max_participants !== null && spotsLeft === 0;

  const tiles = buildTiles(course, tiers, dropInSublabel, courseFull);
  // Course-wide capacity only gates the package: a drop-in occupies a single
  // class, so the RPC keeps offering it while the NEXT session has room even
  // when the course-wide count is maxed (past drop-ins inflate that count).
  const soldOut = courseFull && tiles.length === 0;
  const closed = !courseFull && tiles.length === 0;

  return { tiles, courseFull, soldOut, closed, spotsLeft, lowStock };
}

/**
 * Resolve the selected tile + its price breakdown + the checkout href for a
 * given selection. Pure, so `BookingRailLite` and `MobilePriceBar` derive
 * identical values off the same `selectedId` state — one source of truth for
 * the CTA's label target and disabled/state text.
 */
export function computeSelection(
  tiles: TicketTile[],
  selectedId: TicketId,
  baseHref: string,
  course: PublicCourseWithDetails | null,
): {
  selectedTile: TicketTile | null;
  ticketPrice: number;
  serviceFee: number;
  total: number;
  href: string;
  paymentNotReady: boolean;
} {
  const selectedTile = tiles.find((t) => t.id === selectedId) ?? tiles[0] ?? null;
  const ticketPrice = selectedTile?.amount ?? 0;
  const serviceFee = calculateServiceFee(ticketPrice);
  const total = calculateTotalPrice(ticketPrice);
  // Always pass the ticket selection — when the series has started, the only
  // remaining tile may be drop-in, and the checkout page needs to know that
  // rather than defaulting to the (no-longer-offered) main tier.
  const href = selectedTile ? `${baseHref}?billett=${selectedTile.id}` : baseHref;
  // A paid course whose seller hasn't finished Stripe onboarding can't take
  // payment yet — don't route buyers into a checkout that can't complete.
  // Derived here so the rail and MobilePriceBar suppress the CTA in lockstep.
  const paymentNotReady =
    ticketPrice > 0 && course != null && !course.seller?.stripe_onboarding_complete;
  return { selectedTile, ticketPrice, serviceFee, total, href, paymentNotReady };
}

/**
 * Map RPC tier rows onto the rail's two tiles. The tier `label` comes from
 * the database ("Hele kurset" / "Enkelttime" / "Drop-in")
 * — the same string the checkout summary shows and the signup snapshots — so
 * no client-side re-derivation. The package tile is withheld when the course
 * is full; the drop-in tile appears whenever the RPC offered it (its
 * availability is per next class, gated server-side).
 */
function buildTiles(
  course: PublicCourseWithDetails,
  tiers: AvailableTicketType[],
  dropInSublabel: string | null,
  courseFull: boolean,
): TicketTile[] {
  const main =
    tiers.find((t) => t.is_default && t.ticket_kind !== 'drop_in')
    ?? tiers.find((t) => t.ticket_kind !== 'drop_in')
    ?? null;
  const dropIn = tiers.find((t) => t.ticket_kind === 'drop_in') ?? null;

  const tiles: TicketTile[] = [];
  if (main && !courseFull) {
    tiles.push({
      id: 'main',
      ...mainSublabel(course, main),
      label: main.label,
      amount: Number(main.price ?? 0),
    });
  }
  if (dropIn) {
    tiles.push({
      id: 'drop-in',
      label: dropIn.label,
      sublabel: dropInSublabel ?? 'Per gang',
      amount: Number(dropIn.price ?? 0),
    });
  }
  return tiles;
}

/** Sublabel under the package tile. Series show the week span — "N uker
 * igjen" once the RPC has prorated it down to the remaining weeks. A single
 * spanning consecutive days shows the day span; a one-day class needs none. */
function mainSublabel(
  course: PublicCourseWithDetails,
  tier: AvailableTicketType,
): { sublabel: string | null; prorated: boolean } {
  if (course.format === 'series') {
    const weeks = tier.weeks ?? course.total_weeks;
    if (!weeks) return { sublabel: null, prorated: false };
    const unit = weeks === 1 ? 'uke' : 'uker';
    const prorated = course.total_weeks != null && weeks < course.total_weeks;
    return prorated
      ? { sublabel: `${weeks} ${unit} igjen`, prorated: true }
      : { sublabel: `${weeks} ${unit}`, prorated: false };
  }
  const days = singleDayCount(course);
  return { sublabel: days > 1 ? `${days} dager` : null, prorated: false };
}
