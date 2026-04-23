import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { CourseType, CourseStatus, CourseLevel, Json } from '@/types/database'
import type { PracticalInfo } from '@/types/practicalInfo'

interface PublicCourseInstructor {
  id: string
  name: string | null
  avatar_url: string | null
  bio: string | null
  role: 'primary' | 'guest'
  display_order: number
}

interface PublicCourseOrganization {
  name: string
  slug: string
  dintero_onboarding_complete: boolean
  default_course_image_url: string | null
}

// Internal type for the joined course query result
interface CourseInstructorJoinRow {
  role: 'primary' | 'guest'
  display_order: number
  profile: { id: string; name: string | null; avatar_url: string | null; bio: string | null } | null
}

interface CourseQueryResult {
  id: string
  title: string
  description: string | null
  course_type: string
  status: string
  level: string | null
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
  organization_id: string
  practical_info: Json | null
  organization: PublicCourseOrganization | null
  course_instructors: CourseInstructorJoinRow[] | null
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
  title: string
  description: string | null
  course_type: CourseType
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
  organization_id: string
  practical_info: PracticalInfo | null
  spots_available: number
  organization: PublicCourseOrganization | null
  /** Legacy single-instructor field. Mirrors `instructors[0]` (primary). Kept for back-compat. */
  instructor: PublicCourseInstructor | null
  /** All instructors, primary first then guests in display_order. */
  instructors: PublicCourseInstructor[]
  next_session: NextSessionInfo | null
}

/** Flatten course_instructors join rows into a sorted PublicCourseInstructor array, primary first. */
function flattenInstructors(rows: CourseInstructorJoinRow[] | null | undefined): PublicCourseInstructor[] {
  if (!rows || rows.length === 0) return []
  return rows
    .filter(r => r.profile !== null)
    .map(r => ({
      id: r.profile!.id,
      name: r.profile!.name,
      avatar_url: r.profile!.avatar_url,
      bio: r.profile!.bio,
      role: r.role,
      display_order: r.display_order,
    }))
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === 'primary' ? -1 : 1
      return a.display_order - b.display_order
    })
}

/** Resolve the course hero image using the per-course value first, then the studio default. */
export function resolveCourseImage(
  course: Pick<PublicCourseWithDetails, 'image_url' | 'organization'>,
): string | null {
  return course.image_url ?? course.organization?.default_course_image_url ?? null
}

export interface PublicCoursesFilters {
  level?: string
  fromDate?: string
  organizationSlug?: string
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
  let query = supabase
    .from('courses')
    .select(`
      id,
      title,
      description,
      course_type,
      status,
      level,
      location,
      time_schedule,
      duration,
      max_participants,
      price,
      allows_drop_in,
      drop_in_price,
      total_weeks,
      start_date,
      end_date,
      image_url,
      organization_id,
      practical_info,
      organization:organizations(name, slug, dintero_onboarding_complete, default_course_image_url),
      course_instructors(role, display_order, profile:profiles(id, name, avatar_url, bio))
    `, { count: filters?.limit ? 'exact' : undefined })
    .in('status', ['active', 'upcoming', 'cancelled'])
    .order('start_date', { ascending: true })

