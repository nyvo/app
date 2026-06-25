import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, type CourseStatus } from '@/components/ui/status-badge';
import { cn, formatCoursePrice } from '@/lib/utils';
import { resolveCourseImage, singleDayCount, type PublicCourseWithDetails } from '@/services/publicCourses';
import type { CourseFormat, DeliveryMode } from '@/types/database';
import { toLocalDate } from '@/utils/dateUtils';

/**
 * Image-overlay badges fall into two buckets:
 *  - Status (`Avlyst`, `Fullt`) — defer to StatusBadge so the language is
 *    consistent with the teacher list, drawers, and course pages.
 *  - Decorative (`X igjen`, `Drop-in`) — derived counts / feature flags, not
 *    a status. Stay as raw Badge with deliberate marketing tones (warning,
 *    destructive) to catch the eye on a busy image.
 */
type DecorativeTone = 'urgent' | 'lively';

function placeholderLabel(format: CourseFormat, delivery: DeliveryMode): string {
  if (delivery === 'online') return 'Online';
  return format === 'series' ? 'Kursrekke' : 'Enkelttime';
}

function CoursePlaceholder({ format, delivery }: { format: CourseFormat; delivery: DeliveryMode }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-muted transition-transform duration-700 ease-out group-hover:scale-[1.04]"
      aria-hidden
    >
      <span className="text-sm font-medium text-foreground-muted">
        {placeholderLabel(format, delivery)}
      </span>
    </div>
  );
}

interface CourseCardProps {
  course: PublicCourseWithDetails;
  ratio?: 'portrait' | 'landscape';
  className?: string;
  /** Storefront the user is viewing; carried as state so the detail page's
   * back link returns here even in syndicated cases (URL canonicalizes to
   * the course owner). */
  viewingSlug?: string;
  viewingName?: string | null;
}

const WEEKDAYS_SHORT = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'] as const;
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const;

interface DateChip {
  label: string;
  isRelative: boolean;
}

function formatDateChip(dateStr: string | null): DateChip | null {
  if (!dateStr) return null;
  const d = toLocalDate(dateStr);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return { label: 'I dag', isRelative: true };
  if (diff === 1) return { label: 'I morgen', isRelative: true };
  return { label: `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`, isRelative: false };
}

function extractTime(timeSchedule: string | null): string {
  if (!timeSchedule) return '';
  const m = timeSchedule.match(/(\d{1,2}:\d{2})/);
  return m ? m[1] : '';
}

/** One-line "kind + commitment" descriptor for the card eyebrow. Gives the
 * at-a-glance signal the card was missing: is this a single class, a series
 * (and how many weeks), or an online run. */
function formatSummary(course: PublicCourseWithDetails): string {
  if (course.delivery_mode === 'online') return 'Nettkurs';
  if (course.format === 'series') {
    return course.total_weeks ? `Kursrekke · ${course.total_weeks} uker` : 'Kursrekke';
  }
  const days = singleDayCount(course);
  if (days > 1) return `Kurs · ${days} dager`;
  return course.duration ? `Enkelttime · ${course.duration} min` : 'Enkelttime';
}

/**
 * Image-led course card. Whole card is the click target — no per-card
 * button. A hover arrow at bottom-right signals the affordance. Single
 * ranked badge on the image (cancelled > full > low-spots). Drop-in lives
 * on the meta line as a fact, not a warning.
 *
 * Date chip + meta line each follow the "one weight, one color" rule:
 * fragments on the same line share a treatment.
 */
