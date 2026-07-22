import { calculateTotalPrice } from '@/lib/pricing'
import { resolveCourseImage, type PublicCourseWithDetails } from '@/services/publicCourses'
import type { PublicSeller, StudioAddress } from '@/services/sellers'
import type { CourseSession } from '@/types/database'
import { CANONICAL_ORIGIN } from '@/hooks/use-page-meta'

/**
 * schema.org JSON-LD builders for the public pages. Every property maps to a
 * field we actually have — nothing is fabricated (no reviews, openingHours or
 * phone; Google treats invented structured data as spam). Consumed via
 * useJsonLd, so all builders return plain serializable objects, or null when
 * the data can't support valid markup.
 */

/** Rich-text course descriptions are stored as HTML; JSON-LD and meta descriptions want plain text. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Oslo UTC offset ("+02:00"/"+01:00") for a local date — sessions store naive
 * Oslo-local date + time, and Google's Event guidance wants an explicit offset.
 * Falls back to no offset (still valid ISO 8601; Google then assumes the
 * event location's timezone) if Intl support is missing.
 */
function osloOffset(date: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Oslo',
      timeZoneName: 'longOffset',
    }).formatToParts(new Date(`${date}T12:00:00`))
    const zone = parts.find((part) => part.type === 'timeZoneName')?.value
    return zone?.match(/([+-]\d{2}:\d{2})/)?.[1] ?? ''
  } catch {
    return ''
  }
}

/** "18:00:00" + 60 min → "19:00:00" (clamped within the day; sessions never cross midnight). */
function addMinutes(time: string, minutes: number): string {
  const [hours = 0, mins = 0] = time.split(':').map(Number)
  const total = Math.min(hours * 60 + mins + minutes, 23 * 60 + 59)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}:00`
}

function isoDateTime(date: string, time: string | null): string {
  return time ? `${date}T${time}${osloOffset(date)}` : date
}

function sessionEndTime(session: CourseSession, durationMinutes: number | null): string | null {
  if (session.end_time) return session.end_time
  if (session.start_time && durationMinutes) return addMinutes(session.start_time, durationMinutes)
  return session.start_time
}

interface Offer {
  '@type': 'Offer'
  price: number
  priceCurrency: 'NOK'
  availability: string
  url: string
}

/**
 * Offers carry the all-in consumer price (course price + service fee via
 * calculateTotalPrice) — Google's price-accuracy rules and Forbrukertilsynet's
 * drip-pricing guidance both require the total a buyer actually pays, not the
 * base price shown mid-funnel.
 */
function buildOffers(course: PublicCourseWithDetails, url: string): Offer[] {
  const availability =
    course.spots_available <= 0 ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock'
  const offers: Offer[] = [
    { '@type': 'Offer', price: calculateTotalPrice(course.price), priceCurrency: 'NOK', availability, url },
  ]
  if (course.allows_drop_in && course.drop_in_price && course.drop_in_price > 0) {
    offers.push({
      '@type': 'Offer',
      price: calculateTotalPrice(course.drop_in_price),
      priceCurrency: 'NOK',
      availability,
      url,
    })
  }
  return offers
}

function buildLocation(course: PublicCourseWithDetails, url: string): object | null {
  if (course.delivery_mode === 'online') {
    return { '@type': 'VirtualLocation', url }
  }
  if (!course.location) return null
  const place: Record<string, unknown> = { '@type': 'Place', name: course.location }
  if (course.location_lat != null && course.location_lon != null) {
    place.geo = {
      '@type': 'GeoCoordinates',
      latitude: course.location_lat,
      longitude: course.location_lon,
    }
  }
  return place
}

/** Google's Events surface caps out on usefulness long before a full 12-week list. */
const MAX_SUB_EVENTS = 20

/**
 * Course detail page markup: kursrekker (format 'series') become an
 * EventSeries with upcoming sessions as subEvents; workshops/single courses
 * a plain Event. Returns null when there's no seller slug or no date at all —
 * an Event without startDate is invalid, better to emit nothing.
 */
export function buildCourseJsonLd(
  course: PublicCourseWithDetails,
  sessions: CourseSession[],
): object | null {
  if (!course.seller?.slug) return null
  const url = `${CANONICAL_ORIGIN}/${course.seller.slug}/${course.slug}`

  const ordered = [...sessions].sort((a, b) => a.session_date.localeCompare(b.session_date))
  const first = ordered[0]
  const last = ordered[ordered.length - 1]
  const startDate = first
    ? isoDateTime(first.session_date, first.start_time)
    : course.start_date ?? null
  if (!startDate) return null
  const endDate = last
    ? isoDateTime(last.session_date, sessionEndTime(last, course.duration))
    : course.end_date ?? null

  const eventStatus =
    course.status === 'cancelled'
      ? 'https://schema.org/EventCancelled'
      : 'https://schema.org/EventScheduled'
  const location = buildLocation(course, url)
  const image = resolveCourseImage(course)

  const base: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': course.format === 'series' ? 'EventSeries' : 'Event',
    '@id': url,
    name: course.title,
    url,
    startDate,
    eventStatus,
    eventAttendanceMode:
      course.delivery_mode === 'online'
        ? 'https://schema.org/OnlineEventAttendanceMode'
        : 'https://schema.org/OfflineEventAttendanceMode',
    organizer: {
      '@type': 'Organization',
      name: course.instructor_name || course.seller.name,
      url: `${CANONICAL_ORIGIN}/${course.seller.slug}`,
    },
    offers: buildOffers(course, url),
  }
  if (endDate) base.endDate = endDate
  if (course.description) base.description = stripHtml(course.description)
  if (location) base.location = location
  if (image) base.image = image

  if (course.format === 'series') {
    const upcoming = ordered.filter((session) => session.status === 'upcoming').slice(0, MAX_SUB_EVENTS)
    if (upcoming.length > 0) {
      base.subEvent = upcoming.map((session) => {
        const sub: Record<string, unknown> = {
          '@type': 'Event',
          name: `${course.title} – økt ${session.session_number}`,
          startDate: isoDateTime(session.session_date, session.start_time),
          eventStatus,
        }
        const subEnd = sessionEndTime(session, course.duration)
        if (subEnd) sub.endDate = isoDateTime(session.session_date, subEnd)
        if (location) sub.location = location
        return sub
      })
    }
  }

  return base
}

/**
 * Storefront markup: plain LocalBusiness — sellers have no category field, so
 * a narrower type (ExerciseGym) would misrepresent non-yoga sellers. Address
 * and geo come ONLY from the canonical studio address row, never the page's
 * course-venue fallback: a rented class venue in LocalBusiness.address would
 * conflict (NAP mismatch) with the studio's real Google Business Profile.
 */
export function buildStorefrontJsonLd(
  organization: PublicSeller,
  address: StudioAddress | null,
): object {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: organization.name,
    url: `${CANONICAL_ORIGIN}/${organization.slug}`,
  }
  if (organization.logo_url) data.image = organization.logo_url
  if (address?.address) {
    data.address = { '@type': 'PostalAddress', streetAddress: address.address }
  }
  if (address && address.lat != null && address.lon != null) {
    data.geo = { '@type': 'GeoCoordinates', latitude: address.lat, longitude: address.lon }
  }
  return data
}
