import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Calendar, ChevronLeft } from '@/lib/icons';
import { Badge } from '@/components/ui/badge';
import { BookingRailLite } from '@/components/public/course-details/BookingRailLite';
import type { PublicCourseWithDetails } from '@/services/publicCourses';
import type { CourseSession } from '@/types/database';

/**
 * Preview for the reworked course detail page. Built against the synthesis
 * spec at tasks/detail-research/00-synthesis.md:
 *  - Direct URL only (no overlay path)
 *  - 2-col with sticky right rail (matches checkout)
 *  - Small contained image in left column (4:3, max ~420px), graceful when missing
 *  - Big title + parenthetical level
 *  - Sessions inline preview (first 3 + "Se alle" expander)
 *  - Norwegian voice: "Meld deg på", "Med Karina", "Yoga Flow (alle nivåer)"
 */

type Variant = 'default' | 'no-image' | 'sold-out' | 'single' | 'free' | 'no-instructor';

const VARIANT_LABELS: Record<Variant, string> = {
  default: '8-ukers serie, bilde + lærer',
  'no-image': 'Uten bilde',
  'sold-out': 'Fullt',
  single: 'Enkelttime (workshop)',
  free: 'Gratis prøvetime',
  'no-instructor': 'Uten lærer-navn (fallback)',
};

