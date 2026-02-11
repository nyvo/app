import { supabase } from '@/lib/supabase'
import type { CourseType, CourseStatus, CourseLevel } from '@/types/database'

// Internal type for the joined course query result
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
  start_date: string | null
  end_date: string | null
  image_url: string | null
  organization_id: string
  organization: { name: string; slug: string } | null
  instructor: { id: string; name: string | null; avatar_url: string | null } | null
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
  start_date: string | null
  end_date: string | null
  image_url: string | null
  organization_id: string
  spots_available: number
  organization: {
    name: string
    slug: string
  } | null
  instructor: {
    id: string
    name: string | null
    avatar_url: string | null
  } | null
  next_session: NextSessionInfo | null
}

export interface PublicCoursesFilters {
  level?: string
  fromDate?: string
  organizationSlug?: string
  limit?: number
  offset?: number
  includePast?: boolean // If true, returns only past courses (archive)
}

// Fetch all published courses (status != 'draft') for public viewing
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
      start_date,
      end_date,
      image_url,
      organization_id,
      organization:organizations(name, slug),
      instructor:instructor_id(id, name, avatar_url)
    `, { count: filters?.limit ? 'exact' : undefined })
    .neq('status', 'draft')
    .neq('status', 'cancelled')
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
    // Active: courses whose end_date (or start_date if no end_date) is today or later, OR has no date
    query = query.or(`end_date.gte.${todayStr},and(end_date.is.null,start_date.gte.${todayStr}),and(end_date.is.null,start_date.is.null)`)
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

  // Batch fetch signups and sessions in parallel (2 queries instead of 4)
  const [signupsResult, sessionsResult] = await Promise.all([
    // Query 1: Get all confirmed signups for these courses
    supabase
      .from('signups')
      .select('course_id')
      .in('course_id', courseIds)
      .eq('status', 'confirmed'),
    // Query 2: Get all sessions for these courses (both for next session and total count)
    supabase
      .from('course_sessions')
      .select('course_id, session_date, session_number, status')
      .in('course_id', courseIds)
      .order('session_date', { ascending: true })
  ])

  // Check for batch query errors — if signups query failed, spots_available would be wrong
  if (signupsResult.error) {
    console.error('Error fetching signup counts:', signupsResult.error)
    return { data: null, error: signupsResult.error as Error }
  }
  if (sessionsResult.error) {
    console.error('Error fetching sessions:', sessionsResult.error)
    return { data: null, error: sessionsResult.error as Error }
  }

  // Build signup count map
  const signupCountMap: Record<string, number> = {}
  for (const signup of (signupsResult.data || []) as unknown as { course_id: string }[]) {
    signupCountMap[signup.course_id] = (signupCountMap[signup.course_id] || 0) + 1
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
      start_date: course.start_date,
      end_date: course.end_date,
      image_url: course.image_url,
      organization_id: course.organization_id,
      organization: course.organization as unknown as { name: string; slug: string } | null,
      instructor: course.instructor as unknown as { id: string; name: string | null; avatar_url: string | null } | null,
      spots_available: spotsAvailable,
      next_session: nextSessionMap[course.id] || null,
    }
  })

  // Date filtering is now done in the DB query above, so pagination counts are correct
  return { data: publicCourses, error: null, count: publicCourses.length }
}

// Fetch a single course by ID for public detail page
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
      start_date,
      end_date,
      image_url,
      organization_id,
      organization:organizations(name, slug),
      instructor:instructor_id(id, name, avatar_url)
    `)
    .eq('id', courseId)
    .neq('status', 'draft')
    .neq('status', 'cancelled')
    .single()

  if (courseError) {
    return { data: null, error: courseError as Error }
  }

  if (!course) {
    return { data: null, error: new Error('Course not found') }
  }

  const typedCourse = course as unknown as CourseQueryResult

  // Get signup count for this course
  const { count, error: countError } = await supabase
    .from('signups')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .eq('status', 'confirmed')

  if (countError) {
    return { data: null, error: countError as Error }
  }

  const confirmedCount = count || 0
  const maxParticipants = typedCourse.max_participants || 0
  const spotsAvailable = Math.max(0, maxParticipants - confirmedCount)

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
    start_date: typedCourse.start_date,
    end_date: typedCourse.end_date,
    image_url: typedCourse.image_url,
    organization_id: typedCourse.organization_id,
    organization: typedCourse.organization,
    instructor: typedCourse.instructor || null,
    spots_available: spotsAvailable,
    next_session: null, // Detail page fetches sessions separately
  }

  return { data: publicCourse, error: null }
}

