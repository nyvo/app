import { ImageIcon, User, Clock, Calendar } from '@/lib/icons';
import { resolveCourseImage, type PublicCourseWithDetails } from '@/services/publicCourses';

const WEEKDAYS = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'] as const;
const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'] as const;
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const;

function formatShortDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`;
}

function formatLongDate(dateStr: string | null): string {
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

function formatDuration(duration: number | null): string {
  if (!duration) return '';
  if (duration < 60) return `${duration} min`;
  const h = Math.floor(duration / 60);
  const m = duration % 60;
  return m === 0 ? `${h} t` : `${h} t ${m} min`;
}

interface CourseHeroProps {
  course: PublicCourseWithDetails;
}

/**
 * Editorial hero — image lives inside the page container at a fixed
 * aspect ratio (16:10 mobile, 21:9 desktop), title + meta drop below as
 * dark text on the page surface. Image never stretches past container
 * width, so quality stays consistent at any viewport size.
 */
export function CourseHero({ course }: CourseHeroProps) {
  const img = resolveCourseImage(course);
  const date = course.next_session?.session_date ?? course.start_date;
  const time = extractTime(course.time_schedule);
  const longDate = formatLongDate(date);
  const instructor = course.instructors[0]?.name ?? course.instructor?.name ?? null;
  const isSeries = course.course_type === 'course-series';

  // Date range for series / online — bounds the commitment window.
  const startShort = formatShortDate(course.start_date);
  const endShort = formatShortDate(course.end_date);
  const dateRange =
    isSeries || course.course_type === 'online'
      ? startShort && endShort
        ? `${startShort} – ${endShort}`
        : null
      : null;

  return (
    <header className="mx-auto max-w-6xl px-5 sm:px-8 pt-6 sm:pt-10">
      {/* Image */}
      <div className="relative aspect-[16/10] sm:aspect-[21/9] w-full overflow-hidden rounded-2xl bg-muted">
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

      {/* Title block */}
      <div className="mt-8 sm:mt-10 max-w-3xl">
        {/* Eyebrow */}
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium tracking-[0.14em] uppercase text-muted-foreground">
          {course.organization && (
            <span className="text-foreground">{course.organization.name}</span>
          )}
          {longDate && (
            <>
              <span className="text-disabled-foreground">/</span>
              <span>
                {longDate}
                {time && (
                  <>
                    <span className="text-disabled-foreground mx-1.5">·</span>
                    <span className="tabular-nums">kl. {time}</span>
                  </>
                )}
              </span>
            </>
          )}
        </div>

        {/* Title */}
        <h1 className="font-semibold tracking-tight text-foreground text-[clamp(1.75rem,5vw,3.5rem)] leading-[1.05]">
          {course.title}
        </h1>

        {/* Meta strip */}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {instructor && (
            <span className="inline-flex items-center gap-1.5">
              <User className="size-3.5" strokeWidth={1.75} />
              {instructor}
            </span>
          )}
          {dateRange && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-3.5" strokeWidth={1.75} />
              {dateRange}
            </span>
          )}
          {(isSeries && course.total_weeks) || course.duration ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" strokeWidth={1.75} />
              {isSeries && course.total_weeks
                ? `${course.total_weeks} uker`
                : formatDuration(course.duration)}
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
