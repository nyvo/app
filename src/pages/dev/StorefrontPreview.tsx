import { useState } from 'react';
import { DevPage, PreviewSection } from './_kit';
import { PageState } from '@/components/page-state/page-state';
import { Skeleton } from '@/components/ui/skeleton';
import { StudioMasthead } from '@/components/public/studio/StudioMasthead';
import { StudioAgendaList } from '@/components/public/studio/StudioAgendaList';
import { StudioFilterPill } from '@/components/public/studio/StudioFilterPill';
import type { StudioLocation } from '@/components/public/studio/studioFacts';
import type { PublicCourseWithDetails } from '@/services/publicCourses';
import type { PublicSeller } from '@/services/sellers';

/**
 * /dev/storefront-preview — every real state of the public studio storefront
 * (`/:slug` → `src/pages/public/PublicCoursesPage.tsx`). No hand-rolled
 * markup: each section mounts the shipped `StudioMasthead` / `StudioAgendaList`
 * / `StudioFilterPill` / `PageState` exactly as the real page wires them up.
 * See `.context/dev-audit/live-surfaces.md` ("Storefront (studio page)" row).
 */

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-background">
      {children}
    </div>
  );
}

// ─── Mock data ────────────────────────────────────────────────────────────
// Shapes match `PublicSeller` (src/services/sellers.ts) and
// `PublicCourseWithDetails` (src/services/publicCourses.ts) — the real prop
// types `StudioMasthead` / `StudioAgendaList` expect. Both are already
// public-safe view types (not raw DB rows), so plain typed literals are
// enough — no `as unknown as` needed here.

const MOCK_SELLER: PublicSeller = {
  id: 'mock-seller',
  name: 'Fjell Yoga Oslo',
  slug: 'fjellyoga',
  logo_url: null,
  cover_image_url: null,
  default_course_image_url: null,
  stripe_onboarding_complete: true,
};

const MOCK_LOCATION: StudioLocation = {
  label: 'Fjell Yoga Oslo',
  address: 'Thorvald Meyers gate 45, 0555 Oslo',
  lat: null,
  lon: null,
  placeId: null,
};

const MOCK_SELLER_EMBED = {
  name: MOCK_SELLER.name,
  slug: MOCK_SELLER.slug,
  logo_url: null,
  stripe_onboarding_complete: true,
  default_course_image_url: null,
  student_discount_percent: null,
    senior_discount_percent: null,
};

