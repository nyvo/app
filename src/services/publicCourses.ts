import { supabase } from '@/lib/supabase'
import type { CourseStyle, CourseType, CourseStatus, CourseLevel } from '@/types/database'

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
  style: CourseStyle | null
  organization: { name: string; slug: string } | null
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
  style: CourseStyle | null
  organization_id: string
  spots_available: number
  organization: {
    name: string
    slug: string
  } | null
  next_session: NextSessionInfo | null
}

export interface PublicCoursesFilters {
  styleId?: string
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
      style:course_styles(id, name, normalized_name, color),
      organization:organizations(name, slug)
    `, { count: filters?.limit ? 'exact' : undefined })
    .neq('status', 'draft')
    .neq('status', 'cancelled')
    .order('start_date', { ascending: true })

  // Apply filters
  if (filters?.styleId) {
    query = query.eq('style_id', filters.styleId)
  }
  if (filters?.level) {
    query = query.eq('level', filters.level)
  }
  if (filters?.fromDate) {
    query = query.gte('start_date', filters.fromDate)
  }
  if (filters?.organizationSlug) {
    query = query.eq('organization.slug', filters.organizationSlug)
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
  const todayStr = new Date().toISOString().split('T')[0]

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
      style: course.style as unknown as CourseStyle | null,
      organization: course.organization as unknown as { name: string; slug: string } | null,
      spots_available: spotsAvailable,
      next_session: nextSessionMap[course.id] || null,
    }
  })

  // Filter courses by past/active status
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const filteredCourses = publicCourses.filter(course => {
    const relevantDateStr = course.end_date || course.start_date
    if (!relevantDateStr) return !filters?.includePast // No date = show in active, not in archive

    const relevantDate = new Date(relevantDateStr)
    relevantDate.setHours(23, 59, 59, 999) // End of day

    const isPast = relevantDate < today
    return filters?.includePast ? isPast : !isPast
  })

  return { data: filteredCourses, error: null, count: filteredCourses.length }
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
      style:course_styles(id, name, normalized_name, color),
      organization:organizations(name, slug)
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
    style: typedCourse.style as CourseStyle | null,
    organization: typedCourse.organization,
    spots_available: spotsAvailable,
    next_session: null, // Detail page fetches sessions separately
  }

  return { data: publicCourse, error: null }
}

// Fetch available course styles for filter dropdown
export async function fetchPublicCourseStyles(): Promise<{
  data: CourseStyle[] | null
  error: Error | null
}> {
  const { data, error } = await supabase
    .from('course_styles')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    return { data: null, error: error as Error }
  }

  return { data: data as CourseStyle[], error: null }
}
