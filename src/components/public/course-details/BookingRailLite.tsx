import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from '@/lib/icons';
import { calculateServiceFee, calculateTotalPrice } from '@/lib/pricing';
import { formatKroner, cn } from '@/lib/utils';
import type { PublicCourseWithDetails } from '@/services/publicCourses';

interface BookingRailLiteProps {
  course: PublicCourseWithDetails;
  studioSlug: string;
  /** Optional override for the CTA target. Defaults to /:slug/:courseSlug/pamelding. */
  checkoutHref?: string;
  /** Sublabel for the drop-in tile — typically the next available session date. */
  dropInSublabel?: string | null;
  /** Compact meta line shown under the course title (e.g. "13. april · 06:45–07:30"). */
  metaLabel?: string | null;
  /** True when the first session has already ended — the "Hele kurspakken"
   * tile is dropped so customers can't buy a series they've already missed. */
  seriesStarted?: boolean;
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
 */
export function BookingRailLite({ course, studioSlug, checkoutHref, dropInSublabel, metaLabel, seriesStarted = false }: BookingRailLiteProps) {
  const spotsLeft = course.spots_available;
  const lowStock = spotsLeft > 0 && spotsLeft <= 3;
  const soldOut = spotsLeft === 0;

  const tiles = buildTiles(course, dropInSublabel ?? null, seriesStarted);
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
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-medium tracking-tight text-foreground truncate">
            {course.title}
          </h2>
          {metaLabel && (
            <p className="mt-0.5 text-sm text-foreground-muted tabular-nums">
              {metaLabel}
            </p>
          )}
        </div>
        {lowStock && (
          <Badge variant="neutral" shape="pill" size="sm">
            {spotsLeft} {spotsLeft === 1 ? 'plass' : 'plasser'} igjen
          </Badge>
        )}
      </div>

      {soldOut ? (
        <div className="rounded-lg bg-muted px-4 py-6 text-center space-y-1">
          <p className="text-sm font-medium text-foreground">Kurset er fullt</p>
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
        <div className="rounded-lg bg-muted px-4 py-6 text-center space-y-1">
          <p className="text-sm font-medium text-foreground">Påmelding stengt</p>
          <p className="text-sm text-foreground-muted">Kursrekken er allerede i gang.</p>
        </div>
      ) : (
        <>
          {tiles.length > 0 && (
            <div className="space-y-2" role={tiles.length > 1 ? 'radiogroup' : undefined}>
              {tiles.map((tile) => (
                <TicketTileButton
                  key={tile.id}
                  tile={tile}
                  selectable={tiles.length > 1}
                  selected={selectedId === tile.id}
                  onSelect={() => setSelectedId(tile.id)}
                />
              ))}
            </div>
          )}
          {selectedTile && ticketPrice > 0 && (
            <dl className="space-y-1.5 text-sm tabular-nums">
              <div className="flex justify-between text-foreground-muted">
                <dt>{selectedTile.label}</dt>
                <dd>{formatKroner(ticketPrice)}</dd>
              </div>
              {serviceFee > 0 && (
                <div className="flex justify-between">
                  <dt className="text-foreground-muted">Tjenestegebyr</dt>
                  <dd className="text-foreground-muted">{formatKroner(serviceFee)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base font-medium">
                <dt className="text-foreground">Totalt</dt>
                <dd className="text-foreground">{formatKroner(total)}</dd>
              </div>
            </dl>
          )}
          <Button asChild className="w-full">
            <Link to={href}>Meld deg på</Link>
          </Button>
        </>
      )}
      </div>

      {!soldOut && (
        <div className="border-t border-border-subtle bg-muted px-6 py-3 text-center text-xs text-foreground-muted">
          <p>Avbestill inntil 24 timer før klassen for full refusjon.</p>
        </div>
      )}
    </div>
  );
}

function TicketTileButton({
  tile,
  selectable,
  selected,
  onSelect,
}: {
  tile: TicketTile;
  selectable: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const body = (
    <div className="flex items-baseline justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {tile.label}
        </p>
        {tile.sublabel && (
          <p className="text-sm text-foreground-muted truncate">
            {tile.sublabel}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <p className="text-sm text-foreground tabular-nums whitespace-nowrap">
          {formatKroner(tile.amount)}
        </p>
        {selectable && (
          <Check
            className={cn(
              'size-4 transition-opacity',
              selected ? 'opacity-100 text-foreground' : 'opacity-0',
            )}
            strokeWidth={2}
            aria-hidden
          />
        )}
      </div>
    </div>
  );

  if (!selectable) {
    return (
      <div className="rounded-lg border border-border px-4 py-3">
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-lg border px-4 py-3 transition-colors',
        selected
          ? 'border-foreground ring-1 ring-foreground ring-inset'
          : 'border-border hover:border-foreground-muted',
      )}
    >
      {body}
    </button>
  );
}

function buildTiles(course: PublicCourseWithDetails, dropInSublabel: string | null, seriesStarted: boolean): TicketTile[] {
  const isFree = !course.price || course.price === 0;
  if (isFree) return [];

  const tiles: TicketTile[] = [];
  const isSeries = course.format === 'series';

  // Skip the series-package tile once the series has started — customers
  // can't retroactively buy missed sessions.
  if (!(isSeries && seriesStarted)) {
    tiles.push({
      id: 'main',
      label: isSeries ? 'Hele kurspakken' : 'Enkelttime',
      sublabel: isSeries && course.total_weeks
        ? `${course.total_weeks} uker`
        : null,
      amount: course.price ?? 0,
    });
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
