import { supabase } from '@/lib/supabase'
import type {
  Course,
  CourseInsert,
  CourseUpdate,
  CourseStyle,
  CourseSession,
  CourseSessionInsert,
  CourseSessionUpdate
} from '@/types/database'

// Course with joined style data
export interface CourseWithStyle extends Course {
  style: CourseStyle | null
}

// Check if organization has ever created a course (for onboarding detection)
export async function hasEverCreatedCourse(organizationId: string): Promise<boolean> {
  const { count } = await supabase
    .from('courses')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  return (count || 0) > 0
}

// Pagination options for course queries
export interface PaginationOptions {
  limit?: number
  offset?: number
}

// Fetch all courses for an organization (with style join)
export async function fetchCourses(
  organizationId: string,
  options?: PaginationOptions
): Promise<{
  data: CourseWithStyle[] | null
  error: Error | null
  count?: number
}> {
  let query = supabase
    .from('courses')
    .select(`
      *,
      style:course_styles(*)
    `, { count: options ? 'exact' : undefined })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  // Apply pagination if provided
  if (options?.limit) {
    query = query.limit(options.limit)
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
  }

  const { data, error, count } = await query

  if (error) {
    return { data: null, error: error as Error }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { data: data as any as CourseWithStyle[], error: null, count: count || undefined }
}

// Fetch a single course by ID (with style and signups count)
export async function fetchCourseById(courseId: string): Promise<{
  data: CourseWithStyle & { signups_count: number } | null
  error: Error | null
}> {
  // Fetch course with style
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select(`
      *,
      style:course_styles(*)
    `)
    .eq('id', courseId)
    .single()

  if (courseError) {
    return { data: null, error: courseError as Error }
  }

  // Fetch signups count
  const { count, error: countError } = await supabase
    .from('signups')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .eq('status', 'confirmed')

  if (countError) {
    return { data: null, error: countError as Error }
  }

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: {
      ...(course as any as CourseWithStyle),
      signups_count: count || 0
    },
    error: null
  }
}

// Session time override for multi-day events
export interface SessionTimeOverride {
  dayIndex: number // 0-based index (0 = first day)
  time: string // e.g., "18:00"
}

// Create a new course (and auto-generate sessions for course series)
export async function createCourse(
  courseData: CourseInsert,
  options?: {
    eventDays?: number // Number of days for multi-day events
    sessionTimeOverrides?: SessionTimeOverride[] // Custom times for specific days
  }
): Promise<{ data: Course | null; error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from('courses') as any)
    .insert(courseData)
    .select()
    .single()

  if (error) {
    return { data: null, error: error as Error }
  }

  const course = data as Course

  // Extract time from time_schedule (e.g., "Mandager, 18:00" -> "18:00")
  const timeMatch = courseData.time_schedule?.match(/(\d{1,2}:\d{2})/)
  const startTime = timeMatch ? timeMatch[1] : '09:00'

  // Auto-generate sessions based on course type
  if (courseData.course_type === 'course-series' && courseData.total_weeks && courseData.start_date) {
    // Generate multiple sessions for course series (one per week)
    const sessions: CourseSessionInsert[] = []
    const baseDate = new Date(courseData.start_date)

    for (let i = 0; i < courseData.total_weeks; i++) {
      const sessionDate = new Date(baseDate)
      sessionDate.setDate(baseDate.getDate() + (i * 7))
      sessions.push({
        course_id: course.id,
        session_number: i + 1,
        session_date: sessionDate.toISOString().split('T')[0],
        start_time: startTime,
        status: 'upcoming',
      })
    }

    // Insert sessions (ignore errors - course was created successfully)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('course_sessions') as any).insert(sessions)
  } else if (courseData.course_type === 'event' && courseData.start_date) {
    const eventDays = options?.eventDays || 1
    const sessionTimeOverrides = options?.sessionTimeOverrides || []

    if (eventDays > 1) {
      // Generate multiple sessions for multi-day events
      const sessions: CourseSessionInsert[] = []
      const baseDate = new Date(courseData.start_date)

      for (let i = 0; i < eventDays; i++) {
        const sessionDate = new Date(baseDate)
        sessionDate.setDate(baseDate.getDate() + i)

        // Check if there's a custom time for this day
        const override = sessionTimeOverrides.find(o => o.dayIndex === i)
        const sessionTime = override?.time || startTime

        sessions.push({
          course_id: course.id,
          session_number: i + 1,
          session_date: sessionDate.toISOString().split('T')[0],
          start_time: sessionTime,
          status: 'upcoming',
        })
      }

      // Insert all sessions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('course_sessions') as any).insert(sessions)
    } else {
      // Generate a single session for single-day events
      const session: CourseSessionInsert = {
        course_id: course.id,
        session_number: 1,
        session_date: courseData.start_date,
        start_time: startTime,
        status: 'upcoming',
      }

      // Insert session (ignore errors - course was created successfully)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('course_sessions') as any).insert(session)
    }
  }

  return { data: course, error: null }
}

