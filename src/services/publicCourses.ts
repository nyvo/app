import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { CourseFormat, DeliveryMode, CourseStatus, CourseLevel } from '@/types/database'

interface PublicCourseInstructor {
  id: string
  name: string | null
  role: 'primary' | 'guest'
  display_order: number
}

interface PublicCourseSeller {
  name: string
  // slug + default_course_image_url now live on the team owned by the seller —
  // populated via a follow-up team query and merged into this shape on the
  // returned PublicCourseWithDetails.
  slug: string
  logo_url: string | null
  dintero_onboarding_complete: boolean
  default_course_image_url: string | null
}

// Internal type for the joined course query result
interface InstructorProfileJoinRow {
  id: string
  name: string | null
}

interface SellerJoinRow {
  id: string
  name: string
  logo_url: string | null
  dintero_onboarding_complete: boolean
}

interface CourseQueryResult {
  id: string
  slug: string
  title: string
  description: string | null
  format: string
  delivery_mode: string
  status: string
  level: string | null
  location: string | null
  time_schedule: string | null
  duration: number | null
  max_participants: number | null
  price: number | null
  total_weeks: number | null
  start_date: string | null
  end_date: string | null
  image_url: string | null
  seller_id: string
  seller: SellerJoinRow | null
  instructor: InstructorProfileJoinRow | null
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
  level: CourseLevel | null
  location: string | null
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
  seller_id: string
  spots_available: number
  /** Seller info enriched with slug + default_course_image_url from the seller's team. */
  seller: PublicCourseSeller | null
  /** Legacy single-instructor field. Mirrors `instructors[0]` (primary). Kept for back-compat. */
  instructor: PublicCourseInstructor | null
  /** All instructors, primary first then guests in display_order. */
  instructors: PublicCourseInstructor[]
  next_session: NextSessionInfo | null
  /** All future session dates (status='upcoming', session_date >= today), ascending. Powers the day strip. */
  upcoming_session_dates: string[]
}