  // Apply filters
  if (filters?.level) {
    query = query.eq('level', filters.level)
  }
  if (filters?.fromDate) {
    query = query.gte('start_date', filters.fromDate)
  }
  if (filters?.organizationSlug) {
    query = query.eq('organization.slug', filters.organizationSlug)
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

  // Batch fetch signup counts (aggregate RPC) and sessions in parallel.
  // RPC returns only (course_id, confirmed_count) — no row data exposed to anon.
  // Cast: generated types regenerated after the migration is deployed.
  const [signupsResult, sessionsResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.rpc as any)('public_signup_counts', { p_course_ids: courseIds }),
    supabase
      .from('course_sessions')
      .select('course_id, session_date, session_number, status')
      .in('course_id', courseIds)
      .order('session_date', { ascending: true })
  ])

  // Check for batch query errors — if signups query failed, spots_available would be wrong
  if (signupsResult.error) {
    logger.error('Error fetching signup counts:', signupsResult.error)
    return { data: null, error: signupsResult.error as Error }
  }
  if (sessionsResult.error) {
    logger.error('Error fetching sessions:', sessionsResult.error)
    return { data: null, error: sessionsResult.error as Error }
  }

  // Build signup count map from RPC rows
  const signupCountMap: Record<string, number> = {}
  for (const row of (signupsResult.data || []) as unknown as { course_id: string; confirmed_count: number }[]) {
    signupCountMap[row.course_id] = Number(row.confirmed_count)
  }

  // Build session maps (total count + next upcoming session per course)
  const totalSessionsMap: Record<string, number> = {}
  const nextSessionMap: Record<string, NextSessionInfo> = {}
  const sessionsTyped = sessionsResult.data as { course_id: string; session_date: string; session_number: number; status: string }[] | null

  for (const session of sessionsTyped || []) {
    // Count all sessions for total
    totalSessionsMap[session.course_id] = (totalSessionsMap[session.course_id] || 0) + 1

    // Track first upcoming session per course
    if (
      session.status === 'upcoming' &&
      session.session_date >= todayStr &&
      !nextSessionMap[session.course_id]
    ) {
      nextSessionMap[session.course_id] = {
        session_date: session.session_date,
        session_number: session.session_number,
        total_sessions: 0, // Will be set after we have all counts
      }
    }
  }

  // Set total_sessions in nextSessionMap
  for (const courseId of Object.keys(nextSessionMap)) {
    nextSessionMap[courseId].total_sessions = totalSessionsMap[courseId] || 1
  }

  // Map to public format with spots available and next session
  const publicCourses: PublicCourseWithDetails[] = courses.map(course => {
    const maxParticipants = course.max_participants || 0
    const confirmedCount = signupCountMap[course.id] || 0
    const spotsAvailable = Math.max(0, maxParticipants - confirmedCount)
    const instructors = flattenInstructors(course.course_instructors)

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      course_type: course.course_type as CourseType,
      status: course.status as CourseStatus,
      level: course.level as CourseLevel | null,
      location: course.location,
      time_schedule: course.time_schedule,
      duration: course.duration,
      max_participants: course.max_participants,
      price: course.price,
      allows_drop_in: course.allows_drop_in,
      drop_in_price: course.drop_in_price,
      total_weeks: course.total_weeks,
      start_date: course.start_date,
      end_date: course.end_date,
      image_url: course.image_url,
      organization_id: course.organization_id,
      practical_info: (course.practical_info as unknown as PracticalInfo) || null,
      organization: course.organization as unknown as PublicCourseOrganization | null,
      instructor: instructors[0] ?? null,
      instructors,
      spots_available: spotsAvailable,
      next_session: nextSessionMap[course.id] || null,
    }
  })

  // Date filtering is now done in the DB query above, so pagination counts are correct
  return { data: publicCourses, error: null, count: publicCourses.length }
}

export async function fetchPublicCourseById(
  courseId: string
): Promise<{ data: PublicCourseWithDetails | null; error: Error | null }> {
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select(`
      id,
      title,
      description,
      course_type,
      status,
      level,
      location,
      time_schedule,
      duration,
      max_participants,
      price,
      allows_drop_in,
      drop_in_price,
      total_weeks,
      start_date,
      end_date,
      image_url,
      organization_id,
      practical_info,
      organization:organizations(name, slug, dintero_onboarding_complete, default_course_image_url),
      course_instructors(role, display_order, profile:profiles(id, name, avatar_url, bio))
    `)
    .eq('id', courseId)
    .neq('status', 'cancelled')
    .single()

  if (courseError) {
    return { data: null, error: courseError as Error }
  }

  if (!course) {
    return { data: null, error: new Error('Kurs ikke funnet') }
  }

  const typedCourse = course as unknown as CourseQueryResult

  // Get signup count for this course via the aggregate RPC (anon-safe).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: countRows, error: countError } = await (supabase.rpc as any)(
    'public_signup_counts',
    { p_course_ids: [courseId] },
  )

  if (countError) {
    return { data: null, error: countError as Error }
  }

  const countRow = (countRows as { course_id: string; confirmed_count: number }[] | null)?.[0]
  const confirmedCount = countRow ? Number(countRow.confirmed_count) : 0
  const maxParticipants = typedCourse.max_participants || 0
  const spotsAvailable = Math.max(0, maxParticipants - confirmedCount)

  const instructors = flattenInstructors(typedCourse.course_instructors)

  const publicCourse: PublicCourseWithDetails = {
    id: typedCourse.id,
    title: typedCourse.title,
    description: typedCourse.description,
    course_type: typedCourse.course_type as CourseType,
    status: typedCourse.status as CourseStatus,
    level: typedCourse.level as CourseLevel | null,
    location: typedCourse.location,
    time_schedule: typedCourse.time_schedule,
    duration: typedCourse.duration,
    max_participants: typedCourse.max_participants,
    price: typedCourse.price,
    allows_drop_in: typedCourse.allows_drop_in,
    drop_in_price: typedCourse.drop_in_price,
    total_weeks: typedCourse.total_weeks,
    start_date: typedCourse.start_date,
    end_date: typedCourse.end_date,
    image_url: typedCourse.image_url,
    organization_id: typedCourse.organization_id,
    practical_info: (typedCourse.practical_info as unknown as PracticalInfo) || null,
    organization: typedCourse.organization,
    instructor: instructors[0] ?? null,
    instructors,
    spots_available: spotsAvailable,
    next_session: null, // Detail page fetches sessions separately
  }

  return { data: publicCourse, error: null }
}

