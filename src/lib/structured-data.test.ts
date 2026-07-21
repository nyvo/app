import { describe, expect, it } from 'vitest'
import { buildCourseJsonLd, buildStorefrontJsonLd } from './structured-data'
import type { PublicCourseWithDetails } from '@/services/publicCourses'
import type { CourseSession } from '@/types/database'

const seller = {
  id: 's1',
  name: 'Flyt Studio',
  logo_url: null,
  slug: 'flyt-studio',
  default_course_image_url: null,
  stripe_onboarding_complete: true,
  student_discount_percent: null,
  senior_discount_percent: null,
} as PublicCourseWithDetails['seller']

function makeCourse(overrides: Partial<PublicCourseWithDetails> = {}): PublicCourseWithDetails {
  return {
    id: 'c1',
    slug: 'yin-yoga',
    title: 'Yin Yoga',
    description: '<p>Rolig&nbsp;<b>yin</b></p>',
    format: 'series',
    delivery_mode: 'in_person',
    status: 'upcoming',
    location: 'Markveien 12, Oslo',
    location_lat: 59.92,
    location_lon: 10.75,
    location_place_id: null,
    time_schedule: null,
    duration: 60,
    max_participants: 10,
    price: 250,
    allows_drop_in: false,
    drop_in_price: null,
    total_weeks: 2,
    start_date: '2026-08-04',
    end_date: '2026-08-11',
    image_url: null,
    instructor_name: null,
    accepts_late_signups: true,
    seller_id: 's1',
    spots_available: 5,
    seller,
    instructor: null,
    instructors: [],
    next_session: null,
    upcoming_session_dates: ['2026-08-04', '2026-08-11'],
    ...overrides,
  } as PublicCourseWithDetails
}

function makeSession(overrides: Partial<CourseSession> = {}): CourseSession {
  return {
    id: 'sess1',
    course_id: 'c1',
    session_date: '2026-08-04',
    session_number: 1,
    start_time: '18:00:00',
    end_time: null,
    status: 'upcoming',
    created_at: '',
    updated_at: '',
    ...overrides,
  } as CourseSession
}

describe('buildCourseJsonLd', () => {
  it('builds an EventSeries for a kursrekke with all-in offer price (incl. service fee)', () => {
    const sessions = [
      makeSession(),
      makeSession({ id: 'sess2', session_date: '2026-08-11', session_number: 2 }),
    ]
    const data = buildCourseJsonLd(makeCourse(), sessions) as Record<string, unknown>
    expect(data['@type']).toBe('EventSeries')
    expect(data.url).toBe('https://www.upnext.no/flyt-studio/yin-yoga')
    // 250 kr + 5% service fee (ceil(12.5) = 13, within 4–149 clamp) = 263
    const offers = data.offers as Array<Record<string, unknown>>
    expect(offers[0].price).toBe(263)
    expect(offers[0].priceCurrency).toBe('NOK')
    expect(offers[0].availability).toBe('https://schema.org/InStock')
    // August in Oslo = CEST (+02:00); date-time carries the offset
    expect(data.startDate).toBe('2026-08-04T18:00:00+02:00')
    // Last session ends start + duration
    expect(data.endDate).toBe('2026-08-11T19:00:00+02:00')
    // HTML stripped from description
    expect(data.description).toBe('Rolig yin')
    expect((data.subEvent as unknown[]).length).toBe(2)
  })

  it('builds a plain Event for a single-format course and adds a drop-in offer', () => {
    const course = makeCourse({
      format: 'single',
      allows_drop_in: true,
      drop_in_price: 200,
    })
    const data = buildCourseJsonLd(course, [makeSession()]) as Record<string, unknown>
    expect(data['@type']).toBe('Event')
    expect(data.subEvent).toBeUndefined()
    const offers = data.offers as Array<Record<string, unknown>>
    expect(offers).toHaveLength(2)
    // 200 + max(4, ceil(10)) = 210
    expect(offers[1].price).toBe(210)
  })

  it('marks a full course as SoldOut and a free course as price 0', () => {
    const data = buildCourseJsonLd(
      makeCourse({ spots_available: 0, price: null }),
      [makeSession()],
    ) as Record<string, unknown>
    const offers = data.offers as Array<Record<string, unknown>>
    expect(offers[0].availability).toBe('https://schema.org/SoldOut')
    expect(offers[0].price).toBe(0)
  })

  it('uses VirtualLocation for online courses', () => {
    const data = buildCourseJsonLd(
      makeCourse({ delivery_mode: 'online', location: null }),
      [makeSession()],
    ) as Record<string, unknown>
    expect((data.location as Record<string, unknown>)['@type']).toBe('VirtualLocation')
    expect(data.eventAttendanceMode).toBe('https://schema.org/OnlineEventAttendanceMode')
  })

  it('returns null without seller slug or without any date', () => {
    expect(buildCourseJsonLd(makeCourse({ seller: null }), [makeSession()])).toBeNull()
    expect(buildCourseJsonLd(makeCourse({ start_date: null }), [])).toBeNull()
  })
})

describe('buildStorefrontJsonLd', () => {
  const org = {
    id: 's1',
    name: 'Flyt Studio',
    slug: 'flyt-studio',
    logo_url: 'https://cdn.example/logo.png',
    cover_image_url: null,
    default_course_image_url: null,
    stripe_onboarding_complete: true,
  }

  it('emits address and geo only when a canonical address row exists', () => {
    const withAddress = buildStorefrontJsonLd(org, {
      name: 'Flyt Studio',
      address: 'Markveien 12, 0554 Oslo',
      lat: 59.92,
      lon: 10.75,
      placeId: 'abc',
    }) as Record<string, unknown>
    expect(withAddress['@type']).toBe('LocalBusiness')
    expect((withAddress.address as Record<string, unknown>).streetAddress).toBe(
      'Markveien 12, 0554 Oslo',
    )
    expect(withAddress.image).toBe('https://cdn.example/logo.png')

    const withoutAddress = buildStorefrontJsonLd(
      { ...org, logo_url: null },
      null,
    ) as Record<string, unknown>
    expect(withoutAddress.address).toBeUndefined()
    expect(withoutAddress.geo).toBeUndefined()
    expect(withoutAddress.image).toBeUndefined()
    expect(withoutAddress.url).toBe('https://www.upnext.no/flyt-studio')
  })
})