// Exported for the landing-page storefront shot (LandingShotStorefrontPreview).
export const MOCK_COURSES: PublicCourseWithDetails[] = [
  // Series with a cheaper drop-in tier — shows the "fra <pris>" price row.
  {
    id: 'mock-yoga-series',
    slug: 'yoga-for-nybegynnere',
    title: 'Yoga for nybegynnere',
    description: 'Rolig innføring i grunnstillingene — ingen erfaring nødvendig.',
    format: 'series',
    delivery_mode: 'in_person',
    status: 'active',
    location: 'Fjell Yoga Oslo, Thorvald Meyers gate 45',
    location_lat: null,
    location_lon: null,
    location_place_id: null,
    time_schedule: '18:00-19:30',
    duration: 90,
    max_participants: 15,
    price: 2200,
    allows_drop_in: true,
    drop_in_price: 250,
    total_weeks: 8,
    start_date: '2026-08-11',
    end_date: '2026-09-29',
    image_url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800',
    instructor_name: 'Ingrid Larsen',
    accepts_late_signups: true,
    seller_id: 'mock-seller',
    spots_available: 6,
    seller: MOCK_SELLER_EMBED,
    instructor: { id: 'mock-yoga-series:primary', name: 'Ingrid Larsen', role: 'primary', display_order: 0 },
    instructors: [
      { id: 'mock-yoga-series:primary', name: 'Ingrid Larsen', role: 'primary', display_order: 0 },
    ],
    next_session: { session_date: '2026-08-11', session_number: 1, total_sessions: 8 },
    upcoming_session_dates: [],
  },
  // Two-day single workshop, sold out — shows the "Fullt" CTA + "2 dager".
  {
    id: 'mock-workshop',
    slug: 'helgeworkshop-yin-og-pust',
    title: 'Helgeworkshop: Yin og pust',
    description: 'En rolig helg med yin-yoga og pustøvelser. Passer for alle nivåer.',
    format: 'single',
    delivery_mode: 'in_person',
    status: 'active',
    location: 'Fjell Yoga Oslo, Thorvald Meyers gate 45',
    location_lat: null,
    location_lon: null,
    location_place_id: null,
    time_schedule: '10:00-15:00',
    duration: 300,
    max_participants: 12,
    price: 450,
    allows_drop_in: false,
    drop_in_price: null,
    total_weeks: null,
    start_date: '2026-08-15',
    end_date: '2026-08-16',
    image_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
    instructor_name: 'Marte Nystrøm',
    accepts_late_signups: true,
    seller_id: 'mock-seller',
    spots_available: 0,
    seller: { ...MOCK_SELLER_EMBED },
    instructor: { id: 'mock-workshop:primary', name: 'Marte Nystrøm', role: 'primary', display_order: 0 },
    instructors: [
      { id: 'mock-workshop:primary', name: 'Marte Nystrøm', role: 'primary', display_order: 0 },
    ],
    next_session: null,
    upcoming_session_dates: [],
  },
  // Online drop-in — shows delivery_mode 'online' + "Nettkurs" sub-label.
  {
    id: 'mock-online',
    slug: 'nettkurs-pilates',
    title: 'Nettkurs: Pilates hjemme',
    description: 'Kort morgenøkt du kan følge hjemmefra.',
    format: 'single',
    delivery_mode: 'online',
    status: 'active',
    location: null,
    location_lat: null,
    location_lon: null,
    location_place_id: null,
    time_schedule: '07:00-07:45',
    duration: 45,
    max_participants: null,
    price: 149,
    allows_drop_in: true,
    drop_in_price: 99,
    total_weeks: null,
    start_date: '2026-08-12',
    end_date: null,
    image_url: null,
    instructor_name: 'Kine Berg',
    accepts_late_signups: true,
    seller_id: 'mock-seller',
    spots_available: 40,
    seller: { ...MOCK_SELLER_EMBED },
    instructor: { id: 'mock-online:primary', name: 'Kine Berg', role: 'primary', display_order: 0 },
    instructors: [{ id: 'mock-online:primary', name: 'Kine Berg', role: 'primary', display_order: 0 }],
    next_session: null,
    upcoming_session_dates: [],
  },
  // Series already underway, late signups + drop-in both off — shows "Stengt".
  {
    id: 'mock-closed-series',
    slug: 'styrke-for-viderekomne',
    title: 'Styrke for viderekomne',
    description: 'Pågående kurs — påmelding er stengt etter kursstart.',
    format: 'series',
    delivery_mode: 'in_person',
    status: 'active',
    location: 'Fjell Yoga Oslo, Thorvald Meyers gate 45',
    location_lat: null,
    location_lon: null,
    location_place_id: null,
    time_schedule: '17:00-18:00',
    duration: 60,
    max_participants: 10,
    price: 2400,
    allows_drop_in: false,
    drop_in_price: null,
    total_weeks: 10,
    start_date: '2026-06-01',
    end_date: '2026-08-10',
    image_url: null,
    instructor_name: 'Ingrid Larsen',
    accepts_late_signups: false,
    seller_id: 'mock-seller',
    spots_available: 2,
    seller: { ...MOCK_SELLER_EMBED },
    instructor: { id: 'mock-closed-series:primary', name: 'Ingrid Larsen', role: 'primary', display_order: 0 },
    instructors: [
      { id: 'mock-closed-series:primary', name: 'Ingrid Larsen', role: 'primary', display_order: 0 },
    ],
    next_session: { session_date: '2026-08-13', session_number: 8, total_sessions: 10 },
    upcoming_session_dates: [],
  },
  // Cancelled — shows the inert (non-link), dimmed "Avlyst" row.
  {
    id: 'mock-cancelled',
    slug: 'styrke-og-smidighet',
    title: 'Styrke og smidighet',
    description: 'Avlyst — instruktøren er syk.',
    format: 'single',
    delivery_mode: 'in_person',
    status: 'cancelled',
    location: 'Fjell Yoga Oslo, Thorvald Meyers gate 45',
    location_lat: null,
    location_lon: null,
    location_place_id: null,
    time_schedule: '19:00-20:00',
    duration: 60,
    max_participants: 10,
    price: 300,
    allows_drop_in: false,
    drop_in_price: null,
    total_weeks: null,
    start_date: '2026-08-20',
    end_date: null,
    image_url: null,
    instructor_name: 'Ingrid Larsen',
    accepts_late_signups: true,
    seller_id: 'mock-seller',
    spots_available: 4,
    seller: { ...MOCK_SELLER_EMBED },
    instructor: { id: 'mock-cancelled:primary', name: 'Ingrid Larsen', role: 'primary', display_order: 0 },
    instructors: [
      { id: 'mock-cancelled:primary', name: 'Ingrid Larsen', role: 'primary', display_order: 0 },
    ],
    next_session: null,
    upcoming_session_dates: [],
  },
];

type MockTypeFilter = 'all' | 'series' | 'single';

/**
 * "Med kurs" — masthead + a real, wired `StudioFilterPill` + agenda, same
 * composition as `PublicCoursesPage`: filter state lives on the page, the
 * pill is a controlled child. Filters on `format` only (a simplified stand-in
 * for the real page's series/workshop/drop-in/online split) so the control
 * isn't decorative.
 */
