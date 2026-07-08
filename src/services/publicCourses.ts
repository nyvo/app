import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { osloTodayKey, toLocalDate, formatLocalDateKey } from '@/utils/dateUtils'
import type { CourseFormat, DeliveryMode, CourseStatus } from '@/types/database'

interface PublicCourseInstructor {
  id: string
  name: string | null
  role: 'primary' | 'guest'
  display_order: number
}

interface PublicCourseSeller {
  name: string
  // slug + default_course_image_url live directly on the seller row and are
  // selected via the seller embed on the course queries.
  slug: string
  logo_url: string | null
  /** Gates the public checkout: paid courses are bookable once the seller has
   *  completed Stripe onboarding — every tier sells through Stripe. */
  stripe_onboarding_complete: boolean
  default_course_image_url: string | null
}

interface SellerJoinRow {
  id: string
  name: string
  logo_url: string | null
  slug: string
  default_course_image_url: string | null
  stripe_onboarding_complete: boolean
}

interface CourseQueryResult {
  id: string
  slug: string
  title: string
  description: string | null
  format: string
  delivery_mode: string
  status: string
  location: string | null
  location_lat: number | null
  location_lon: number | null
  location_place_id: string | null
  time_schedule: string | null
  duration: number | null
  max_participants: number | null
  price: number | null
  total_weeks: number | null
  start_date: string | null
  end_date: string | null
  image_url: string | null
  instructor_name: string | null
  accepts_late_signups: boolean
  seller_id: string
  seller: SellerJoinRow | null
}


interface StorefrontSellerScope {
  ownerSellerId: string
  sellerIds: string[]
}

// Next session info for ongoing courses
export interface NextSessionInfo {
  session_date: string
  session_number: number
  total_sessions: number
}

// Public course with computed fields for display
export interface PublicCourseWithDetails {
  id: string
  slug: string
  title: string
  description: string | null
  format: CourseFormat
  delivery_mode: DeliveryMode
  status: CourseStatus
  location: string | null
  location_lat: number | null
  location_lon: number | null
  location_place_id: string | null
  time_schedule: string | null
  duration: number | null
  max_participants: number | null
  price: number | null
  allows_drop_in: boolean | null
  drop_in_price: number | null
  total_weeks: number | null
  start_date: string | null
  end_date: string | null
  image_url: string | null
  instructor_name: string | null
  /** Series-only opt-in policy: when false, the package tier is hidden once
   * the first session has ended. Drop-in (if enabled) still works. */
  accepts_late_signups: boolean
  seller_id: string
  spots_available: number
  /** Seller info enriched with slug + default_course_image_url from the seller's team. */
  seller: PublicCourseSeller | null
  /** Legacy single-instructor field. Mirrors `instructors[0]` (primary). Kept for back-compat. */
  instructor: PublicCourseInstructor | null
  /** All instructors, primary first then guests in display_order. */
  instructors: PublicCourseInstructor[]
  next_session: NextSessionInfo | null
  /** Still-upcoming session dates — status='upcoming' and not yet ended (a
   * today session whose start+duration has passed is excluded), ascending.
   * Powers the day strip. */
  upcoming_session_dates: string[]
}

/**
 * Whether a session still counts as upcoming *right now*. Date-only is not
 * enough: a class today whose end time (start + duration) has already passed is
 * finished and must not surface as bookable on the storefront. Mirrors the
 * end-time rule `isSessionRemaining` uses on the detail page. Sessions without a
 * start time fall back to a calendar-day comparison.
 */
function isSessionUpcoming(
  session: { session_date: string; start_time: string | null },
  durationMinutes: number | null,
  todayStr: string,
): boolean {
  if (!session.start_time) return session.session_date >= todayStr
  const startMs = new Date(`${session.session_date}T${session.start_time}`).getTime()
  if (Number.isNaN(startMs)) return session.session_date >= todayStr
  return startMs + (durationMinutes ?? 60) * 60000 > Date.now()
}

/** Wrap the explicit display-name instructor as a PublicCourseInstructor array. */
function flattenInstructors(courseId: string, instructorName: string | null | undefined): PublicCourseInstructor[] {
  if (!instructorName) return []
  return [{
    id: `${courseId}:primary-instructor`,
    name: instructorName,
    role: 'primary',
    display_order: 0,
  }]
}

