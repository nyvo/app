import { useMemo } from 'react';
import { EmbedCalendar } from '@/components/public/embed/EmbedCalendar';
import type { PublicCourseWithDetails } from '@/services/publicCourses';
import { DevPage, PreviewSection } from './_kit';

/**
 * Preview of the embeddable calendar widget (/embed/:slug) at two iframe
 * widths, so we can judge how the layout holds up narrow vs wide. Inline
 * mock data — no auth, no database. Also covers the widget's load-failed
 * text state, copied verbatim from EmbedCalendarPage's `errorKind ===
 * 'load-failed'` branch (there's no shared error component for this surface —
 * the real page renders this exact paragraph).
 */
const EmbedPreview = () => {
  const courses = useMemo<PublicCourseWithDetails[]>(() => makeMockCourses(), []);

  return (
    <DevPage
      title="Embed-kalender (widget)"
      description="EmbedCalendar-widgeten (/embed/:slug) rendret med mock-data ved to iframe-bredder. Kursradene lenker ut (ny fane) til kurssiden."
    >
      <PreviewSection label="760px (horisontal)">
        <div className="rounded-lg border border-dashed border-border p-4 w-[760px] max-w-full">
          <EmbedCalendar courses={courses} slug="mock" sellerName="Mock Studio" />
        </div>
      </PreviewSection>

      <PreviewSection label="400px (stablet)">
        <div className="rounded-lg border border-dashed border-border p-4 w-[400px] max-w-full">
          <EmbedCalendar courses={courses} slug="mock" sellerName="Mock Studio" />
        </div>
      </PreviewSection>

      <PreviewSection
        label="Feil"
        description="Henting av studio/kurs feilet (errorKind === 'load-failed') — samme tekst som EmbedCalendarPage viser i stedet for kalenderen."
      >
        <div className="rounded-lg border border-dashed border-border p-4 w-[760px] max-w-full">
          <p className="py-20 text-center text-base text-foreground-muted">
            Noe gikk galt – prøv igjen senere.
          </p>
        </div>
      </PreviewSection>
    </DevPage>
  );
};

/**
 * Mock courses with spread-out session dates so the grid + day list light up.
 * Adapted from MonthGridPreview's factory.
 */
function makeMockCourses(): PublicCourseWithDetails[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekly = (anchorWeekday: number, count = 8) => {
    const out: string[] = [];
    const start = new Date(today);
    const offset = (anchorWeekday - start.getDay() + 7) % 7;
    start.setDate(start.getDate() + offset);
    for (let i = 0; i < count; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i * 7);
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  };

  const single = (daysFromToday: number) => {
    const d = new Date(today);
    d.setDate(today.getDate() + daysFromToday);
    return [d.toISOString().slice(0, 10)];
  };

  const base = (
    id: string,
    title: string,
    dates: string[],
    extras: Partial<PublicCourseWithDetails> = {},
  ): PublicCourseWithDetails => ({
    id,
    slug: id,
    title,
    description: null,
    format: 'series',
    delivery_mode: 'in_person',
    status: 'active',
    location: 'Studio, Oslo',
    location_lat: null,
    location_lon: null,
    location_place_id: null,
    time_schedule: '18:00-19:00',
    duration: 60,
    max_participants: 14,
    price: 220,
    allows_drop_in: null,
    drop_in_price: null,
    accepts_late_signups: true,
    total_weeks: 8,
    start_date: dates[0],
    end_date: dates[dates.length - 1],
    image_url: null,
    seller_id: 'mock',
    spots_available: 8,
    seller: { name: 'Mock Studio', slug: 'mock', logo_url: null,
      stripe_onboarding_complete: false, default_course_image_url: null,
      student_discount_percent: null,
      senior_discount_percent: null },
    instructor_name: null,
    instructor: null,
    instructors: [],
    next_session: dates[0]
      ? { session_date: dates[0], session_number: 1, total_sessions: dates.length }
      : null,
    upcoming_session_dates: dates,
    ...extras,
  });

  return [
    base('vinyasa', 'Vinyasa Flow — Mandager', weekly(1), { instructor_name: 'Anna Berg' }),
    base('hatha', 'Hatha Yoga — Onsdager', weekly(3, 8), { time_schedule: '10:00-11:00' }),
    base('yin', 'Yin & Meditasjon', weekly(4, 8), { time_schedule: '19:30-20:45' }),
    base('lunch', 'Lunsj-yoga — Open Flow', weekly(1, 8), { time_schedule: '12:00-13:00' }),
    base('nidra', 'Yoga Nidra & Avspenning', weekly(2, 6), { time_schedule: '17:30-18:30' }),
    base('online', 'Kveldsmeditasjon online', weekly(3, 8), { time_schedule: '20:00-20:30', delivery_mode: 'online' }),
    base('fullmoon', 'Fullmåne-workshop', single(3), { format: 'single', time_schedule: '19:00-21:00' }),
    base('trial', 'Gratis prøvetime', single(4), { format: 'single', price: 0, time_schedule: '10:00-11:00' }),
  ];
}

export default EmbedPreview;
