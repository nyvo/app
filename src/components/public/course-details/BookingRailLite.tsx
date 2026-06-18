import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatKroner, cn } from '@/lib/utils';
import { toLocalDate } from '@/utils/dateUtils';
import { singleDayCount, type PublicCourseWithDetails } from '@/services/publicCourses';
import type { CourseSession } from '@/types/database';

interface BookingRailLiteProps {
  course: PublicCourseWithDetails;
  /** Course sessions (date + time). Drives the date rows and the "Se alle
   * datoer" dialog. Optional so dev previews can mount without session data. */
  sessions?: CourseSession[];
  studioSlug: string;
  /** Optional override for the CTA target. Defaults to /:slug/:courseSlug/pamelding. */
  checkoutHref?: string;
  /** True when the first session has already ended. The package stays
   * available but is prorated to the sessions that are still ahead. */
  seriesStarted?: boolean;
  /** Non-cancelled sessions whose end is still in the future. Used to prorate
   * the package price when `seriesStarted` is true. Mirrors the SQL in
   * migration 20260520160000 so display matches what the RPC will charge. */
  remainingSessions?: number;
}

export type TicketId = 'main' | 'drop-in' | 'free';

interface Tile {
  id: TicketId;
  amount: number;
}

/**
 * Step 1 of booking — the choice only. Care.com "Select dates and schedule"
 * model: the page hero owns the title and price detail; this rail leads with
 * "Velg kurstype" and the available options, flat on the page canvas (no card
 * box, no box around each option). The price breakdown, service fee and total
 * live on step 2 (/pamelding), where the form and payment sit together.
 *
 *  - One option (single series, or a free class) → shown directly.
 *  - Package + drop-in → a Kurspakke/Drop-in toggle.
 *  - Drop-in → one selectable row per upcoming session, each routing to
 *    checkout with that session pinned (?billett=drop-in&okt=<id>).
 */
export function BookingRailLite({
  course,
  sessions = [],
  studioSlug,
  checkoutHref,
  seriesStarted = false,
  remainingSessions = 0,
}: BookingRailLiteProps) {
  const [mode, setMode] = useState<'package' | 'dropin'>('package');
  const [datesOpen, setDatesOpen] = useState(false);

  const spotsLeft = course.spots_available;
  const lowStock = spotsLeft > 0 && spotsLeft <= 3;
  const soldOut = spotsLeft === 0;

  const isFree = !course.price || course.price === 0;
  const isSeries = course.format === 'series';

  const tiles = buildTiles(course, seriesStarted, remainingSessions);
  const mainTile = tiles.find((t) => t.id === 'main' || t.id === 'free') ?? null;
  const dropInTile = tiles.find((t) => t.id === 'drop-in') ?? null;
  const closed = !soldOut && tiles.length === 0 && seriesStarted;

  const upcoming = sessions.filter((s) => isUpcoming(s, course.duration));
  const previewRows = upcoming.slice(0, 3);
  const hasMore = upcoming.length > previewRows.length;

  const baseHref = checkoutHref ?? `/${studioSlug}/${course.slug}/pamelding`;
  const tierHref = (id: TicketId) => `${baseHref}?billett=${id}`;
  const dropInHref = (sessionId: string) =>
    `${baseHref}?billett=drop-in&okt=${sessionId}`;

  // ── Closed states ───────────────────────────────────────────────────────
  if (soldOut) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-foreground">Fullt</h3>
        <p className="text-sm text-foreground-muted">
          Alle plasser på dette kurset er tatt.
        </p>
        {course.seller?.name && (
          <Button asChild variant="outline" size="cta" className="mt-1 w-full">
            <Link to={`/${studioSlug}`}>Se andre kurs</Link>
          </Button>
        )}
      </div>
    );
  }
  if (closed) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-foreground">Påmelding stengt</h3>
        <p className="text-sm text-foreground-muted">Kurset har startet.</p>
      </div>
    );
  }

  const hasToggle = !!mainTile && !!dropInTile && !isFree;
  const dropInActive = !!dropInTile && (mode === 'dropin' || !mainTile);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-medium text-foreground">Velg kurstype</h3>
        {lowStock && (
          <Badge variant="warning" shape="pill" size="sm">
            {spotsLeft} {spotsLeft === 1 ? 'plass' : 'plasser'} igjen
          </Badge>
        )}
      </div>

      {hasToggle && (
        <TicketToggle mode={mode} onChange={setMode} mainLabel={isSeries ? 'Kurspakke' : singleCourseLabel(course)} />
      )}

      {dropInActive && dropInTile ? (
        <div>
          {previewRows.length > 0 ? (
            <div className="divide-y divide-border">
              {previewRows.map((s) => (
                <div key={s.id} className="py-4 first:pt-0">
                  <Option
                    title={formatSessionDate(s.session_date)}
                    inlineTime={sessionTimeRange(s.start_time, course.duration)}
                    priceLabel={formatKroner(dropInTile.amount)}
                    href={dropInHref(s.id)}
                    align="center"
                    dense
                  />
                </div>
              ))}
            </div>
          ) : (
            <Option
              title="Drop-in"
              priceLabel={formatKroner(dropInTile.amount)}
              href={tierHref('drop-in')}
              align="center"
            />
          )}
          {hasMore && (
            <button
              type="button"
              onClick={() => setDatesOpen(true)}
              className="mt-3 text-sm font-medium text-primary underline"
            >
              Se alle {upcoming.length} datoer
            </button>
          )}
        </div>
      ) : (
        mainTile && (
          <Option
            title={course.title}
            dateRows={previewRows.map((s) => ({
              date: formatSessionDate(s.session_date),
              time: sessionTimeRange(s.start_time, course.duration),
            }))}
            onSeeAll={hasMore ? () => setDatesOpen(true) : undefined}
            seeAllCount={upcoming.length}
            priceLabel={mainTile.id === 'free' ? 'Gratis' : formatKroner(mainTile.amount)}
            href={tierHref(mainTile.id)}
          />
        )
      )}

      <AllDatesDialog
        open={datesOpen}
        onOpenChange={setDatesOpen}
        sessions={upcoming}
        duration={course.duration}
        selectable={dropInActive}
        hrefFor={dropInHref}
      />
    </div>
  );
}