/** Resolve the course hero image using the per-course value first, then the studio default. */
export function resolveCourseImage(
  course: Pick<PublicCourseWithDetails, 'image_url' | 'seller'>,
): string | null {
  return course.image_url ?? course.seller?.default_course_image_url ?? null
}

/**
 * Number of days a course spans. A `single` course can run over consecutive
 * days (the teacher sets "Antall dager"; each day is one session and the last
 * becomes end_date). Returns the inclusive start→end span, or 1 when there's
 * no end_date (a genuine one-day class). Series use weeks, not this.
 */
export function singleDayCount(
  course: Pick<PublicCourseWithDetails, 'start_date' | 'end_date'>,
): number {
  if (!course.start_date || !course.end_date) return 1
  const start = new Date(`${course.start_date}T12:00:00`).getTime()
  const end = new Date(`${course.end_date}T12:00:00`).getTime()
  if (isNaN(start) || isNaN(end)) return 1
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1)
}

/**
 * Public storefront scope. The RPC intentionally exposes only seller IDs, not
 * seller_affiliations rows. A storefront includes its owner seller plus active
 * collaborator sellers.
 */
async function fetchStorefrontSellerScope(
  storefrontSlug: string,
): Promise<{ data: StorefrontSellerScope | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('public_storefront_scope', {
    p_slug: storefrontSlug,
  })

  if (error) {
    logger.error('Error fetching storefront seller scope:', error)
    return { data: null, error }
  }

  const rows = data ?? []
  if (rows.length === 0) {
    return { data: null, error: null }
  }

  const first = rows[0]
  return {
    data: {
      ownerSellerId: first.owner_seller_id,
      sellerIds: Array.from(new Set(rows.map((row) => row.seller_id))),
    },
    error: null,
  }
}

export interface PublicCoursesFilters {
  fromDate?: string
  /** Filter to courses owned by the seller whose team has this slug. */
  teamSlug?: string
  /**
   * Restrict to courses owned by any of these sellers. Used by space pages,
   * which aggregate courses across multiple seller members of a team. Takes
   * precedence over `teamSlug` when both are set.
   */
  sellerIds?: string[]
  limit?: number
  offset?: number
  includePast?: boolean // If true, returns only past courses (archive)
}

