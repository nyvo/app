import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { CoursesEmptyState } from '@/components/teacher/CoursesEmptyState';
import { CourseListView, CourseListSkeleton } from '@/components/teacher/CourseListView';
import type { SessionScheduleRow } from '@/services/courses';
import { DevPage, PreviewSection } from './_kit';

/**
 * /dev/courses-list-preview — every real state of the "Mine kurs" list
 * (`src/pages/teacher/CoursesPage.tsx` → `CourseListView`). No hand-rolled
 * markup: each section below mounts the shipped component/skeleton/empty
 * state exactly as the real page wires it up.
 */

// ─── Mock data ────────────────────────────────────────────────────────────
// Shape matches SessionScheduleRow (the real prop type for CourseListView).

// Deterministic inline-SVG thumbnails — no network fetch, so the visual
// suite's snapshots of this preview stay byte-stable.
function mockThumb(hue: number): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='96' height='96' fill='hsl(${hue} 28% 82%)'/><circle cx='70' cy='28' r='42' fill='hsl(${hue} 32% 72%)'/><circle cx='18' cy='84' r='30' fill='hsl(${hue} 30% 77%)'/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const MOCK_COURSES: SessionScheduleRow[] = [
  {
    sessionId: 'a',
    courseId: 'a',
    courseTitle: 'Vinyasa Flow',
    courseFormat: 'series',
    deliveryMode: 'in_person',
    sessionDate: '2026-05-20',
    startTime: '18:00',
    endTime: '19:15',
    location: 'InSPIRE Yogastudio · Sal 1',
    price: 1990,
    signupsCount: 11,
    maxParticipants: 14,
    courseStatus: 'active',
    courseStartDate: '2026-04-08',
    courseEndDate: '2026-05-27',
    totalWeeks: 8,
    imageUrl: mockThumb(165),
    allowsDropIn: true,
  },
  {
    sessionId: 'b',
    courseId: 'b',
    courseTitle: 'Yin & restitusjon',
    courseFormat: 'series',
    deliveryMode: 'in_person',
    sessionDate: '2026-05-17',
    startTime: '10:00',
    endTime: '11:30',
    location: 'InSPIRE Yogastudio · Sal 2',
    price: 2200,
    signupsCount: 12,
    maxParticipants: 12,
    courseStatus: 'active',
    courseStartDate: '2026-03-22',
    totalWeeks: 10,
    imageUrl: mockThumb(25),
  },
  {
    sessionId: 'c',
    courseId: 'c',
    courseTitle: 'Morgenflyt',
    courseFormat: 'series',
    deliveryMode: 'in_person',
    sessionDate: '2026-05-18',
    startTime: '06:45',
    endTime: '07:30',
    location: 'InSPIRE Yogastudio · Sal 1',
    price: 220,
    signupsCount: 4,
    maxParticipants: 10,
    courseStatus: 'active',
    courseStartDate: '2026-04-27',
    imageUrl: null,
    allowsDropIn: true,
  },
  {
    sessionId: 'd',
    courseId: 'd',
    courseTitle: 'Yoga for nybegynnere',
    courseFormat: 'series',
    deliveryMode: 'in_person',
    sessionDate: '2026-06-01',
    startTime: '18:00',
    endTime: '19:30',
    location: 'InSPIRE Yogastudio · Sal 2',
    price: 1490,
    signupsCount: 0,
    maxParticipants: 10,
    courseStatus: 'upcoming',
    courseStartDate: '2026-06-01',
    totalWeeks: 6,
    imageUrl: mockThumb(230),
  },
  {
    sessionId: 'e',
    courseId: 'e',
    courseTitle: 'Pust og pause',
    courseFormat: 'single',
    deliveryMode: 'in_person',
    sessionDate: '2026-06-06',
    startTime: '10:00',
    endTime: '13:00',
    location: 'InSPIRE Yogastudio · Sal 1',
    price: 1990,
    signupsCount: 4,
    maxParticipants: 12,
    courseStatus: 'upcoming',
    courseStartDate: '2026-06-06',
    imageUrl: null,
  },
  {
    sessionId: 'f',
    courseId: 'f',
    courseTitle: 'Hatha klassisk',
    courseFormat: 'series',
    deliveryMode: 'in_person',
    sessionDate: '',
    startTime: '',
    endTime: '',
    location: 'InSPIRE Yogastudio · Sal 1',
    price: 2200,
    signupsCount: 0,
    maxParticipants: 12,
    courseStatus: 'draft',
    courseStartDate: null,
    totalWeeks: 10,
    imageUrl: null,
  },
  {
    sessionId: 'online-1',
    courseId: 'online-1',
    courseTitle: 'Kveldsmeditasjon online',
    courseFormat: 'single',
    deliveryMode: 'online',
    sessionDate: '2026-05-19',
    startTime: '20:00',
    endTime: '20:30',
    location: 'Online',
    price: 150,
    signupsCount: 23,
    maxParticipants: null,
    courseStatus: 'active',
    courseStartDate: '2026-05-19',
    imageUrl: null,
  },
];