export function CourseCard({ course, ratio = 'portrait', className, viewingSlug, viewingName }: CourseCardProps) {
  const studioSlug = course.seller?.slug ?? '';
  const href = `/${studioSlug}/${course.slug}`;
  const linkState = {
    fromSlug: viewingSlug ?? studioSlug,
    fromName: viewingName ?? course.seller?.name ?? null,
  };
  const [imgFailed, setImgFailed] = useState(false);

  const img = resolveCourseImage(course);
  const time = extractTime(course.time_schedule);
  const date = course.next_session?.session_date ?? course.start_date;
  const dateChip = formatDateChip(date);
  const instructor = course.instructors[0] ?? course.instructor ?? null;
  const isFull = course.max_participants !== null && course.spots_available <= 0;
  const isCancelled = course.status === 'cancelled';
  const lowSpots =
    course.max_participants !== null &&
    course.spots_available > 0 &&
    course.spots_available <= 3;
  const allowsDropIn = !!course.allows_drop_in;

  // Cancelled/full take precedence and clear other badges. Status badges
  // (Avlyst / Fullt) delegate to StatusBadge for visual consistency. The
  // decorative ones (X igjen / Drop-in) are derived signals, not status.
  let statusOverlay: CourseStatus | null = null;
  const decorativeBadges: { label: string; tone: DecorativeTone }[] = [];
  if (isCancelled) {
    statusOverlay = 'cancelled';
  } else if (isFull) {
    statusOverlay = 'full';
  } else {
    if (lowSpots) decorativeBadges.push({ label: `${course.spots_available} igjen`, tone: 'urgent' });
    if (allowsDropIn) decorativeBadges.push({ label: 'Drop-in', tone: 'lively' });
  }
  const hasOverlay = statusOverlay !== null || decorativeBadges.length > 0;

  const isDisabled = isCancelled || isFull;

  // One image per teacher (sellers.logo_url is canonical). The instructor
  // row only renders when an explicit instructor name is set on the course.
  const personName = instructor?.name ?? null;
  const personAvatar = course.seller?.logo_url ?? null;

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl bg-surface outline-none',
        'ring-1 ring-border/0 transition-shadow duration-150',
        'hover:ring-border',
        'focus-within:ring-2 focus-within:ring-foreground',
        isDisabled && 'bg-muted hover:ring-border/0',
        className,
      )}
    >
      {/* Cover */}
      <Link
        to={href}
        state={linkState}
        aria-label={course.title}
        className={cn(
          'relative block w-full overflow-hidden bg-muted outline-none',
          ratio === 'portrait' ? 'aspect-[4/5]' : 'aspect-[16/10]',
        )}
      >
        {img && !imgFailed ? (
          <img
            src={img}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            className={cn(
              'absolute inset-0 size-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.04]',
              isDisabled && 'saturate-50',
            )}
          />
        ) : (
          <CoursePlaceholder format={course.format} delivery={course.delivery_mode} />
        )}

        {hasOverlay && (
          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
            {statusOverlay && <StatusBadge status={statusOverlay} />}
            {decorativeBadges.map(b => (
              <Badge
                key={b.label}
                variant={b.tone === 'urgent' ? 'warning' : 'destructive'}
                size="sm"
              >
                {b.label}
              </Badge>
            ))}
          </div>
        )}

      </Link>

      {/* Body — kind, title, when, meta. No CTA button. */}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {/* Eyebrow — course kind + commitment, single muted tier */}
        <p className={cn(
          'text-xs leading-tight',
          'text-foreground-muted',
        )}>
          {formatSummary(course)}
        </p>

        {/* Title */}
        <h3 className={cn(
          'text-base font-medium leading-tight line-clamp-2',
          isDisabled ? 'text-foreground-muted' : 'text-foreground',
        )}>
          <Link
            to={href}
            state={linkState}
            className="no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
          >
            {course.title}
          </Link>
        </h3>

        {/* When line — single tier, sentence case, tabular */}
        {(dateChip || time) && (
          <div className="inline-flex items-baseline gap-1.5 text-sm font-medium tabular-nums text-foreground-muted">
            {dateChip && <span>{dateChip.label}</span>}
            {dateChip && time && <span className="text-foreground-muted">·</span>}
            {time && <span>{time}</span>}
          </div>
        )}

        {/* Meta line — avatar + instructor on the left, emphasized price on the
            right. Price gets foreground weight: it's decision info, not meta. */}
        <div className="mt-auto pt-1.5 flex items-center gap-2 text-sm text-foreground-muted tabular-nums">
          {personName && (
            <>
              <UserAvatar
                size="xs"
                name={personName}
                src={personAvatar}
                className="shrink-0"
              />
              <span className="truncate">{personName}</span>
            </>
          )}
          <span className={cn(
            'ml-auto shrink-0 font-medium',
            isDisabled ? 'text-foreground-muted' : 'text-foreground',
          )}>
            {formatCoursePrice(course.price)}
          </span>
        </div>
      </div>
    </article>
  );
}
