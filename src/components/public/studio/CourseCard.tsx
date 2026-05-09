import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from '@/lib/icons';
import { UserAvatar } from '@/components/ui/user-avatar';
import { cn, formatCoursePrice } from '@/lib/utils';
import { resolveCourseImage, type PublicCourseWithDetails } from '@/services/publicCourses';
import type { CourseType } from '@/types/database';

const PLACEHOLDER_BY_TYPE: Record<CourseType, { from: string; to: string; label: string }> = {
  'course-series': { from: '#EFE7DC', to: '#D4C4A6', label: 'Kursrekke' },
  event: { from: '#F2DDC9', to: '#D9A879', label: 'Arrangement' },
  online: { from: '#E2E5EA', to: '#B6BCC7', label: 'Online' },
};

function CoursePlaceholder({ type }: { type: CourseType }) {
  const cfg = PLACEHOLDER_BY_TYPE[type] ?? PLACEHOLDER_BY_TYPE['course-series'];
  return (
    <div
      className="absolute inset-0 flex items-center justify-center transition-transform duration-700 ease-out group-hover:scale-[1.04]"
      style={{ backgroundImage: `linear-gradient(140deg, ${cfg.from} 0%, ${cfg.to} 100%)` }}
      aria-hidden
    >
      <span className="text-xs font-medium tracking-[0.24em] uppercase text-foreground/55">
        {cfg.label}
      </span>
    </div>
  );
}

interface CourseCardProps {
  course: PublicCourseWithDetails;
  ratio?: 'portrait' | 'landscape';
  className?: string;
}

const WEEKDAYS_SHORT = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'] as const;
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const;

interface DateChip {
  label: string;
  isRelative: boolean;
}

function formatDateChip(dateStr: string | null): DateChip | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
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

/**
 * Image-led course card. Whole card is the click target — no per-card
 * button. A hover arrow at bottom-right signals the affordance. Single
 * ranked badge on the image (cancelled > full > low-spots). Drop-in lives
 * on the meta line as a fact, not a warning.
 *
 * Date chip + meta line each follow the "one weight, one color" rule:
 * fragments on the same line share a treatment.
 */
export function CourseCard({ course, ratio = 'portrait', className }: CourseCardProps) {
  const location = useLocation();
  const studioSlug = course.seller?.slug ?? '';
  const href = `/${studioSlug}/${course.slug}`;
  const linkState = { backgroundLocation: location };
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

  // Cancelled/full take precedence and clear other badges.
  // Otherwise low-spots and drop-in can coexist on the image.
  const imageBadges: { label: string; tone: 'soft' | 'full' | 'urgent' | 'lively' }[] = [];
  if (isCancelled) {
    imageBadges.push({ label: 'Avlyst', tone: 'soft' });
  } else if (isFull) {
    imageBadges.push({ label: 'Fullt', tone: 'full' });
  } else {
    if (lowSpots) imageBadges.push({ label: `${course.spots_available} igjen`, tone: 'urgent' });
    if (allowsDropIn) imageBadges.push({ label: 'Drop-in', tone: 'lively' });
  }

  const isDisabled = isCancelled || isFull;

  // Instructor falls back to the studio name + initials when no instructor is set
  const personName = instructor?.name ?? course.seller?.name ?? null;
  const personAvatar = instructor?.avatar_url ?? null;

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg bg-surface outline-none',
        'ring-1 ring-border/70 transition-all duration-300',
        'hover:ring-foreground/30 hover:-translate-y-0.5',
        'focus-within:ring-2 focus-within:ring-ring',
        isDisabled && 'bg-muted/50 hover:translate-y-0',
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
          <CoursePlaceholder type={course.course_type} />
        )}

        {imageBadges.length > 0 && (
          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
            {imageBadges.map(b => (
              <span
                key={b.label}
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium leading-relaxed',
                  b.tone === 'full' && 'bg-foreground/85 text-background backdrop-blur-md',
                  b.tone === 'urgent' && 'bg-warning text-warning-foreground',
                  b.tone === 'lively' && 'bg-danger text-danger-foreground',
                  b.tone === 'soft' && 'bg-foreground-muted text-background',
                )}
              >
                {b.label}
              </span>
            ))}
          </div>
        )}

        {/* Hover arrow lives on the cover image so it can't collide with body content */}
        {!isDisabled && (
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute bottom-2.5 right-2.5 flex size-7 items-center justify-center rounded-full',
              'bg-foreground/85 text-background backdrop-blur-md',
              'opacity-0 -translate-x-1 transition-all duration-200',
              'group-hover:opacity-100 group-hover:translate-x-0',
            )}
          >
            <ArrowRight className="size-3.5" strokeWidth={2} />
          </span>
        )}
      </Link>

      {/* Body — title, when, meta. No CTA button. */}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {/* When line — single tier, sentence case, tabular */}
        {(dateChip || time) && (
          <div className={cn(
            'inline-flex items-baseline gap-1.5 text-xs font-medium tabular-nums',
            isDisabled ? 'text-foreground-muted' : 'text-foreground-muted',
          )}>
            {dateChip && <span>{dateChip.label}</span>}
            {dateChip && time && <span className="text-foreground-disabled">·</span>}
            {time && <span>{time}</span>}
          </div>
        )}

        {/* Title */}
        <h3 className={cn(
          'text-[15px] font-semibold leading-[1.3] line-clamp-2',
          isDisabled ? 'text-foreground-muted' : 'text-foreground',
        )}>
          <Link
            to={href}
            state={linkState}
            className="outline-none hover:underline underline-offset-2 decoration-foreground/30 focus-visible:underline"
          >
            {course.title}
          </Link>
        </h3>

        {/* Meta line — single tier: avatar + name on the left, price on the right.
            Falls back to studio name when no instructor is set. */}
        <div className="mt-auto pt-1.5 flex items-center gap-2 text-xs text-foreground-muted tabular-nums">
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
          <span className="ml-auto shrink-0">{formatCoursePrice(course.price)}</span>
        </div>
      </div>
    </article>
  );
}