export async function fetchPublicCourses(
  filters?: PublicCoursesFilters
): Promise<{
  data: PublicCourseWithDetails[] | null
  error: Error | null
  count?: number
}> {
  // If filtering by team slug, include the storefront owner and all active
  // collaborators. Draft and finished courses are still excluded by the course
  // status/date filters below; the course seller owns payments and signups.
  let sellerIdFilter: string[] | null = null
  if (filters?.sellerIds && filters.sellerIds.length > 0) {
    sellerIdFilter = filters.sellerIds
  } else if (filters?.teamSlug) {
    const { data: scope, error: scopeError } = await fetchStorefrontSellerScope(filters.teamSlug)
    if (scopeError) {
      return { data: null, error: scopeError }
    }
    if (!scope) {
      return { data: [], error: null, count: 0 }
    }
    sellerIdFilter = scope.sellerIds
  }

  let query = supabase
    .from('courses')
    .select(`
      id,
      slug,
      title,
      description,
      format,
      delivery_mode,
      status,
      location,
      location_lat,
      location_lon,
      location_place_id,
      time_schedule,
      duration,
      max_participants,
      price,
      total_weeks,
      start_date,
      end_date,
      image_url,
      instructor_name,
      accepts_late_signups,
      seller_id,
      seller:sellers(id, name, logo_url, slug, default_course_image_url, stripe_onboarding_complete)
    `, { count: filters?.limit ? 'exact' : undefined })
    .in('status', ['active', 'upcoming', 'cancelled'])
    .order('start_date', { ascending: true })

  // Apply filters
  if (filters?.fromDate) {
    query = query.gte('start_date', filters.fromDate)
  }
  if (sellerIdFilter) {
    query = query.in('seller_id', sellerIdFilter)
  }

  // Apply past/active date filter in the DB query (not client-side) so pagination works correctly
  const todayStr = osloTodayKey()
  if (filters?.includePast) {
    // Archive: courses whose end_date (or start_date if no end_date) is before today
    query = query.or(`end_date.lt.${todayStr},and(end_date.is.null,start_date.lt.${todayStr})`)
  } else {
    // Active: courses whose end_date (or start_date if no end_date) is today or later,
    // OR has no dates at all, OR is a recently-cancelled course within the 30-day grace window
    // (caller then runs client-side isVisible() for the strict rule).
    const graceFloor = toLocalDate(todayStr)
    graceFloor.setDate(graceFloor.getDate() - 30)
    const graceFloorStr = formatLocalDateKey(graceFloor)
    query = query.or(
      `end_date.gte.${todayStr},` +
      `and(end_date.is.null,start_date.gte.${todayStr}),` +
      `and(end_date.is.null,start_date.is.null),` +
      `and(status.eq.cancelled,start_date.gte.${graceFloorStr})`
    )
  }

  // Apply pagination. Callers (storefront, embed calendar) pass no limit and
  // render everything they get — a low default silently hides the furthest-out
  // (still-selling) courses for studios with a big schedule, since the sort is
  // start_date ascending. 100 keeps one query cheap while being far above any
  // realistic simultaneous-upcoming count; real pagination comes with the
  // server-state-library migration.
  const limit = filters?.limit || 100
  const offset = filters?.offset || 0

  query = query.range(offset, offset + limit - 1)

  const { data: coursesData, error: coursesError } = await query

  if (coursesError) {
    return { data: null, error: coursesError as Error }
  }

  if (!coursesData || coursesData.length === 0) {
    return { data: [], error: null }
  }

  const courses = coursesData as unknown as CourseQueryResult[]
  const courseIds = courses.map(c => c.id)

  // Batch fetch signup counts (aggregate RPC) and sessions in parallel.
  // RPC returns only (course_id, confirmed_count) — no row data exposed to anon.
  // Cast: generated types regenerated after the migration is deployed.
  const [signupsResult, sessionsResult, dropInTiersResult] = await Promise.all([
    supabase.rpc('public_signup_counts', { p_course_ids: courseIds }),
    supabase
      .from('course_sessions')
      .select('course_id, session_date, session_number, status, start_time')
      .in('course_id', courseIds)
      .order('session_date', { ascending: true }),
    // Drop-in availability + price now lives on tier rows.
    supabase
      .from('course_signup_packages')
      .select('course_id, price')
      .in('course_id', courseIds)
      .eq('ticket_kind', 'drop_in')
      .eq('is_active', true),
  ])

  if (signupsResult.error) {
    logger.error('Error fetching signup counts:', signupsResult.error)
    return { data: null, error: signupsResult.error as Error }
  }
  if (sessionsResult.error) {
    logger.error('Error fetching sessions:', sessionsResult.error)
    return { data: null, error: sessionsResult.error as Error }
  }

  // Course-id → drop-in price (only present when an active drop-in tier exists).
  // Per-course there should be at most one active drop-in tier; first match wins.
  const dropInPriceMap: Record<string, number> = {}
  for (const tier of (dropInTiersResult.data ?? []) as { course_id: string; price: number }[]) {
    if (!(tier.course_id in dropInPriceMap)) {
      dropInPriceMap[tier.course_id] = Number(tier.price)
    }
  }

  // Build signup count map from RPC rows
  const signupCountMap: Record<string, number> = {}
  for (const row of (signupsResult.data || []) as unknown as { course_id: string; confirmed_count: number }[]) {
    signupCountMap[row.course_id] = Number(row.confirmed_count)
  }

  // Build session maps (total count + next upcoming session + all upcoming dates per course)
  const totalSessionsMap: Record<string, number> = {}
  const nextSessionMap: Record<string, NextSessionInfo> = {}
  const upcomingDatesMap: Record<string, string[]> = {}
  // Per-course duration so the time-aware upcoming check below can derive each
  // session's end instant (sessions carry start_time; duration lives on the course).
  const durationByCourseId: Record<string, number | null> = {}
  for (const c of courses) durationByCourseId[c.id] = c.duration
  const sessionsTyped = sessionsResult.data as { course_id: string; session_date: string; session_number: number; status: string; start_time: string | null }[] | null

  for (const session of sessionsTyped || []) {
    // Count all sessions for total
    totalSessionsMap[session.course_id] = (totalSessionsMap[session.course_id] || 0) + 1

    if (session.status === 'upcoming' && isSessionUpcoming(session, durationByCourseId[session.course_id] ?? null, todayStr)) {
      // Track first upcoming session per course
      if (!nextSessionMap[session.course_id]) {
        nextSessionMap[session.course_id] = {
          session_date: session.session_date,
          session_number: session.session_number,
          total_sessions: 0, // Will be set after we have all counts
        }
      }
      // Collect every upcoming date so the day strip can plot recurring weeks.
      const arr = upcomingDatesMap[session.course_id]
      if (arr) arr.push(session.session_date)
      else upcomingDatesMap[session.course_id] = [session.session_date]
    }
  }

  // Set total_sessions in nextSessionMap
  for (const courseId of Object.keys(nextSessionMap)) {
    nextSessionMap[courseId].total_sessions = totalSessionsMap[courseId] || 1
  }

  // Map to public format with spots available and next session
  const today = osloTodayKey()
  const publicCourses: PublicCourseWithDetails[] = courses.map(course => {
    const maxParticipants = course.max_participants || 0
    const confirmedCount = signupCountMap[course.id] || 0
    const spotsAvailable = Math.max(0, maxParticipants - confirmedCount)
    const instructors = flattenInstructors(course.id, course.instructor_name)
    // Drop-in availability mirrors the RPC's gating: there must be an active
    // drop-in tier row (the teacher's policy) AND the series must be
    // started + have spots open. Price is the explicit tier price set by the teacher.
    const hasDropInTier = course.id in dropInPriceMap
    const courseStarted = !!course.start_date && course.start_date <= today
    const isEligibleSeries = course.format === 'series' && courseStarted && spotsAvailable > 0
    const dropInActive = hasDropInTier && isEligibleSeries
    const dropInPrice = dropInActive ? dropInPriceMap[course.id] : null

    const sellerEnriched: PublicCourseSeller | null = course.seller
      ? {
          name: course.seller.name,
          slug: course.seller.slug ?? '',
          logo_url: course.seller.logo_url,
          stripe_onboarding_complete: course.seller.stripe_onboarding_complete,
          default_course_image_url: course.seller.default_course_image_url ?? null,
        }
      : null

    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      format: course.format as CourseFormat,
      delivery_mode: course.delivery_mode as DeliveryMode,
      status: course.status as CourseStatus,
      location: course.location,
      location_lat: course.location_lat ?? null,
      location_lon: course.location_lon ?? null,
      location_place_id: course.location_place_id ?? null,
      time_schedule: course.time_schedule,
      duration: course.duration,
      max_participants: course.max_participants,
      price: course.price,
      // Derived: active drop-in tier exists AND series + started + spots open.
      allows_drop_in: dropInActive,
      drop_in_price: dropInPrice,
      total_weeks: course.total_weeks,
      start_date: course.start_date,
      end_date: course.end_date,
      image_url: course.image_url,
      instructor_name: course.instructor_name,
      accepts_late_signups: course.accepts_late_signups,
      seller_id: course.seller_id,
      seller: sellerEnriched,
      instructor: instructors[0] ?? null,
      instructors,
      spots_available: spotsAvailable,
      next_session: nextSessionMap[course.id] || null,
      upcoming_session_dates: upcomingDatesMap[course.id] ?? [],
    }
  })

  // Date filtering is now done in the DB query above, so pagination counts are correct
  return { data: publicCourses, error: null, count: publicCourses.length }
}