const DetailReworkPreview = () => {
  const [variant, setVariant] = useState<Variant>('default');
  const course = useMemo(() => makeMockCourse(variant), [variant]);
  const courseLevel = useMemo(() => mockLevel(variant), [variant]);
  const instructorName = useMemo(() => mockInstructor(variant), [variant]);
  const sessions = useMemo(() => makeMockSessions(course.id, variant), [course.id, variant]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <DevBar variant={variant} onVariantChange={setVariant} />

      <header className="flex w-full items-center justify-center px-4 py-8 sm:px-6">
        <Link to="/" className="flex select-none items-center">
          <span className="text-base font-medium text-foreground">Openspot</span>
        </Link>
      </header>

      <div className="mx-auto max-w-5xl w-full px-4 sm:px-6 lg:px-8 pb-16">
        {course.seller && (
          <Link
            to={`/${course.seller.slug}`}
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
          >
            <ChevronLeft className="size-4" strokeWidth={1.75} />
            {course.seller.name}
          </Link>
        )}

        <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_320px] md:gap-6 md:items-start lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
          <div className="space-y-8 max-w-[640px] min-w-0">
            {/* Image (4:3, fills the left column) — graceful when missing */}
            {course.image_url && (
              <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
                <img src={course.image_url} alt="" className="size-full object-cover" />
              </div>
            )}

            {/* Title + level parenthetical */}
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {course.title}
              {courseLevel && (
                <span className="text-foreground-muted font-normal"> ({courseLevel})</span>
              )}
            </h1>

            {/* Meta strip */}
            <MetaStrip course={course} instructorName={instructorName} />

            {/* Om kurset */}
            {course.description && (
              <section>
                <h2 className="text-xl font-semibold tracking-tight text-foreground mb-3.5">
                  Om kurset
                </h2>
                <div className="text-base leading-relaxed text-foreground space-y-3">
                  {course.description.split('\n\n').map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>
            )}

            {/* Sessions inline preview (first 3 + expander) */}
            {sessions.length > 0 && course.format === 'series' && (
              <SessionsInline sessions={sessions} />
            )}

            {/* Location */}
            {course.location && (
              <section>
                <h2 className="text-xl font-semibold tracking-tight text-foreground mb-3.5">
                  Sted
                </h2>
                <p className="text-base text-foreground">{course.location}</p>
              </section>
            )}
          </div>

          <aside>
            <div className="md:sticky md:top-10">
              <BookingRailLite
                course={course}
                studioSlug="mock-studio"
                checkoutHref="/dev/checkout-form-rework"
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

// ── Sub-components ──────────────────────────────────────────────────────

const SHORT_WEEKDAYS = ['søn.', 'man.', 'tir.', 'ons.', 'tor.', 'fre.', 'lør.'] as const;
const WEEKDAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'] as const;
const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'] as const;
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const;

function MetaStrip({
  course,
  instructorName,
}: {
  course: PublicCourseWithDetails;
  instructorName: string | null;
}) {
  const time = extractTime(course.time_schedule);
  const startShort = formatShortDate(course.start_date);
  const endShort = formatShortDate(course.end_date);
  const isSeries = course.format === 'series';
  const dateRange = isSeries && startShort && endShort ? `${startShort} – ${endShort}` : null;

  const dateStr = course.next_session?.session_date ?? course.start_date;
  const relativeDate = formatRelativeDate(dateStr);
  let whenLabel = '';
  if (relativeDate && time) whenLabel = `${relativeDate} · kl. ${time}`;
  else if (relativeDate) whenLabel = relativeDate;
  else if (time) whenLabel = `kl. ${time}`;
  if (whenLabel && course.duration) whenLabel += ` (${course.duration} min)`;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-foreground-muted">
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
      {instructorName && (
        <Badge variant="neutral" shape="pill" size="sm">
          Med {instructorName}
        </Badge>
      )}
    </div>
  );
}

function SessionsInline({ sessions }: { sessions: CourseSession[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? sessions : sessions.slice(0, 3);
  const hidden = sessions.length - 3;

  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight text-foreground mb-3.5">
        Datoer
      </h2>
      <ul className="space-y-1.5 text-base text-foreground">
        {visible.map((s, i) => (
          <li key={s.id} className="flex items-baseline gap-3">
            <span className="text-foreground-muted tabular-nums w-8">{i + 1}.</span>
            <span>{formatFullDate(s.session_date)}</span>
            {s.start_time && (
              <span className="text-foreground-muted tabular-nums">kl. {s.start_time.slice(0, 5)}</span>
            )}
          </li>
        ))}
      </ul>
      {!expanded && hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-3 text-sm font-medium text-foreground-muted hover:text-foreground transition-colors"
        >
          Se alle {sessions.length} datoer
        </button>
      )}
    </section>
  );
}

function DevBar({ variant, onVariantChange }: { variant: Variant; onVariantChange: (v: Variant) => void }) {
  return (
    <div className="border-b border-border bg-muted/30">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-foreground-muted">Variant</span>
        <select
          value={variant}
          onChange={(e) => onVariantChange(e.target.value as Variant)}
          className="text-sm border border-border rounded-md px-2 py-1 bg-background"
        >
          {(Object.keys(VARIANT_LABELS) as Variant[]).map((v) => (
            <option key={v} value={v}>{VARIANT_LABELS[v]}</option>
          ))}
        </select>
        <Badge variant="neutral" shape="pill" size="sm">Detail rework</Badge>
        <span className="ml-auto text-xs text-foreground-muted">/dev/detail-rework</span>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function extractTime(timeSchedule: string | null): string {
  if (!timeSchedule) return '';
  const m = timeSchedule.match(/(\d{1,2}:\d{2})/);
  return m ? m[1] : '';
}

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
  return `${SHORT_WEEKDAYS[d.getDay()]} ${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`;
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

// ── Mock data ───────────────────────────────────────────────────────────

function mockLevel(variant: Variant): string | null {
  if (variant === 'free') return 'nybegynner';
  if (variant === 'single') return null; // single workshop doesn't need level
  return 'alle nivåer';
}

function mockInstructor(variant: Variant): string | null {
  if (variant === 'no-instructor') return null;
  return 'Karina';
}

function makeMockCourse(variant: Variant): PublicCourseWithDetails {
  const base: PublicCourseWithDetails = {
    id: 'mock-course',
    slug: 'vinyasa-flow',
    title: 'Vinyasa Flow',
    description:
      'Denne timen passer for deg som har praktisert vinyasa et halvår eller mer og er komfortabel med solhilsen og chaturanga. Vi jobber i et jevnt tempo, knytter pust til bevegelse, og holder noen posisjoner litt lenger underveis for å bygge styrke i skuldre, kjerne og hofter.\n\nForvent et par armbalanser og en topp-asana per time — vi bygger oss dit gjennom oppvarmingen, så ingenting kommer fra ingensteds. Avslutter med 8–10 minutter savasana. Ta med egen matte hvis du har en du liker, ellers finnes det matter i studio.',
    format: 'series',
    delivery_mode: 'in_person',
    status: 'active',
    location: 'InSPIRE Yogastudio · Sal 1, Akersgata 12, Oslo',
    location_lat: null,
    location_lon: null,
    location_place_id: null,
    time_schedule: '18:00-19:15',
    duration: 75,
    max_participants: 14,
    price: 1990,
    allows_drop_in: true,
    drop_in_price: 249,
    accepts_late_signups: true,
    total_weeks: 8,
    start_date: '2026-04-08',
    end_date: '2026-06-03',
    image_url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800',
    seller_id: 'mock',
    spots_available: 2,
    seller: {
      name: 'InSPIRE Yogastudio',
      slug: 'mock-studio',
      logo_url: null,
      stripe_onboarding_complete: true,
      uses_integrated_payments: true,
      default_course_image_url: null,
    },
    instructor_name: null,
    instructor: null,
    instructors: [],
    next_session: {
      session_date: '2026-04-08',
      session_number: 1,
      total_sessions: 8,
    },
    upcoming_session_dates: [],
  };

  switch (variant) {
    case 'no-image':
      return { ...base, image_url: null };
    case 'sold-out':
      return { ...base, spots_available: 0 };
    case 'single':
      return {
        ...base,
        format: 'single',
        total_weeks: null,
        end_date: null,
        title: 'Fullmåne-workshop',
        allows_drop_in: false,
        drop_in_price: null,
        price: 450,
        duration: 120,
      };
    case 'free':
      return {
        ...base,
        format: 'single',
        total_weeks: null,
        end_date: null,
        title: 'Gratis prøvetime',
        price: 0,
        allows_drop_in: false,
        drop_in_price: null,
        spots_available: 8,
        image_url: null,
      };
    case 'no-instructor':
      return { ...base };
    default:
      return base;
  }
}

function makeMockSessions(courseId: string, variant: Variant): CourseSession[] {
  if (variant === 'single' || variant === 'free') {
    return [{
      id: 's1',
      course_id: courseId,
      session_date: '2026-04-08',
      session_number: 1,
      start_time: '18:00',
      end_time: '20:00',
      status: 'upcoming',
      notes: null,
      created_at: null,
      updated_at: null,
    } satisfies CourseSession];
  }

  const start = new Date('2026-04-08');
  return Array.from({ length: 8 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i * 7);
    return {
      id: `s${i + 1}`,
      course_id: courseId,
      session_date: d.toISOString().split('T')[0],
      session_number: i + 1,
      start_time: '18:00',
      end_time: '19:15',
      status: 'upcoming',
      notes: null,
      created_at: null,
      updated_at: null,
    } satisfies CourseSession;
  });
}

export default DetailReworkPreview;
