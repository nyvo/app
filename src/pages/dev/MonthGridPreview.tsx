import { useMemo } from 'react';
import { StudioMonthGrid } from '@/components/public/studio/StudioMonthGrid';
import { StudioMonthSchedule } from '@/components/public/studio/StudioMonthSchedule';
import type { PublicCourseWithDetails } from '@/services/publicCourses';

/**
 * Side-by-side preview of the two day-picker patterns: the horizontal day
 * strip we currently ship, and a traditional month-grid calendar like
 * Calendly/Cal.com use. Inline mock data so this works without a database.
 */
const MonthGridPreview = () => {
  const courses = useMemo<PublicCourseWithDetails[]>(() => makeMockCourses(), []);

  return (
    <div className="min-h-screen bg-background text-foreground py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-16">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Day picker — A / B</h1>
          <p className="text-sm text-foreground-muted max-w-xl">
            Same mock data rendered two ways. The horizontal strip (current) on top,
            the month-grid (Calendly-style) below.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-foreground-muted">
            A · Horizontal day strip (current)
          </h2>
          <StudioMonthSchedule courses={courses} />
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-foreground-muted">
            B · Month-grid calendar
          </h2>
          <div className="rounded-lg border border-border bg-surface p-6 max-w-md">
            <StudioMonthGrid courses={courses} />
          </div>
        </section>
      </div>
    </div>
  );
};

/**
 * Mock courses with spread-out session dates so both pickers light up.
 * Mirrors the real inspire-yogastudio shape: ~6 weekly series + a couple of
 * single events through May/June 2026.
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
      stripe_onboarding_complete: false, default_course_image_url: null },
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
    base('vinyasa', 'Vinyasa Flow — Mandager', weekly(1)),
    base('hatha', 'Hatha Yoga — Onsdager', weekly(3, 8), { time_schedule: '10:00-11:00' }),
    base('yin', 'Yin & Meditasjon', weekly(4, 8), { time_schedule: '19:30-20:45' }),
    base('lunch', 'Lunsj-yoga — Open Flow', weekly(1, 8), { time_schedule: '12:00-13:00' }),
    base('nidra', 'Yoga Nidra & Avspenning', weekly(2, 6), { time_schedule: '17:30-18:30' }),
    base('online', 'Kveldsmeditasjon online', weekly(3, 8), { time_schedule: '20:00-20:30', delivery_mode: 'online' }),
    base('fullmoon', 'Fullmåne-workshop', single(3), { format: 'single', time_schedule: '19:00-21:00' }),
    base('trial', 'Gratis prøvetime', single(4), { format: 'single', price: 0, time_schedule: '10:00-11:00' }),
  ];
}

export default MonthGridPreview;