function TicketToggle({
  mode,
  onChange,
  mainLabel,
}: {
  mode: 'package' | 'dropin';
  onChange: (m: 'package' | 'dropin') => void;
  mainLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Velg billett"
      className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1"
    >
      {(['package', 'dropin'] as const).map((m) => {
        const selected = mode === m;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(m)}
            className={cn(
              'rounded-full px-3 py-2 text-sm font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
              selected
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-foreground-muted hover:text-foreground',
            )}
          >
            {m === 'package' ? mainLabel : 'Drop-in'}
          </button>
        );
      })}
    </div>
  );
}

/** A bare option row — no box. Info left, price + Velg right. */
function Option({
  title,
  inlineTime,
  dateRows,
  onSeeAll,
  seeAllCount,
  priceLabel,
  href,
  align = 'start',
  dense = false,
}: {
  title: string;
  inlineTime?: string | null;
  dateRows?: { date: string; time: string | null }[];
  onSeeAll?: () => void;
  seeAllCount?: number;
  priceLabel: string;
  href: string;
  align?: 'start' | 'center';
  dense?: boolean;
}) {
  // Carry the current page as backgroundLocation so checkout opens as a modal
  // over the course page rather than replacing it.
  const location = useLocation();
  return (
    <div className={cn('flex justify-between gap-4', align === 'center' ? 'items-center' : 'items-start')}>
      <div className="min-w-0">
        <p
          className={cn(
            'flex flex-wrap items-baseline gap-x-2 text-foreground',
            dense ? 'text-sm' : 'text-base font-medium',
          )}
        >
          <span>{title}</span>
          {inlineTime && (
            <span className="text-sm font-normal tabular-nums text-foreground-muted">{inlineTime}</span>
          )}
        </p>
        {dateRows && dateRows.length > 0 && (
          <ul className="mt-2 space-y-1.5 text-sm text-foreground">
            {dateRows.map((row, i) => (
              <li key={i} className="flex items-baseline gap-x-2">
                <span>{row.date}</span>
                {row.time && <span className="tabular-nums text-foreground-muted">{row.time}</span>}
              </li>
            ))}
          </ul>
        )}
        {onSeeAll && (
          <button onClick={onSeeAll} className="mt-2 text-sm font-medium text-primary underline">
            Se alle {seeAllCount} datoer
          </button>
        )}
      </div>
      <div className="flex w-20 shrink-0 flex-col items-stretch gap-2">
        <span className="text-center text-sm font-medium tabular-nums text-foreground">{priceLabel}</span>
        <Button asChild size="default" className="w-full">
          <Link to={href} state={{ backgroundLocation: location }}>Velg</Link>
        </Button>
      </div>
    </div>
  );
}