function WithCoursesSection() {
  const [typeFilter, setTypeFilter] = useState<MockTypeFilter>('all');
  const filteredCourses =
    typeFilter === 'all' ? MOCK_COURSES : MOCK_COURSES.filter((course) => course.format === typeFilter);

  return (
    <Frame>
      <StudioMasthead organization={MOCK_SELLER} location={MOCK_LOCATION} />
      <div className="px-4 pb-8 pt-6 sm:px-6">
        <div className="mb-2">
          <StudioFilterPill
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: 'all', label: 'Alle kurstyper' },
              { value: 'series', label: 'Kursrekker' },
              { value: 'single', label: 'Enkeltarrangementer' },
            ]}
            ariaLabel="Filtrer på kurstype"
          />
        </div>
        <StudioAgendaList
          courses={filteredCourses}
          viewingSlug={MOCK_SELLER.slug}
          viewingName={MOCK_SELLER.name}
        />
      </div>
    </Frame>
  );
}

/**
 * The real loading state PublicCoursesPage renders (behind a `DelayedFallback`
 * in production) is a private, unexported `StudioPageSkeleton` function
 * declared inside `src/pages/public/PublicCoursesPage.tsx`. It can't be
 * imported without exporting it from that file, which is out of scope here —
 * copied verbatim (same `Skeleton` primitives, same layout) instead of
 * re-imagined. Keep this in sync if the source skeleton changes.
 */
function StudioPageSkeleton() {
  return (
    <div className="animate-in fade-in duration-150" role="status" aria-live="polite">
      <span className="sr-only">Laster…</span>
      <div className="h-32 sm:h-44 w-full bg-muted" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Skeleton className="relative -mt-9 size-18 rounded-full border-[3px] border-background" />
        <Skeleton className="mt-4 h-7 w-56 max-w-full" />
        <Skeleton className="mt-2.5 h-4 w-72 max-w-full" />
        <div className="pt-8">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-32 rounded-full" />
            <Skeleton className="h-8 w-36 rounded-full" />
          </div>
          <div className="pt-6">
            <Skeleton className="h-5 w-44" />
            <div className="divide-y divide-border-subtle pt-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-4">
                  <div className="w-14 shrink-0 space-y-1.5">
                    <Skeleton className="h-4 w-11" />
                    <Skeleton className="h-3.5 w-12" />
                  </div>
                  <Skeleton className="size-16 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-48 max-w-full" />
                    <Skeleton className="h-3.5 w-64 max-w-full" />
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-8 w-20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StorefrontPreview() {
  return (
    <DevPage
      title="Storefront (offentlig studio)"
      description="Alle tilstandene til den offentlige studiosiden (/:slug) — StudioMasthead, StudioFilterPill og StudioAgendaList med data, tomt, lasting, ikke-funnet og feil. Ingen håndlaget markup; hver seksjon monterer de ekte komponentene slik PublicCoursesPage.tsx gjør det."
    >
      <PreviewSection
        label="Med kurs"
        description="Kursrekke med fra-pris, utsolgt enkeltverksted, nettkurs, en stengt kursrekke og et avlyst kurs — filteret over lista er en ekte, koblet StudioFilterPill."
      >
        <WithCoursesSection />
      </PreviewSection>

      <PreviewSection
        label="Tomt — ingen publiserte kurs"
        description="StudioAgendaList courses={[]} rendrer ingenting selv — den tekstlige tomme-teksten («Ingen planlagte kurs») ligger i PublicCoursesPage ett nivå opp, ikke i denne komponenten."
      >
        <Frame>
          <StudioMasthead organization={MOCK_SELLER} location={MOCK_LOCATION} />
          <div className="px-4 pb-8 pt-6 sm:px-6">
            <StudioAgendaList courses={[]} viewingSlug={MOCK_SELLER.slug} viewingName={MOCK_SELLER.name} />
          </div>
        </Frame>
      </PreviewSection>

      <PreviewSection
        label="Laster"
        description="Skjelett-tilstanden PublicCoursesPage viser mens studio og kurs hentes (bak DelayedFallback i produksjon, vist direkte her)."
      >
        <Frame>
          <StudioPageSkeleton />
        </Frame>
      </PreviewSection>

      <PreviewSection
        label="Ikke funnet (ukjent studio)"
        description="Slug matcher ingen selger — PageState variant=«public-team»."
      >
        <Frame>
          <PageState variant="public-team" as="div" />
        </Frame>
      </PreviewSection>

      <PreviewSection
        label="Feil"
        description="Henting av selger eller kurs feilet — PageState variant=«server-error»."
      >
        <Frame>
          <PageState variant="server-error" as="div" />
        </Frame>
      </PreviewSection>
    </DevPage>
  );
}
