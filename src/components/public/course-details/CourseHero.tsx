import { Link } from 'react-router-dom';
import { ImageIcon, Clock, Calendar } from '@/lib/icons';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { resolveCourseImage, type PublicCourseWithDetails } from '@/services/publicCourses';
import type { CourseLevel } from '@/types/database';

const LEVEL_LABELS: Record<CourseLevel, string> = {
  alle: 'Alle nivåer',
  nybegynner: 'Nybegynner',
  viderekommen: 'Viderekommen',
};

const WEEKDAYS = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'] as const;
const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'] as const;
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const;

function formatShortDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`;
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'I dag';
  if (diff === 1) return 'I morgen';
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

function extractTime(timeSchedule: string | null): string {
  if (!timeSchedule) return '';
  const m = timeSchedule.match(/(\d{1,2}:\d{2})/);
  return m ? m[1] : '';
}

interface CourseHeroProps {
  course: PublicCourseWithDetails;
}

/**
 * Hero — image, quiet studio link subtitle, oversized title, then a
 * three-item meta strip (date range, next session + duration, level chip).
 * Typography follows the editorial scale documented in tasks/preview/course-detail.html.
 */
export function CourseHero({ course }: CourseHeroProps) {
  const img = resolveCourseImage(course);
  const studio = course.organization;
  const instructor = course.instructors[0] ?? course.instructor ?? null;
  const date = course.next_session?.session_date ?? course.start_date;
  const time = extractTime(course.time_schedule);
  const relativeDate = formatRelativeDate(date);
  const isSeries = course.course_type === 'course-series';

  // Date range — only meaningful for bounded series / online runs.
  const startShort = formatShortDate(course.start_date);
  const endShort = formatShortDate(course.end_date);
  const dateRange =
    (isSeries || course.course_type === 'online') && startShort && endShort
      ? `${startShort} – ${endShort}`
      : null;

  // Combined "I dag · kl. 17:30 (60 min)" — single home for next-session info
  // plus duration. "per gang" wording removed.
  let whenLabel = '';
  if (relativeDate && time) whenLabel = `${relativeDate} · kl. ${time}`;
  else if (relativeDate) whenLabel = relativeDate;
  else if (time) whenLabel = `kl. ${time}`;
  if (whenLabel && course.duration) whenLabel += ` (${course.duration} min)`;

  return (
    <header className="mx-auto max-w-6xl px-5 sm:px-8 pt-6 sm:pt-10">
      {/* Image — rounded-lg, 16:10 (cards are surfaces, not overlays) */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-muted">
        {img ? (
          <img
            src={img}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="size-12 text-disabled-foreground" />
          </div>
        )}
      </div>

      <div className="mt-8 sm:mt-10 max-w-3xl">
        {/* Quiet subtitle — studio link only */}
        {studio && (
          <p className="mb-3 text-sm text-muted-foreground">
            <Link
              to={`/studio/${studio.slug}`}
              className="text-foreground underline decoration-disabled-foreground underline-offset-2 hover:decoration-foreground"
            >
              {studio.name}
            </Link>
          </p>
        )}

        {/* Title — capped slightly tamer than before */}
        <h1 className="font-semibold tracking-tight text-foreground text-[clamp(1.75rem,4.5vw,3.25rem)] leading-[1.05]">
          {course.title}
        </h1>

        {/* Meta strip — date range, when + duration, instructor, level */}
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {dateRange && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-3.5" strokeWidth={1.75} />
              {dateRange}
            </span>
          )}
          {whenLabel && (
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Clock className="size-3.5" strokeWidth={1.75} />
              {whenLabel}
            </span>
          )}
          {(instructor?.name || studio?.name) && (
            <span className="inline-flex items-center gap-2">
              <UserAvatar
                size="xs"
                name={instructor?.name ?? studio?.name ?? null}
                src={instructor?.avatar_url ?? null}
                className="shrink-0"
              />
              <span>{instructor?.name ?? studio?.name}</span>
            </span>
          )}
          {course.level && (
            <Badge variant="sage" shape="pill" size="sm">
              {LEVEL_LABELS[course.level]}
            </Badge>
          )}
        </div>
      </div>
    </header>
  );
}