// Update a course
export async function updateCourse(courseId: string, courseData: CourseUpdate): Promise<{ data: Course | null; error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from('courses') as any)
    .update(courseData)
    .eq('id', courseId)
    .select()
    .single()

  if (error) {
    return { data: null, error: error as Error }
  }

  return { data: data as Course, error: null }
}

// Delete a course
export async function deleteCourse(courseId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId)

  if (error) {
    return { error: error as Error }
  }

  return { error: null }
}

// Fetch all course styles (for dropdowns)
export async function fetchCourseStyles(): Promise<{ data: CourseStyle[] | null; error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from('course_styles') as any)
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    return { data: null, error: error as Error }
  }

  return { data: data as CourseStyle[], error: null }
}

// ============================================
// COURSE SESSIONS
// ============================================

// Fetch all sessions for a course
export async function fetchCourseSessions(courseId: string): Promise<{ data: CourseSession[] | null; error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from('course_sessions') as any)
    .select('*')
    .eq('course_id', courseId)
    .order('session_number', { ascending: true })

  if (error) {
    return { data: null, error: error as Error }
  }

  return { data: data as CourseSession[], error: null }
}

// Update a single session
export async function updateCourseSession(
  sessionId: string,
  sessionData: CourseSessionUpdate
): Promise<{ data: CourseSession | null; error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from('course_sessions') as any)
    .update(sessionData)
    .eq('id', sessionId)
    .select()
    .single()

  if (error) {
    return { data: null, error: error as Error }
  }

  return { data: data as CourseSession, error: null }
}

// Fetch the next upcoming session for an organization (for dashboard)
export async function fetchUpcomingSession(organizationId: string): Promise<{
  data: {
    session: CourseSession
    course: CourseWithStyle
    attendeeCount: number
  } | null
  error: Error | null
}> {
  // Get today's date in ISO format
  const today = new Date().toISOString().split('T')[0]

  // Find the next upcoming session
  const { data: sessionData, error: sessionError } = await supabase
    .from('course_sessions')
    .select(`
      *,
      course:courses!inner(
        *,
        style:course_styles(*)
      )
    `)
    .eq('course.organization_id', organizationId)
    .gte('session_date', today)
    .eq('status', 'upcoming')
    .order('session_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(1)
    .single()

  if (sessionError) {
    // No upcoming session found is not an error
    if (sessionError.code === 'PGRST116') {
      return { data: null, error: null }
    }
    return { data: null, error: sessionError as Error }
  }

  if (!sessionData) {
    return { data: null, error: null }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = sessionData as any
  const course = session.course as CourseWithStyle

  // Get attendee count for this course
  const { count, error: countError } = await supabase
    .from('signups')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', course.id)
    .eq('status', 'confirmed')

  if (countError) {
    return { data: null, error: countError as Error }
  }

  return {
    data: {
      session: {
        id: session.id,
        course_id: session.course_id,
        session_number: session.session_number,
        session_date: session.session_date,
        start_time: session.start_time,
        end_time: session.end_time,
        status: session.status,
        notes: session.notes,
        created_at: session.created_at,
        updated_at: session.updated_at,
      },
      course,
      attendeeCount: count || 0,
    },
    error: null,
  }
}

// Generate sessions for an existing course (useful for updating week count)
export async function generateCourseSessions(
  courseId: string,
  startDate: string,
  weekCount: number,
  startTime: string
): Promise<{ error: Error | null }> {
  // First, delete existing sessions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('course_sessions') as any)
    .delete()
    .eq('course_id', courseId)

  // Generate new sessions
  const sessions: CourseSessionInsert[] = []
  const baseDate = new Date(startDate)

  for (let i = 0; i < weekCount; i++) {
    const sessionDate = new Date(baseDate)
    sessionDate.setDate(baseDate.getDate() + (i * 7))
    sessions.push({
      course_id: courseId,
      session_number: i + 1,
      session_date: sessionDate.toISOString().split('T')[0],
      start_time: startTime,
      status: 'upcoming',
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('course_sessions') as any).insert(sessions)

  if (error) {
    return { error: error as Error }
  }

  return { error: null }
}
