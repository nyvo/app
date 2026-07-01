import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { calculateServiceFee, calculateTotalPrice } from '@/lib/pricing';
import { formatKroner, cn } from '@/lib/utils';
import { singleDayCount, type PublicCourseWithDetails } from '@/services/publicCourses';

interface BookingRailLiteProps {
  course: PublicCourseWithDetails;
  studioSlug: string;
  /** Optional override for the CTA target. Defaults to /:slug/:courseSlug/pamelding. */
  checkoutHref?: string;
  /** Sublabel for the drop-in tile — typically the next available session date. */
  dropInSublabel?: string | null;
  /** Compact meta line shown under the course title (e.g. "13. april · 06:45–07:30"). */
  metaLabel?: string | null;
  /** True when the first session has already ended. The package tile stays
   * available but is prorated to the sessions that are still ahead. */
  seriesStarted?: boolean;
  /** Non-cancelled sessions whose end is still in the future. Used to prorate
   * the package price when `seriesStarted` is true. Mirrors the SQL in
   * migration 20260520160000 so display matches what the RPC will charge. */
  remainingSessions?: number;
}

export type TicketId = 'main' | 'drop-in' | 'free';

interface TicketTile {
  id: TicketId;
  label: string;
  sublabel: string | null;
  amount: number;
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
export function BookingRailLite({ course, studioSlug, checkoutHref, dropInSublabel, metaLabel, seriesStarted = false, remainingSessions = 0 }: BookingRailLiteProps) {
  const spotsLeft = course.spots_available;
  const lowStock = spotsLeft > 0 && spotsLeft <= 3;
  const soldOut = spotsLeft === 0;

  const tiles = buildTiles(course, dropInSublabel ?? null, seriesStarted, remainingSessions);
  const closed = !soldOut && tiles.length === 0 && seriesStarted;
  const [selectedId, setSelectedId] = useState<TicketId>(tiles[0]?.id ?? 'main');

  const selectedTile = tiles.find((t) => t.id === selectedId) ?? tiles[0] ?? null;
  const ticketPrice = selectedTile?.amount ?? 0;
  const serviceFee = calculateServiceFee(ticketPrice);
  const total = calculateTotalPrice(ticketPrice);

  const baseHref = checkoutHref ?? `/${studioSlug}/${course.slug}/pamelding`;
  // Always pass the ticket selection — when the series has started, the only
  // remaining tile may be drop-in, and the checkout page needs to know that
  // rather than defaulting to the (no-longer-offered) main tier.
  const href = selectedTile ? `${baseHref}?billett=${selectedTile.id}` : baseHref;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
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
            {/* Choice — only when there's a real one. A single ticket type is
                conveyed by the price breakdown below, no selector needed. */}
            {tiles.length > 1 && (
              <div className="space-y-2" role="radiogroup" aria-label="Velg billett">
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
              ticketPrice > 0 ? (
                <dl className="space-y-2.5">
                  <div className="flex items-baseline justify-between gap-3 text-base">
                    <dt className="text-foreground-muted">{selectedTile.label}</dt>
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
              ) : (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-base font-medium text-foreground">{selectedTile.label}</span>
                  <span className="text-xl font-medium text-foreground">Gratis</span>
                </div>
              )
            )}

            <Button asChild size="cta" className="w-full">
              <Link to={href}>Reserver</Link>
            </Button>

            {ticketPrice > 0 && (
              <div className="border-t border-border pt-4">
                <p className="text-center text-xs text-foreground-muted">Sikker betaling</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
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
      onClick={onSelect}
      className={cn(
        'ios-ease w-full rounded-xl border px-3.5 py-2.5 text-left',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        selected
          ? 'border-primary bg-selection-light'
          : 'border-border hover:border-foreground-muted hover:bg-muted/40',
      )}
    >
      <div className="flex items-center gap-3">
        {/* Radio indicator — brand dot, not a black ring */}
        <span
          className={cn(
            'flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            selected ? 'border-primary' : 'border-input',
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
          {formatKroner(tile.amount)}
        </span>
      </div>
    </button>
  );
}

/** Label + sublabel for the "whole course" ticket. A series buys every week
 * ("Hele kurspakken · N uker"); a single buys one class ("Enkelttime"), or —
 * when it spans consecutive days — the whole multi-day course
 * ("Hele kurset · N dager"). */
function wholeTicket(
  course: PublicCourseWithDetails,
  isSeries: boolean,
): { label: string; sublabel: string | null } {
  if (isSeries) {
    return {
      label: 'Hele kurspakken',
      sublabel: course.total_weeks ? `${course.total_weeks} uker` : null,
    };
  }
  const days = singleDayCount(course);
  return days > 1
    ? { label: 'Hele kurset', sublabel: `${days} dager` }
    : { label: 'Enkelttime', sublabel: null };
}

function buildTiles(
  course: PublicCourseWithDetails,
  dropInSublabel: string | null,
  seriesStarted: boolean,
  remainingSessions: number,
): TicketTile[] {
  const isFree = !course.price || course.price === 0;
  const isSeries = course.format === 'series';

  // Free courses still show a tile so the booking card has the same shape
  // as paid flows — single row, "0 kr" via formatKroner.
  if (isFree) {
    const { label, sublabel } = wholeTicket(course, isSeries);
    return [{ id: 'free', label, sublabel, amount: 0 }];
  }

  const tiles: TicketTile[] = [];

  // Series + started: prorate the package to the sessions that are still
  // ahead. The per-week package rate is price ÷ total_weeks, mirroring the
  // SQL in available_ticket_types. The package stays available down to the
  // very last session — drop-in shows alongside it when offered. Teachers
  // opt out entirely via course.accepts_late_signups.
  if (isSeries && seriesStarted) {
    if (
      course.accepts_late_signups
      && remainingSessions > 0
      && course.total_weeks
      && course.total_weeks > 0
      && course.price
    ) {
      const perWeek = Math.round(course.price / course.total_weeks);
      tiles.push({
        id: 'main',
        label: 'Kurspakke',
        sublabel: `${remainingSessions} ${remainingSessions === 1 ? 'uke' : 'uker'} igjen`,
        amount: perWeek * remainingSessions,
      });
    }
  } else {
    const { label, sublabel } = wholeTicket(course, isSeries);
    tiles.push({ id: 'main', label, sublabel, amount: course.price ?? 0 });
  }

  if (course.allows_drop_in && course.drop_in_price) {
    tiles.push({
      id: 'drop-in',
      label: 'Drop-in',
      sublabel: dropInSublabel ?? 'Per gang',
      amount: course.drop_in_price,
    });
  }

  return tiles;
}