// The real page passes rows pre-sorted (next session ascending, drafts
// last) — mirror that so the preview reads like /courses does.
const SORTED_COURSES: SessionScheduleRow[] = [...MOCK_COURSES].sort((a, b) => {
  const byDraft = (a.courseStatus === 'draft' ? 1 : 0) - (b.courseStatus === 'draft' ? 1 : 0);
  if (byDraft !== 0) return byDraft;
  return a.sessionDate.localeCompare(b.sessionDate);
});

export default function CoursesListPreview() {
  return (
    <DevPage
      title="Mine kurs (kursliste)"
      description="Alle tilstandene til den ekte CourseListView-komponenten fra /courses — data, tomt, lasting, degraderte tellinger og feil. Ingen håndlaget markup; hver seksjon monterer den skipede komponenten slik CoursesPage gjør det."
    >
      <PreviewSection
        label="Med kurs"
        description="Radkort — bilde, tittel + statuspill, ikon-metadata (neste økt, sted, påmeldte), pris ytterst. Fast sortering på neste økt (utkast sist), som på /courses."
      >
        <CourseListView courses={SORTED_COURSES} />
      </PreviewSection>

      <PreviewSection
        label="Tomt — ingen kurs"
        description="courses={[]} + emptyState — samme CoursesEmptyState som første-gangs-tilstanden på /courses."
      >
        <CourseListView courses={[]} emptyState={<CoursesEmptyState />} />
      </PreviewSection>

      <PreviewSection
        label="Tomt — ingen treff på søk"
        description="emptyState er søkeresultat-varianten CoursesPage viser når et søkeord ikke gir treff."
      >
        <CourseListView
          courses={[]}
          emptyState={
            <EmptyState
              title="Fant ingen kurs for «yin»"
              description="Prøv et annet søkeord."
            />
          }
        />
      </PreviewSection>

      <PreviewSection label="Laster" description="Den ekte CourseListSkeleton — vises mens kurs hentes.">
        <div role="status" aria-live="polite" aria-label="Laster kurs">
          <span className="sr-only">Henter kurs</span>
          <CourseListSkeleton />
        </div>
      </PreviewSection>

      <PreviewSection
        label="Tellinger utilgjengelig"
        description="signup_counts-RPC-en feilet — påmeldte-metadataen viser «–» i stedet for et fabrikkert tall."
      >
        <CourseListView courses={SORTED_COURSES} countsUnavailable />
      </PreviewSection>

      <PreviewSection
        label="Feil"
        description="Kurs-henting feilet — ErrorState med retry, samme som CoursesPage viser på load-feil."
      >
        <ErrorState
          title="Kunne ikke hente kurs"
          message="Sjekk nettforbindelsen."
          onRetry={() => {}}
        />
      </PreviewSection>
    </DevPage>
  );
}