function AllDatesDialog({
  open,
  onOpenChange,
  sessions,
  duration,
  selectable,
  hrefFor,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sessions: CourseSession[];
  duration: number | null;
  selectable: boolean;
  hrefFor: (sessionId: string) => string;
}) {
  const location = useLocation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{selectable ? 'Velg dato' : 'Alle datoer'}</DialogTitle>
        </DialogHeader>
        <ul className="divide-y divide-border">
          {sessions.map((s) => {
            const time = sessionTimeRange(s.start_time, duration);
            return (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 py-3 text-sm text-foreground first:pt-0 last:pb-0"
              >
                <span className="flex items-baseline gap-3">
                  <span className="font-medium">{formatSessionDate(s.session_date)}</span>
                  {time && <span className="tabular-nums text-foreground-muted">{time}</span>}
                </span>
                {selectable && (
                  <Button asChild size="default" className="px-4">
                    <Link
                      to={hrefFor(s.id)}
                      state={{ backgroundLocation: location }}
                      onClick={() => onOpenChange(false)}
                    >
                      Velg
                    </Link>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

const WEEKDAYS = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'] as const;
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const;

/** "Tirsdag 16. jun" — capitalized weekday, abbreviated month. */
function formatSessionDate(dateStr: string): string {
  const d = toLocalDate(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "06:15–07:00" from start time + duration. Mirrors the page's MetaStrip. */
function sessionTimeRange(startTime: string | null, durationMinutes: number | null): string | null {
  if (!startTime) return null;
  const start = startTime.slice(0, 5);
  if (!durationMinutes || durationMinutes <= 0) return start;
  const [h, m] = start.split(':').map(Number);
  const total = h * 60 + m + durationMinutes;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${start}–${pad(endH)}:${pad(endM)}`;
}

/** A session is "upcoming" when it isn't cancelled and hasn't ended yet — a
 * class underway but not over still counts. Mirrors `isSessionRemaining` in
 * PublicCourseDetailPage and the SQL in `available_ticket_types`. */
function isUpcoming(s: CourseSession, durationMinutes: number | null): boolean {
  if (s.status === 'cancelled') return false;
  const startMs = new Date(`${s.session_date}T${s.start_time ?? '00:00:00'}`).getTime();
  if (isNaN(startMs)) return false;
  return startMs + (durationMinutes ?? 60) * 60000 > Date.now();
}

/** Single (non-series) course: the whole-course label. */
function singleCourseLabel(course: PublicCourseWithDetails): string {
  return singleDayCount(course) > 1 ? 'Hele kurset' : 'Enkelttime';
}

/** Ticket ids + amounts. Free → one free tile; otherwise a main tile (prorated
 * for a started series) plus drop-in when the course offers it. The card shows
 * the bare ticket price — the service fee and total are computed on step 2. */
function buildTiles(
  course: PublicCourseWithDetails,
  seriesStarted: boolean,
  remainingSessions: number,
): Tile[] {
  const isFree = !course.price || course.price === 0;
  const isSeries = course.format === 'series';

  if (isFree) return [{ id: 'free', amount: 0 }];

  const tiles: Tile[] = [];

  // Series + started: prorate the package to the sessions still ahead. The
  // per-week rate is price ÷ total_weeks, mirroring `available_ticket_types`.
  // Teachers opt out of late signups via course.accepts_late_signups.
  if (isSeries && seriesStarted) {
    if (
      course.accepts_late_signups
      && remainingSessions > 0
      && course.total_weeks
      && course.total_weeks > 0
      && course.price
    ) {
      const perWeek = Math.round(course.price / course.total_weeks);
      tiles.push({ id: 'main', amount: perWeek * remainingSessions });
    }
  } else {
    tiles.push({ id: 'main', amount: course.price ?? 0 });
  }

  if (course.allows_drop_in && course.drop_in_price) {
    tiles.push({ id: 'drop-in', amount: course.drop_in_price });
  }

  return tiles;
}
