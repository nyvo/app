import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, ChevronUp } from '@/lib/icons';
import { cn, formatKroner } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, type CourseStatus } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MONTHS_SHORT } from '@/lib/calendar-nb';
import type { SessionScheduleRow } from '@/services/courses';
import type { CourseFormat, DeliveryMode } from '@/types/database';
import { routes } from '@/lib/routes';

/**
 * Course-type label — plain muted text. The earlier colored marker pill
 * (--category-* hues) was dropped 2026-07-11: three same-family blue pastels
 * at 8px were indistinguishable, so the pill added noise without carrying
 * information the label doesn't already give.
 */
const TYPE_LABEL: Record<'series' | 'single' | 'online', string> = {
  series: 'Kursrekke',
  single: 'Enkelttime',
  online: 'Nettkurs',
};

function typeLabel(format: CourseFormat, delivery: DeliveryMode): string {
  if (delivery === 'online') return TYPE_LABEL.online;
  return TYPE_LABEL[format] ?? TYPE_LABEL.single;
}

// Short weekday, checkout convention ("tir. 12. aug"). Deliberately local —
// the codebase keeps short-weekday arrays per-module (see @/lib/calendar-nb's
// note on incompatible abbreviation conventions).
const WEEKDAYS_SHORT = ['søn.', 'man.', 'tir.', 'ons.', 'tor.', 'fre.', 'lør.'] as const;

/** "tir. 12. aug" for the date column; "–" when the course has no date
 * (drafts have no sessions yet). */
function formatRowDate(dateStr: string): string {
  if (!dateStr) return '–';
  const d = new Date(`${dateStr}T12:00:00`);
  if (isNaN(d.getTime())) return '–';
  return `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`;
}

/**
 * Publish-state badge — silent on the healthy states (upcoming/active, i.e.
 * Publisert); only renders for states the teacher might need to notice.
 * Sits inline beside the title, so healthy rows carry no pill at all.
 * Label + presentation delegate to StatusBadge so status copy stays centralized.
 *
 * `isFull` is a derived capacity state (signups ≥ capacity), not a
 * course_status value — for the teacher a fully booked course is a win, so
 * it renders as a success badge rather than a warning. Publish-state badges
 * take precedence (a cancelled-but-full course reads Avlyst).
 */
function StatusBadgeRow({ courseStatus, isFull }: { courseStatus: string; isFull?: boolean }) {
  if (courseStatus === 'draft' || courseStatus === 'cancelled' || courseStatus === 'completed') {
    return <StatusBadge status={courseStatus as CourseStatus} className="shrink-0" />;
  }
  if (isFull) {
    return (
      <Badge variant="success" shape="pill" size="sm" role="status" aria-label="Status: Fullt" className="shrink-0">
        Fullt
      </Badge>
    );
  }
  return null;
}

/** 48px course image — same fallback chain as the public storefront lists
 * (course image → seller default → muted square). */
function CourseThumb({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <div aria-hidden className="size-12 shrink-0 rounded-lg bg-muted" />;
  }
  return (
    <img
      src={src}
      alt=""
      className="media-outline size-12 shrink-0 rounded-lg object-cover"
      onError={() => setFailed(true)}
    />
  );
}

// ─── Table primitives ───────────────────────────────────────────────────
// Borderless flat-table pattern: column headers + hairline-divided rows,
// no card chrome. Each row is a media object (thumb + title stack) followed
// by value columns; numeric columns (Påmeldte/Pris) are right-aligned with
// their headers for scanability. Status is NOT a column — it renders as an
// inline pill beside the title, only when there is something to notice
// (Luma/Linear pattern; a dedicated mostly-empty column read as dead space).
// Sort lives on the column headers themselves (canonical Stripe/Linear/
// Notion 2025 pattern) — no separate sort dropdown in the toolbar.

export type SortKey = 'name' | 'next' | 'signups' | 'price';
export type SortDir = 'asc' | 'desc';