/**
 * Look up a course by its slug, scoped to a specific team's public page.
 * The team scope guards against routing the wrong course when two unrelated
 * teams happen to surface a course with the same slug — practically impossible
 * since slugs are globally unique, but we double-check via team membership so
 * users can't probe arbitrary courses through unrelated team URLs.
 */
export async function fetchPublicCourseBySlug(
  teamSlug: string,
  courseSlug: string
): Promise<{ data: PublicCourseWithDetails | null; error: Error | null }> {
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select(`
      id,
      slug,
      title,
      description,
      format,
      delivery_mode,
      status,
      location,
      location_lat,
      location_lon,
      location_place_id,
      time_schedule,
      duration,
      max_participants,
      price,
      total_weeks,
      start_date,
      end_date,
      image_url,
      instructor_name,
      accepts_late_signups,
      seller_id,
      seller:sellers(id, name, logo_url, slug, default_course_image_url, stripe_onboarding_complete)
    `)
    .eq('slug', courseSlug)
    // Cancelled courses are excluded here, so a cancelled deep link resolves to
    // a null row (not-found) and lands in PageState variant="public-course".
    .neq('status', 'cancelled')
    .maybeSingle()

  // Return contract: `error !== null` is a retryable query/network failure
  // (callers show a server-error/retry state); `data === null && error === null`
  // is a genuine not-found (row absent or not on this storefront → terminal
  // "finnes ikke" copy). The two must never be conflated.
  if (courseError) {
    return { data: null, error: courseError as Error }
  }

  if (!course) {
    return { data: null, error: null }
  }

  const typedCourse = course as unknown as CourseQueryResult

  // Verify the course belongs on the requested storefront. This allows the
  // owner storefront and any active collaborator storefront, while unrelated
  // storefront URLs still 404.
  const { data: scope, error: scopeError } = await fetchStorefrontSellerScope(teamSlug)
  if (scopeError) {
    return { data: null, error: scopeError as Error }
  }
  if (!scope || !scope.sellerIds.includes(typedCourse.seller_id)) {
    return { data: null, error: null }
  }

  // Get signup count and drop-in tier in parallel.
  const [countResult, dropInResult] = await Promise.all([
    supabase.rpc('public_signup_counts', { p_course_ids: [typedCourse.id] }),
    supabase
      .from('course_signup_packages')
      .select('price')
      .eq('course_id', typedCourse.id)
      .eq('ticket_kind', 'drop_in')
      .eq('is_active', true)
      .maybeSingle(),
  ])

  if (countResult.error) {
    return { data: null, error: countResult.error as Error }
  }

  const countRow = (countResult.data as { course_id: string; confirmed_count: number }[] | null)?.[0]
  const confirmedCount = countRow ? Number(countRow.confirmed_count) : 0
  const maxParticipants = typedCourse.max_participants || 0
  const spotsAvailable = Math.max(0, maxParticipants - confirmedCount)

  // Drop-in availability: an active drop-in tier exists (teacher policy)
  // AND the series has started + has spots open. Price is the explicit tier
  // price set by the teacher.
  const today = osloTodayKey()
  const courseStarted = !!typedCourse.start_date && typedCourse.start_date <= today
  const isEligibleSeries = typedCourse.format === 'series' && courseStarted && spotsAvailable > 0
  const dropInTier = dropInResult.data as { price: number } | null
  const dropInActive = !!dropInTier && isEligibleSeries
  const dropInPrice = dropInActive ? Number(dropInTier.price) : null

  const instructors = flattenInstructors(typedCourse.id, typedCourse.instructor_name)

  const sellerEnriched: PublicCourseSeller | null = typedCourse.seller
    ? {
        name: typedCourse.seller.name,
        slug: typedCourse.seller.slug ?? '',
        logo_url: typedCourse.seller.logo_url,
        stripe_onboarding_complete: typedCourse.seller.stripe_onboarding_complete,
        default_course_image_url: typedCourse.seller.default_course_image_url ?? null,
      }
    : null

  const publicCourse: PublicCourseWithDetails = {
    id: typedCourse.id,
    slug: typedCourse.slug,
    title: typedCourse.title,
    description: typedCourse.description,
    format: typedCourse.format as CourseFormat,
    delivery_mode: typedCourse.delivery_mode as DeliveryMode,
    status: typedCourse.status as CourseStatus,
    location: typedCourse.location,
    location_lat: typedCourse.location_lat,
    location_lon: typedCourse.location_lon,
    location_place_id: typedCourse.location_place_id,
    time_schedule: typedCourse.time_schedule,
    duration: typedCourse.duration,
    max_participants: typedCourse.max_participants,
    price: typedCourse.price,
    allows_drop_in: dropInActive,
    drop_in_price: dropInPrice,
    total_weeks: typedCourse.total_weeks,
    start_date: typedCourse.start_date,
    end_date: typedCourse.end_date,
    image_url: typedCourse.image_url,
    instructor_name: typedCourse.instructor_name,
    accepts_late_signups: typedCourse.accepts_late_signups,
    seller_id: typedCourse.seller_id,
    seller: sellerEnriched,
    instructor: instructors[0] ?? null,
    instructors,
    spots_available: spotsAvailable,
    next_session: null, // Detail page fetches sessions separately
    upcoming_session_dates: [], // Detail page fetches sessions separately
  }

  return { data: publicCourse, error: null }
}
