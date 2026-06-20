import { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { CourseHero } from '@/components/public/course-details/CourseHero';
import { LocationCard } from '@/components/public/course-details/LocationCard';
import { CourseSessions } from '@/components/public/course-details/CourseSessions';
import { BookingRailLite } from '@/components/public/course-details/BookingRailLite';
import { RichTextContent } from '@/components/ui/rich-text-content';
import type { PublicCourseWithDetails } from '@/services/publicCourses';
import type { CourseSession } from '@/types/database';

/**
 * Preview surface for the checkout flow rework. Renders the new course
 * detail page with the lightened BookingRailLite — no form, just a price
 * card that routes to /:slug/:courseSlug/pamelding. Mock data only; no
 * Supabase / Dintero calls so the page works without network.
 *
 * Variants in the dropdown switch the mock scenario:
 *  - default: 8-week series, drop-in active, 2 spots left
 *  - sold-out: spots_available = 0
 *  - single: format='single', no drop-in
 *  - free: price = 0 (gratis prøvetime)
 */

type Variant = 'default' | 'sold-out' | 'single' | 'free';

const VARIANT_LABELS: Record<Variant, string> = {
  default: 'Standard — 8-ukers serie, drop-in på, 2 plasser igjen',
  'sold-out': 'Fullt — 0 plasser igjen',
  single: 'Enkelttime — uten drop-in',
  free: 'Gratis prøvetime',
};

const CheckoutReworkPreview = () => {
  const [variant, setVariant] = useState<Variant>('default');
  const course = useMemo(() => makeMockCourse(variant), [variant]);
  const sessions = useMemo(() => makeMockSessions(course.id), [course.id]);

  const showDatesAccordion = course.format === 'series' && sessions.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Dev-only variant switcher — never shipped */}
      <div className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-8 py-3 flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-foreground-muted">Variant</span>
          <select
            value={variant}
            onChange={(e) => setVariant(e.target.value as Variant)}
            className="text-sm border border-border rounded-md px-2 py-1 bg-background"
          >
            {(Object.keys(VARIANT_LABELS) as Variant[]).map((v) => (
              <option key={v} value={v}>{VARIANT_LABELS[v]}</option>
            ))}
          </select>
          <span className="ml-auto text-xs text-foreground-muted">
            /dev/checkout-rework
          </span>
        </div>
      </div>

      <main>
        <CourseHero course={course} />

        <div className="mx-auto max-w-6xl px-4 sm:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
            <div className="flex flex-col gap-14 max-w-[640px] min-w-0">
              {course.description && (
                <section>
                  <h2 className="text-xl font-semibold tracking-tight text-foreground mb-3.5">
                    Om kurset
                  </h2>
                  <RichTextContent
                    html={course.description}
                    className="text-base leading-relaxed text-foreground"
                  />
                </section>
              )}

              {/* Mobile booking — inline under description */}
              <div className="lg:hidden">
                <BookingRailLite course={course} studioSlug="mock-studio" checkoutHref="/dev/checkout-form-rework" />
              </div>

              {showDatesAccordion && (
                <Accordion type="single" collapsible className="rounded-xl border border-border bg-surface">
                  <AccordionItem value="dates" className="not-last:border-b-0">
                    <AccordionTrigger className="px-4 py-3.5 text-base font-medium items-center hover:no-underline">
                      <div className="flex flex-1 items-center justify-between mr-3">
                        <span className="text-foreground">Alle datoer</span>
                        <span className="text-sm font-medium text-foreground-muted tabular-nums">
                          {sessions.length} ganger
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <CourseSessions sessions={sessions} />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}

              {course.location && (
                <section>
                  <LocationCard location={course.location} />
                </section>
              )}
            </div>

            <aside className="hidden lg:block">
              <div className="sticky top-10">
                <BookingRailLite course={course} studioSlug="mock-studio" checkoutHref="/dev/checkout-form-rework" />
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
};

function makeMockCourse(variant: Variant): PublicCourseWithDetails {
  const base: PublicCourseWithDetails = {
    id: 'mock-course',
    slug: 'vinyasa-flow',
    title: 'Vinyasa Flow',
    description:
      '<p>Denne timen passer for deg som har praktisert vinyasa et halvår eller mer og er komfortabel med solhilsen og chaturanga. Vi jobber i et jevnt tempo, knytter pust til bevegelse, og holder noen posisjoner litt lenger underveis for å bygge styrke i skuldre, kjerne og hofter.</p><p>Forvent et par armbalanser og en topp-asana per time — vi bygger oss dit gjennom oppvarmingen, så ingenting kommer fra ingensteds. Avslutter med 8–10 minutter savasana. Ta med egen matte hvis du har en du liker, ellers finnes det matter i studio.</p>',
    format: 'series',
    delivery_mode: 'in_person',
    status: 'active',
    location: 'InSPIRE Yogastudio · Sal 1',
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
    image_url: null,
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
      };
    default:
      return base;
  }
}

function makeMockSessions(courseId: string): CourseSession[] {
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

export default CheckoutReworkPreview;
