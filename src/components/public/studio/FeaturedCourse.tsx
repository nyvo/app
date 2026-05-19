import { Link } from 'react-router-dom';
import { ImageIcon, MapPin, User, Clock, Star } from '@/lib/icons';
import { Badge } from '@/components/ui/badge';
import { cn, formatCoursePrice } from '@/lib/utils';
import { htmlToPlainText } from '@/components/ui/rich-text-content';
import { resolveCourseImage, type PublicCourseWithDetails } from '@/services/publicCourses';

interface FeaturedCourseProps {
  course: PublicCourseWithDetails;
  /** Viewing storefront — carried as state so the detail back-link returns
   * here even in syndicated cases. */
  viewingSlug?: string;
  viewingName?: string | null;
}

const WEEKDAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'] as const;
const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'] as const;

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

/**
 * Cinema-card. Big, image-led feature for the most prominent next course.
 * On mobile: vertical stack, image on top. On md+: split half/half.
 * Featured is signaled by a lavender "Fremhevet kurs" badge inside the card.
 */
export function FeaturedCourse({ course, viewingSlug, viewingName }: FeaturedCourseProps) {
  const studioSlug = course.seller?.slug ?? '';
  const img = resolveCourseImage(course);
  const date = course.next_session?.session_date ?? course.start_date;
  const time = extractTime(course.time_schedule);
  const longDate = formatLongDate(date);
  const instructor = course.instructors[0]?.name ?? course.instructor?.name ?? null;
  const isSeries = course.format === 'series';
  const isFull = course.max_participants !== null && course.spots_available <= 0;

  return (
    <Link
      to={`/${studioSlug}/${course.slug}`}
      state={{ fromSlug: viewingSlug ?? studioSlug, fromName: viewingName ?? course.seller?.name ?? null }}
      className={cn(
        'group relative grid overflow-hidden rounded-xl bg-surface outline-none',
        'ring-1 ring-border transition-all duration-300',
        'hover:ring-foreground',
        'focus-visible:ring-2 focus-visible:ring-ring',
        'md:grid-cols-2',
      )}
    >
      {/* Featured badge — inverted pill for "earned" emphasis, sentence case */}
      <Badge variant="inverted" size="sm" className="absolute top-4 left-4 z-10">
        <Star className="size-3" fill="currentColor" strokeWidth={0} />
        Fremhevet kurs
      </Badge>

      {/* Image */}
      <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[440px] overflow-hidden bg-muted">
        {img ? (
          <img
            src={img}
            alt=""
            className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="size-10 text-foreground-disabled" />
          </div>
        )}
        {/* Subtle right-side scrim on desktop to soften seam with the content panel */}
        <div className="hidden md:block absolute inset-y-0 right-0 w-1/3 bg-gradient-to-r from-transparent to-background" />
      </div>

      {/* Content */}
      <div className="relative flex flex-col justify-between gap-8 p-6 sm:p-10">
        <div className="space-y-6">
          {/* When line — single tier, sentence case, tabular */}
          {longDate && (
            <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground tabular-nums">
              <span className="size-1.5 rounded-full bg-success" />
              {longDate}
              {time && (
                <>
                  <span className="text-foreground-disabled">·</span>
                  <span>kl. {time}</span>
                </>
              )}
            </div>
          )}

          {/* Display title */}
          <h3 className="font-semibold text-foreground text-3xl leading-tight tracking-tight sm:text-5xl">
            {course.title}
          </h3>

          {/* Subtitle — descriptions may now contain HTML from the editor,
              but the teaser is line-clamped, so strip tags to plain text. */}
          {course.description && (
            <p className="text-base text-foreground-muted leading-relaxed line-clamp-3 max-w-prose">
              {htmlToPlainText(course.description)}
            </p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-foreground-muted pt-2">
            {instructor && (
              <span className="inline-flex items-center gap-1.5">
                <User className="size-3.5" strokeWidth={1.75} />
                {instructor}
              </span>
            )}
            {course.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" strokeWidth={1.75} />
                {course.location}
              </span>
            )}
            {(isSeries && course.total_weeks) || course.duration ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" strokeWidth={1.75} />
                {isSeries && course.total_weeks ? `${course.total_weeks} uker` : formatDuration(course.duration)}
              </span>
            ) : null}
          </div>
        </div>

        {/* CTA / price row */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-border">
          <div className="space-y-0.5">
            <div className="text-2xl font-semibold text-foreground tabular-nums">
              {formatCoursePrice(course.price)}
            </div>
            {isSeries && course.total_weeks && (
              <div className="text-xs text-foreground-muted">for hele rekken</div>
            )}
          </div>
          {/* Visual-only — the whole card is the Link, so the button can't be a real <button> */}
          <span
            className={cn(
              'inline-flex items-center rounded-full bg-primary text-primary-foreground',
              'h-10 px-6 text-sm font-medium',
              'transition-transform duration-300 group-hover:translate-x-0.5',
              isFull && 'bg-muted text-foreground-muted',
            )}
          >
            {isFull ? 'Fullt' : 'Se kurset'}
          </span>
        </div>
      </div>
    </Link>
  );
}
