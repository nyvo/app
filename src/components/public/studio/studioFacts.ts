import type { PublicCourseWithDetails } from '@/services/publicCourses';
import { WEEKDAYS_LONG, MONTHS_LONG } from '@/lib/calendar-nb';

/* ── Norwegian calendar labels (storefront-wide) ─────────────────── */

export const WEEKDAYS_FULL_NB = WEEKDAYS_LONG;
export const MONTHS_NB = MONTHS_LONG;

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "tirsdag 10. juni" — lowercase per Norwegian orthography; capitalize in CSS when leading. */
export function formatLongDay(d: Date): string {
  return `${WEEKDAYS_FULL_NB[d.getDay()]} ${d.getDate()}. ${MONTHS_NB[d.getMonth()]}`;
}

/* ── Time-schedule parsing (shared by schedule rows) ─────────────── */

export function extractTime(timeSchedule: string | null): string {
  if (!timeSchedule) return '';
  const m = timeSchedule.match(/(\d{1,2}:\d{2})/);
  return m ? m[1] : '';
}

export function extractTimeValue(timeSchedule: string | null): number {
  if (!timeSchedule) return 9999;
  const m = timeSchedule.match(/(\d{1,2}):(\d{2})/);
  if (!m) return 9999;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export function formatTimeRange(startTime: string, durationMinutes: number | null): string {
  if (!startTime) return '';
  if (!durationMinutes || durationMinutes <= 0) return startTime;
  const m = startTime.match(/(\d{1,2}):(\d{2})/);
  if (!m) return startTime;
  const totalMinutes = parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + durationMinutes;
  const endHours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const endMinutes = totalMinutes % 60;
  return `${startTime}–${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

/* ── Bookability (mirrors BookingRailLite's closed/full rules) ───── */

export type Bookability = 'open' | 'full' | 'closed' | 'cancelled';

export function courseBookability(
  course: PublicCourseWithDetails,
  todayKey: string,
): Bookability {
  if (course.status === 'cancelled') return 'cancelled';
  if (course.max_participants !== null && course.spots_available <= 0) return 'full';
  const seriesStarted =
    course.format === 'series'
    && !!course.start_date
    && course.start_date <= todayKey;
  if (seriesStarted && !course.accepts_late_signups && !course.allows_drop_in) return 'closed';
  return 'open';
}

/** Cheapest bookable amount. `from` is true when a cheaper drop-in tier
 * undercuts the package price, so the row reads "fra 249 kr". */
export function entryPrice(
  course: PublicCourseWithDetails,
): { amount: number | null; from: boolean } {
  const dropIn = course.allows_drop_in ? course.drop_in_price : null;
  if (dropIn && course.price && dropIn < course.price) {
    return { amount: dropIn, from: true };
  }
  return { amount: course.price, from: false };
}

/* ── Studio location + derived facts ─────────────────────────────── */

/** A studio's display location — derived from the studio's courses (the
 * most-used physical course location, with the coords + Google place id the
 * course builder saved). The old canonical `teacher_locations` source was
 * retired 2026-07-11 with the Studio "Sted" tab; course data is the single
 * source now. */
export interface StudioLocation {
  label: string;
  address: string | null;
  lat: number | null;
  lon: number | null;
  placeId: string | null;
}

/** Google Maps directions URL for a location — exact pin (place_id, else
 * coords) with a text-search fallback. Mirrors the course-detail LocationCard. */
export function directionsUrl(location: StudioLocation): string {
  const params = new URLSearchParams({ api: '1' });
  if (location.placeId) {
    params.set('destination', location.address || location.label);
    params.set('destination_place_id', location.placeId);
  } else if (location.lat != null && location.lon != null) {
    params.set('destination', `${location.lat},${location.lon}`);
  } else {
    params.set('destination', (location.address || location.label).split('·')[0].trim());
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export interface StudioFacts {
  /** Most-used physical course location — THE studio display location.
   * Null when all courses are online. */
  primaryLocation: StudioLocation | null;
  /** Unique instructor names, in first-seen course order. */
  instructors: string[];
}

interface LocationAccumulator {
  count: number;
  lat: number | null;
  lon: number | null;
  placeId: string | null;
}

export function deriveStudioFacts(courses: PublicCourseWithDetails[]): StudioFacts {
  const locationMap = new Map<string, LocationAccumulator>();
  const instructors: string[] = [];

  for (const course of courses) {
    if (course.status === 'cancelled') continue;

    if (course.delivery_mode !== 'online' && course.location) {
      const label = course.location.trim();
      if (label) {
        const existing = locationMap.get(label);
        if (existing) {
          existing.count += 1;
          if (existing.lat == null && course.location_lat != null) {
            existing.lat = course.location_lat;
            existing.lon = course.location_lon;
          }
          if (!existing.placeId && course.location_place_id) {
            existing.placeId = course.location_place_id;
          }
        } else {
          locationMap.set(label, {
            count: 1,
            lat: course.location_lat ?? null,
            lon: course.location_lon ?? null,
            placeId: course.location_place_id ?? null,
          });
        }
      }
    }

    for (const instructor of course.instructors) {
      const name = instructor.name?.trim();
      if (name && !instructors.includes(name)) instructors.push(name);
    }
  }

  const top = Array.from(locationMap.entries()).sort((a, b) => b[1].count - a[1].count)[0];
  const primaryLocation: StudioLocation | null = top
    ? { label: top[0], address: null, lat: top[1].lat, lon: top[1].lon, placeId: top[1].placeId }
    : null;

  return { primaryLocation, instructors };
}