/** Wrap the single primary instructor (from courses.instructor_id) as a PublicCourseInstructor array. */
function flattenInstructors(profile: InstructorProfileJoinRow | null | undefined): PublicCourseInstructor[] {
  if (!profile) return []
  return [{
    id: profile.id,
    name: profile.name,
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
 * Fetch the team-owned slug + default_course_image_url for a set of seller ids
 * and return as a map keyed by seller_id. Each seller has at most one team
 * (teams.owner_seller_id is the FK).
 */
async function fetchTeamMetaBySellerIds(
  sellerIds: string[],
): Promise<Record<string, { slug: string; default_course_image_url: string | null }>> {
  const result: Record<string, { slug: string; default_course_image_url: string | null }> = {}
  if (sellerIds.length === 0) return result

  const { data, error } = await supabase
    .from('teams')
    .select('owner_seller_id, slug, default_course_image_url')
    .in('owner_seller_id', sellerIds)

  if (error) {
    logger.error('Error fetching team meta:', error)
    return result
  }

  for (const row of (data ?? []) as { owner_seller_id: string; slug: string; default_course_image_url: string | null }[]) {
    if (!(row.owner_seller_id in result)) {
      result[row.owner_seller_id] = {
        slug: row.slug,
        default_course_image_url: row.default_course_image_url,
      }
    }
  }
  return result
}

export interface PublicCoursesFilters {
  level?: string
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
  // If filtering by team slug, resolve to the owner seller_id first AND
  // include any courses syndicated onto the team's storefront via the
  // course_team_listings table (storefront syndication, 2026-04-29).
  //
  // Resulting predicate: courses WHERE seller_id = owner OR id IN (listed)
  let sellerIdFilter: string[] | null = null
  let extraListedCourseIds: string[] | null = null
  if (filters?.sellerIds && filters.sellerIds.length > 0) {
    sellerIdFilter = filters.sellerIds
  } else if (filters?.teamSlug) {
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, owner_seller_id')
      .eq('slug', filters.teamSlug)
      .maybeSingle()
    if (teamError) {
      return { data: null, error: teamError as Error }
    }
    if (!team) {
      return { data: [], error: null, count: 0 }
    }
    const teamRow = team as { id: string; owner_seller_id: string }
    sellerIdFilter = [teamRow.owner_seller_id]

    // Pull syndicated course ids — courses owned by OTHER sellers that an
    // active team_affiliation lets appear on this team's storefront.
    const { data: listingRows, error: listingError } = await supabase
      .from('course_team_listings')
      .select('course_id')
      .eq('team_id', teamRow.id)
    if (listingError) {
      // Non-fatal — fall back to owner-only courses if listings can't load.
      logger.warn('publicCourses: course_team_listings fetch failed', listingError)
    } else if (listingRows && listingRows.length > 0) {
      extraListedCourseIds = (listingRows as Array<{ course_id: string }>).map((r) => r.course_id)
    }
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
      level,
      location,
      time_schedule,
      duration,
      max_participants,
      price,
      total_weeks,
      start_date,
      end_date,
      image_url,
      seller_id,
      seller:sellers(id, name, logo_url, dintero_onboarding_complete),
      instructor:profiles!instructor_id(id, name)
    `, { count: filters?.limit ? 'exact' : undefined })
    .in('status', ['active', 'upcoming', 'cancelled'])
    .order('start_date', { ascending: true })

  // Apply filters
  if (filters?.level) {
    query = query.eq('level', filters.level as CourseLevel)
  }
  if (filters?.fromDate) {
    query = query.gte('start_date', filters.fromDate)
  }
  if (sellerIdFilter) {
    if (extraListedCourseIds && extraListedCourseIds.length > 0) {
      // Courses owned by the team's seller, OR syndicated via listings.
      // PostgREST `.in` inside `.or` needs comma-separated values in the
      // group; the seller filter has at most one value here (set above).
      const listedClause = `id.in.(${extraListedCourseIds.join(',')})`
      const sellerClause = `seller_id.in.(${sellerIdFilter.join(',')})`
      query = query.or(`${sellerClause},${listedClause}`)
    } else {
      query = query.in('seller_id', sellerIdFilter)
    }
  }

  // Apply past/active date filter in the DB query (not client-side) so pagination works correctly
  const todayStr = new Date().toISOString().split('T')[0]
  if (filters?.includePast) {
    // Archive: courses whose end_date (or start_date if no end_date) is before today
    query = query.or(`end_date.lt.${todayStr},and(end_date.is.null,start_date.lt.${todayStr})`)
  } else {
    // Active: courses whose end_date (or start_date if no end_date) is today or later,
    // OR has no dates at all, OR is a recently-cancelled course within the 30-day grace window
    // (caller then runs client-side isVisible() for the strict rule).
    const graceFloor = new Date()
    graceFloor.setDate(graceFloor.getDate() - 30)
    const graceFloorStr = graceFloor.toISOString().split('T')[0]
    query = query.or(
      `end_date.gte.${todayStr},` +
      `and(end_date.is.null,start_date.gte.${todayStr}),` +
      `and(end_date.is.null,start_date.is.null),` +
      `and(status.eq.cancelled,start_date.gte.${graceFloorStr})`
    )
  }

  // Apply pagination
  const limit = filters?.limit || 20 // Default 20 courses per page
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

  // Resolve seller → team meta (slug + default_course_image_url) for all the
  // sellers in the result.
  const uniqSellerIds = Array.from(new Set(courses.map(c => c.seller_id)))
  const teamMetaPromise = fetchTeamMetaBySellerIds(uniqSellerIds)

  // Batch fetch signup counts (aggregate RPC) and sessions in parallel.
  // RPC returns only (course_id, confirmed_count) — no row data exposed to anon.
  // Cast: generated types regenerated after the migration is deployed.
  const [signupsResult, sessionsResult, dropInTiersResult, teamMetaMap] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.rpc as any)('public_signup_counts', { p_course_ids: courseIds }),
    supabase
      .from('course_sessions')
      .select('course_id, session_date, session_number, status')
      .in('course_id', courseIds)
      .order('session_date', { ascending: true }),
    // Drop-in availability + price now lives on tier rows.
    supabase
      .from('course_signup_packages')
      .select('course_id, price')
      .in('course_id', courseIds)
      .eq('ticket_kind', 'drop_in')
      .eq('is_active', true),
    teamMetaPromise,
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
  const sessionsTyped = sessionsResult.data as { course_id: string; session_date: string; session_number: number; status: string }[] | null

  for (const session of sessionsTyped || []) {
    // Count all sessions for total
    totalSessionsMap[session.course_id] = (totalSessionsMap[session.course_id] || 0) + 1

    if (session.status === 'upcoming' && session.session_date >= todayStr) {
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
  const today = new Date().toISOString().split('T')[0]
  const publicCourses: PublicCourseWithDetails[] = courses.map(course => {
    const maxParticipants = course.max_participants || 0
    const confirmedCount = signupCountMap[course.id] || 0
    const spotsAvailable = Math.max(0, maxParticipants - confirmedCount)
    const instructors = flattenInstructors(course.instructor)
    const teamMeta = teamMetaMap[course.seller_id]
    // Drop-in availability mirrors the RPC's gating: there must be an active
    // drop-in tier row (the teacher's policy) AND the series must be
    // started + have spots open. Price is computed at read time — never
    // snapshotted, so it tracks the course base price.
    const hasDropInTier = course.id in dropInPriceMap
    const courseStarted = !!course.start_date && course.start_date <= today
    const isEligibleSeries = course.format === 'series' && courseStarted && spotsAvailable > 0
    const dropInActive = hasDropInTier && isEligibleSeries
    const dropInPrice = !dropInActive
      ? null
      : (course.price && course.total_weeks ? Math.round(course.price / course.total_weeks) : null)

    const sellerEnriched: PublicCourseSeller | null = course.seller
      ? {
          name: course.seller.name,
          slug: teamMeta?.slug ?? '',
          logo_url: course.seller.logo_url,
          dintero_onboarding_complete: course.seller.dintero_onboarding_complete,
          default_course_image_url: teamMeta?.default_course_image_url ?? null,
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
      level: course.level as CourseLevel | null,
      location: course.location,
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
      level,
      location,
      time_schedule,
      duration,
      max_participants,
      price,
      total_weeks,
      start_date,
      end_date,
      image_url,
      seller_id,
      seller:sellers(id, name, logo_url, dintero_onboarding_complete),
      instructor:profiles!instructor_id(id, name)
    `)
    .eq('slug', courseSlug)
    .neq('status', 'cancelled')
    .maybeSingle()

  if (courseError) {
    return { data: null, error: courseError as Error }
  }

  if (!course) {
    return { data: null, error: new Error('Fant ikke kurset') }
  }

  const typedCourse = course as unknown as CourseQueryResult

  // Verify the course actually belongs on the requested team's public page.
  // Either the team owns the seller (canonical case) OR the seller is a
  // tenant member of the team. Otherwise 404 — prevents probing courses
  // through unrelated team URLs.
  const { data: team, error: teamErr } = await supabase
    .from('teams')
    .select('id, owner_seller_id')
    .eq('slug', teamSlug)
    .maybeSingle()
  if (teamErr || !team) {
    return { data: null, error: new Error('Fant ikke kurset') }
  }
  const teamRow = team as { id: string; owner_seller_id: string }
  if (teamRow.owner_seller_id !== typedCourse.seller_id) {
    // The course isn't owned by this team — check if it's syndicated here
    // via the team_affiliations / course_team_listings model.
    const { data: listing } = await supabase
      .from('course_team_listings')
      .select('course_id')
      .eq('team_id', teamRow.id)
      .eq('course_id', typedCourse.id)
      .maybeSingle()
    if (!listing) {
      return { data: null, error: new Error('Fant ikke kurset') }
    }
  }

  // Get signup count, drop-in tier, and team meta in parallel.
  const [countResult, dropInResult, teamMetaMap] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.rpc as any)('public_signup_counts', { p_course_ids: [typedCourse.id] }),
    supabase
      .from('course_signup_packages')
      .select('price')
      .eq('course_id', typedCourse.id)
      .eq('ticket_kind', 'drop_in')
      .eq('is_active', true)
      .maybeSingle(),
    fetchTeamMetaBySellerIds([typedCourse.seller_id]),
  ])

  if (countResult.error) {
    return { data: null, error: countResult.error as Error }
  }

  const countRow = (countResult.data as { course_id: string; confirmed_count: number }[] | null)?.[0]
  const confirmedCount = countRow ? Number(countRow.confirmed_count) : 0
  const maxParticipants = typedCourse.max_participants || 0
  const spotsAvailable = Math.max(0, maxParticipants - confirmedCount)

  // Drop-in availability: an active drop-in tier exists (teacher policy)
  // AND the series has started + has spots open. Price always computed
  // from the course base — no snapshot, no drift.
  const today = new Date().toISOString().split('T')[0]
  const courseStarted = !!typedCourse.start_date && typedCourse.start_date <= today
  const isEligibleSeries = typedCourse.format === 'series' && courseStarted && spotsAvailable > 0
  const dropInTier = dropInResult.data as { price: number } | null
  const dropInActive = !!dropInTier && isEligibleSeries
  const dropInPrice = !dropInActive
    ? null
    : (typedCourse.price && typedCourse.total_weeks
        ? Math.round(typedCourse.price / typedCourse.total_weeks)
        : null)

  const instructors = flattenInstructors(typedCourse.instructor)
  const teamMeta = teamMetaMap[typedCourse.seller_id]

  const sellerEnriched: PublicCourseSeller | null = typedCourse.seller
    ? {
        name: typedCourse.seller.name,
        slug: teamMeta?.slug ?? '',
        logo_url: typedCourse.seller.logo_url,
        dintero_onboarding_complete: typedCourse.seller.dintero_onboarding_complete,
        default_course_image_url: teamMeta?.default_course_image_url ?? null,
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
    level: typedCourse.level as CourseLevel | null,
    location: typedCourse.location,
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
