import { useState } from 'react';
import { StudioMasthead } from '@/components/public/studio/StudioMasthead';
import { StudioAgendaList } from '@/components/public/studio/StudioAgendaList';
import { StudioFilterPill } from '@/components/public/studio/StudioFilterPill';
import type { StudioLocation } from '@/components/public/studio/studioFacts';
import type { PublicSeller } from '@/services/sellers';
import { MOCK_COURSES } from './StorefrontPreview';
// Course photos: Pexels (free license, no attribution) — picked over the
// heavily recycled Unsplash defaults. pexels-photo-3822668 / -8437076,
// downscaled to 480px webp by scripts/… (one-off; re-run sharp if replaced).
import yogaClassImg from './assets/landing-shot-yoga-class.webp';
import pilatesGroupImg from './assets/landing-shot-pilates-group.webp';

/**
 * `/dev/landing-shot-storefront` — the STAGED SOURCE for the landing page's
 * storefront screenshot (public/landing-storefront.webp). Mounts the real
 * public-storefront components (StudioMasthead / StudioFilterPill /
 * StudioAgendaList) exactly as PublicCoursesPage wires them, branded as the
 * same fictional "Flyt Studio" as the dashboard hero shot.
 *
 * Capture with: `node scripts/capture-landing-hero.mjs --shot storefront`.
 * Course dates come from StorefrontPreview's mocks (hardcoded Aug 2026) —
 * if a re-capture ever shows an empty agenda, bump those dates first.
 */

// Minimal generated mark for the fictional studio: two flowing waves
// ("flyt" = flow) on an ink tile. Inlined as a data URI so no asset ships
// in public/ for a dev-only preview.
const FLYT_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
  <rect width="72" height="72" fill="#1F2124"/>
  <path d="M16 31 Q26 21 36 31 T56 31" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M16 43 Q26 33 36 43 T56 43" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.55"/>
</svg>`;

const FLYT_LOGO_URL = `data:image/svg+xml,${encodeURIComponent(FLYT_LOGO_SVG)}`;

const FLYT_SELLER: PublicSeller = {
  id: 'landing-shot-flyt',
  name: 'Flyt Studio',
  slug: 'flytstudio',
  logo_url: FLYT_LOGO_URL,
  cover_image_url: null,
  default_course_image_url: null,
  stripe_onboarding_complete: true,
};

const FLYT_LOCATION: StudioLocation = {
  // Venue label deliberately differs from the studio name — the masthead
  // renders both, and name twice in a row reads broken in the shot.
  label: 'Grünerløkka',
  address: 'Markveien 12, 0554 Oslo',
  lat: null,
  lon: null,
  placeId: null,
};

const FLYT_COURSES = MOCK_COURSES.map((course) => {
  const rebranded = {
    ...course,
    location: course.location ? 'Flyt Studio, Markveien 12' : null,
    // The agenda's thumbnail column is all-or-none (StudioAgendaList): every
    // course needs a resolvable image or the whole list drops to text rows.
    // The two local webp shots cover the imageless mocks too so the marketing
    // capture keeps the photo grammar.
    image_url:
      course.id === 'mock-yoga-series' || course.id === 'mock-closed-series'
        ? yogaClassImg
        : course.id === 'mock-online' || course.id === 'mock-cancelled'
          ? pilatesGroupImg
          : course.image_url,
  };
  // The product doesn't support online courses (yet) — rebrand the mock
  // nettkurs as a regular in-person morning class so the marketing shot
  // only shows things we actually do.
  if (course.id === 'mock-online') {
    return {
      ...rebranded,
      title: 'Morgenpilates',
      slug: 'morgenpilates',
      description: 'Kort morgenøkt med fokus på kjerne og pust.',
      delivery_mode: 'in_person' as const,
      location: 'Flyt Studio, Markveien 12',
    };
  }
  return rebranded;
});

type TypeFilter = 'all' | 'series' | 'single';

export default function LandingShotStorefrontPreview() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const courses =
    typeFilter === 'all'
      ? FLYT_COURSES
      : FLYT_COURSES.filter((course) => course.format === typeFilter);

  return (
    <div className="min-h-dvh bg-background">
      <StudioMasthead organization={FLYT_SELLER} location={FLYT_LOCATION} />
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-6 sm:px-6 lg:px-8">
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
          courses={courses}
          viewingSlug={FLYT_SELLER.slug}
          viewingName={FLYT_SELLER.name}
        />
      </div>
    </div>
  );
}