// Header and rows share pl-3/pr-8 so their grid tracks stay aligned: pl-3
// mirrors the -mx-3 table bleed (content sits back on the page edge), pr-8
// keeps a gutter between the numeric columns and the hover chevron.
// Below md the date column folds into the row's meta line ("Kursrekke ·
// ons. 20. mai") so the title keeps its room — two columns on mobile.
const COLS = 'grid grid-cols-[minmax(0,1fr)_76px] items-center gap-3 sm:gap-6 pl-3 pr-4 sm:pr-8 md:grid-cols-[minmax(0,1fr)_130px_120px_120px]';

interface TableHeaderProps {
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  /** Date-column header — "Neste økt" on Aktive, "Avsluttet" on Fullførte. */
  dateLabel: string;
}

function SortableHeader({
  label,
  columnKey,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  columnKey: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = sortKey === columnKey;
  const Arrow = sortDir === 'asc' ? ChevronUp : ChevronDown;
  return (
    <div
      role="columnheader"
      aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={className}
    >
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        aria-label={`Sorter etter ${label}`}
        className="group inline-flex items-center gap-1 rounded text-left text-sm text-foreground-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}
        {isActive ? (
          <Arrow className="size-3.5 shrink-0" aria-hidden="true" />
        ) : (
          // Hover-ghost cue on the inactive sortable columns.
          <ChevronDown
            className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden="true"
          />
        )}
      </button>
    </div>
  );
}

function TableHeader({ sortKey, sortDir, onSort, dateLabel }: TableHeaderProps) {
  return (
    // The header rule also yields when the FIRST data row is hovered — it's
    // the divider directly above that row's rounded hover fill.
    <div
      role="row"
      className={cn(
        COLS,
        'py-3 border-b border-border-subtle',
        '[&:has(+div>:first-child:hover)]:border-transparent [&:has(+div>:first-child:focus-visible)]:border-transparent',
      )}
    >
      <SortableHeader label="Navn" columnKey="name" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
      <SortableHeader label={dateLabel} columnKey="next" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="hidden md:block" />
      <SortableHeader label="Påmeldte" columnKey="signups" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="text-right" />
      <SortableHeader label="Pris" columnKey="price" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="hidden md:block text-right" />
    </div>
  );
}

function TableRow({
  course,
  countsUnavailable,
  fallbackImageUrl,
}: {
  course: SessionScheduleRow;
  countsUnavailable?: boolean;
  fallbackImageUrl?: string | null;
}) {
  // Counts RPC failed — render `–` rather than a fabricated 0 / N.
  const roster = countsUnavailable
    ? '–'
    : course.maxParticipants
      ? `${course.signupsCount} / ${course.maxParticipants}`
      : `${course.signupsCount}`;

  return (
    <Link
      to={routes.course(course.courseId)}
      role="row"
      className={cn(
        COLS,
        // rounded-lg + the table's -mx-3 bleed keep the hover fill from
        // reading as a hard-edged band cut off at the content edges.
        'group relative rounded-lg py-4 no-underline outline-none transition-colors hover:bg-hover focus-visible:bg-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring-subtle',
        // Hide the two hairlines touching the hovered row — Linear's
        // list-hover treatment. v4 divide-y is border-BOTTOM on non-last
        // children: the row's own border is the divider below it, the
        // previous sibling's (`:has(+ :hover)`) is the one above it.
        'hover:border-transparent focus-visible:border-transparent [&:has(+:hover)]:border-transparent [&:has(+:focus-visible)]:border-transparent',
      )}
    >
      <div role="cell" className="flex min-w-0 items-center gap-3">
        <CourseThumb src={course.imageUrl || fallbackImageUrl || null} />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-base font-medium text-foreground">{course.courseTitle}</h3>
            <StatusBadgeRow
              courseStatus={course.courseStatus}
              isFull={
                !countsUnavailable &&
                !!course.maxParticipants &&
                course.signupsCount >= course.maxParticipants
              }
            />
          </div>
          <p className="mt-1 truncate text-sm text-foreground-muted">
            {typeLabel(course.courseFormat, course.deliveryMode)}
            {course.sessionDate && (
              <span className="md:hidden">{` · ${formatRowDate(course.sessionDate)}`}</span>
            )}
          </p>
        </div>
      </div>
      <span role="cell" className="hidden whitespace-nowrap text-base text-foreground md:inline">
        {formatRowDate(course.sessionDate)}
      </span>
      <span role="cell" className="whitespace-nowrap text-right text-base text-foreground tabular-nums">
        {roster}
      </span>
      <span role="cell" className="hidden whitespace-nowrap text-right text-base text-foreground tabular-nums md:inline">
        {formatKroner(course.price)}
      </span>
      <ChevronRight
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-foreground-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
      />
    </Link>
  );
}

function TableBody({
  courses,
  countsUnavailable,
  fallbackImageUrl,
}: {
  courses: SessionScheduleRow[];
  countsUnavailable?: boolean;
  fallbackImageUrl?: string | null;
}) {
  return (
    <div className="divide-y divide-border-subtle">
      {courses.map((c) => (
        <TableRow key={c.sessionId} course={c} countsUnavailable={countsUnavailable} fallbackImageUrl={fallbackImageUrl} />
      ))}
    </div>
  );
}

// ─── Public component ───────────────────────────────────────────────────

interface CourseListViewProps {
  courses: SessionScheduleRow[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  /** Rendered in place of the body when `courses` is empty. The header stays
   * visible so the table structure doesn't disappear between tab switches. */
  emptyState?: ReactNode;
  /** When the signup-counts RPC failed, the Påmeldte column reads `–`. */
  countsUnavailable?: boolean;
  /** Date-column header — defaults to "Neste økt"; the Fullførte tab passes
   * "Avsluttet" (the page maps sessionDate to the course's end date there). */
  dateLabel?: string;
  /** Seller-level default course image — thumb fallback when a course has no
   * image of its own, mirroring the public storefront's fallback chain. */
  fallbackImageUrl?: string | null;
}

export function CourseListView({
  courses,
  sortKey,
  sortDir,
  onSort,
  emptyState,
  countsUnavailable,
  dateLabel = 'Neste økt',
  fallbackImageUrl,
}: CourseListViewProps) {
  return (
    // -mx-3 lets the rounded row-hover fill bleed past the content edges
    // (Linear-style) instead of stopping flush against the text columns;
    // pl-3 inside COLS puts the content back on the page grid.
    <div role="table" className="-mx-3">
      <TableHeader sortKey={sortKey} sortDir={sortDir} onSort={onSort} dateLabel={dateLabel} />
      {courses.length === 0 && emptyState ? (
        <div className="pl-3 pr-8">{emptyState}</div>
      ) : (
        <TableBody courses={courses} countsUnavailable={countsUnavailable} fallbackImageUrl={fallbackImageUrl} />
      )}
    </div>
  );
}

export function CourseListSkeleton() {
  return (
    <div className="-mx-3">
      <div className={cn(COLS, 'py-3 border-b border-border-subtle text-sm text-foreground-muted')}>
        <span>Navn</span>
        <span className="hidden md:inline">Neste økt</span>
        <span className="text-right">Påmeldte</span>
        <span className="hidden text-right md:inline">Pris</span>
      </div>
      <div className="divide-y divide-border-subtle">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={cn(COLS, 'py-4')}>
            <div className="flex min-w-0 items-center gap-3">
              <Skeleton className="size-12 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-6 w-48 max-w-full" />
                <Skeleton className="mt-1 h-5 w-24 max-w-full" />
              </div>
            </div>
            <Skeleton className="hidden h-4 w-20 md:inline-block" />
            <Skeleton className="h-4 w-12 justify-self-end" />
            <Skeleton className="hidden h-4 w-16 justify-self-end md:inline-block" />
          </div>
        ))}
      </div>
    </div>
  );
}
