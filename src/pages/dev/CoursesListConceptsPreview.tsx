import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users } from '@/lib/icons';
import { formatKroner } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, type CourseStatus } from '@/components/ui/status-badge';
import { MONTHS_SHORT } from '@/lib/calendar-nb';
import type { SessionScheduleRow } from '@/services/courses';
import type { CourseFormat, DeliveryMode } from '@/types/database';
import { routes } from '@/lib/routes';
import { MOCK_COURSES } from './CoursesListPreview';
import { DevPage, PreviewSection } from './_kit';

// Real catalogs are image-led (the builder pushes a course image), so the
// concepts render every non-draft course with one — the shared mocks only
// carry a few. Deterministic inline SVGs; the draft keeps the fallback.
function conceptThumb(hue: number): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='180'><rect width='240' height='180' fill='hsl(${hue} 26% 80%)'/><circle cx='185' cy='40' r='90' fill='hsl(${hue} 30% 71%)'/><circle cx='40' cy='160' r='70' fill='hsl(${hue} 28% 76%)'/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const CONCEPT_COURSES: SessionScheduleRow[] = MOCK_COURSES.map((c, i) => ({
  ...c,
  imageUrl: c.courseStatus === 'draft' ? null : c.imageUrl ?? conceptThumb((i * 47 + 15) % 360),
}));

/**
 * /dev/courses-list-concepts — TWO CANDIDATE DIRECTIONS for "Mine kurs",
 * replacing the table paradigm entirely. Throwaway concept code: nothing
 * here ships; the chosen direction gets a real implementation in
 * CourseListView. Not in the visual suite.
 *
 * Both drop column-header sorting on purpose: the list default-sorts by
 * next session, and search + tabs cover retrieval at realistic catalog
 * sizes (a studio has 5–20 courses, not 500). If sorting proves needed
 * later it comes back as a compact control, not a header row.
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

const WEEKDAYS_SHORT = ['søn.', 'man.', 'tir.', 'ons.', 'tor.', 'fre.', 'lør.'] as const;

function shortDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T12:00:00`);
  if (isNaN(d.getTime())) return null;
  return `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`;
}

function StatusPill({ courseStatus, isFull }: { courseStatus: string; isFull?: boolean }) {
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

// ─── Konsept A — filled row cards ───────────────────────────────────────
// Luma's row anatomy on the repo's ratified "item on white page" recipe:
// rounded-xl bg-muted fill, hover:bg-pressed, full text-foreground inside.
// No header row, no columns — metadata reads as icon+text pairs.

function RowCard({ course }: { course: SessionScheduleRow }) {
  const date = shortDate(course.sessionDate);
  const isFull =
    !!course.maxParticipants && course.signupsCount >= course.maxParticipants;
  const roster = course.maxParticipants
    ? `${course.signupsCount} / ${course.maxParticipants} påmeldte`
    : `${course.signupsCount} påmeldte`;

  return (
    <Link
      to={routes.course(course.courseId)}
      className="flex items-center gap-4 rounded-xl bg-muted p-4 no-underline transition-colors hover:bg-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {course.imageUrl ? (
        <img src={course.imageUrl} alt="" className="media-outline size-16 shrink-0 rounded-lg object-cover" />
      ) : (
        <div aria-hidden className="size-16 shrink-0 rounded-lg bg-surface" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-base font-medium text-foreground">{course.courseTitle}</h3>
          <StatusPill courseStatus={course.courseStatus} isFull={isFull} />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Calendar aria-hidden className="size-4" />
            {date ? (course.startTime ? `${date} · ${course.startTime}` : date) : typeLabel(course.courseFormat, course.deliveryMode)}
          </span>
          {course.location && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin aria-hidden className="size-4 shrink-0" />
              <span className="truncate">{course.location}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Users aria-hidden className="size-4" />
            {roster}
          </span>
        </div>
      </div>
      <span className="hidden shrink-0 text-base text-foreground tabular-nums sm:inline">
        {formatKroner(course.price)}
      </span>
    </Link>
  );
}

function ConceptARows() {
  return (
    <div className="flex flex-col gap-2">
      {CONCEPT_COURSES.map((c) => (
        <RowCard key={c.sessionId} course={c} />
      ))}
    </div>
  );
}

// ─── Konsept B — media grid ─────────────────────────────────────────────
// Airbnb-host anatomy, chromeless: 4:3 image tile, text stack under it.
// No card chrome at all — the image IS the card; text on the white page
// keeps the normal muted-meta hierarchy.

function GridTile({ course }: { course: SessionScheduleRow }) {
  const date = shortDate(course.sessionDate);
  const isFull =
    !!course.maxParticipants && course.signupsCount >= course.maxParticipants;
  const roster = course.maxParticipants
    ? `${course.signupsCount} / ${course.maxParticipants} påmeldte`
    : `${course.signupsCount} påmeldte`;

  return (
    <Link
      to={routes.course(course.courseId)}
      className="group block min-w-0 no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background rounded-lg"
    >
      {course.imageUrl ? (
        <img
          src={course.imageUrl}
          alt=""
          className="media-outline aspect-[4/3] w-full rounded-xl object-cover"
        />
      ) : (
        <div aria-hidden className="aspect-[4/3] w-full rounded-xl bg-muted" />
      )}
      <div className="mt-3 flex min-w-0 items-center gap-2">
        <h3 className="truncate text-base font-medium text-foreground">{course.courseTitle}</h3>
        <StatusPill courseStatus={course.courseStatus} isFull={isFull} />
      </div>
      <p className="mt-0.5 truncate text-sm text-foreground-muted">
        {typeLabel(course.courseFormat, course.deliveryMode)}
        {date ? ` · ${date}` : ''}
      </p>
      <p className="mt-1.5 flex items-baseline justify-between gap-2 text-sm text-foreground tabular-nums">
        <span>{formatKroner(course.price)}</span>
        <span>{roster}</span>
      </p>
    </Link>
  );
}

function ConceptBGrid() {
  return (
    <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
      {CONCEPT_COURSES.map((c) => (
        <GridTile key={c.sessionId} course={c} />
      ))}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────

export default function CoursesListConceptsPreview() {
  return (
    <DevPage
      title="Mine kurs — konsepter"
      description="To kandidat-retninger som erstatter tabell-paradigmet på /courses. Kast-kode: valgt retning bygges ordentlig i CourseListView etterpå. Begge dropper kolonnesortering med vilje — listen er standard-sortert på neste økt, og søk + faner dekker gjenfinning på realistiske katalogstørrelser."
    >
      <PreviewSection
        label="Konsept A — radkort"
        description="Luma-anatomi på repoets bg-muted-kortoppskrift: bilde, tittel + statuspill, ikon-metadata (neste økt, sted, påmeldte), pris ytterst. Ingen kolonneoverskrifter."
      >
        <ConceptARows />
      </PreviewSection>

      <PreviewSection
        label="Konsept B — kortgalleri"
        description="Airbnb-vert-anatomi, uten kortramme: 4:3-bilde er kortet, tekststakk under. Mest visuelle bruddet med tabell — belønner kursbilder, 2–3 kolonner."
      >
        <ConceptBGrid />
      </PreviewSection>
    </DevPage>
  );
}
