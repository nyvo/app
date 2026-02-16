import { supabase, typedFrom } from '@/lib/supabase'
import type {
  Course,
  CourseInsert,
  CourseUpdate,
  CourseSession,
  CourseSessionInsert,
  CourseSessionUpdate,
  SessionStatus,
} from '@/types/database'

// Internal types for Supabase join query results
interface SessionWithCourseJoin {
  id: string
  session_date: string
  start_time: string
  status?: string
  course: {
    id: string
    title: string
    organization_id: string
    duration: number
    status: string
  }
}

interface SessionWithFullCourseJoin {
  id: string
  course_id: string
  session_number: number
  session_date: string
  start_time: string
  end_time: string | null
  status: SessionStatus
  notes: string | null
  created_at: string
  updated_at: string
  course: Course
}

// Check if organization has ever created a course (for onboarding detection)
export async function hasEverCreatedCourse(organizationId: string): Promise<{ data: boolean; error: Error | null }> {
  const { count, error } = await supabase
    .from('courses')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  if (error) {
    return { data: false, error: error as Error }
  }

  return { data: (count || 0) > 0, error: null }
}

// Pagination options for course queries
export interface PaginationOptions {
  limit?: number
  offset?: number
}

// Fetch all courses for an organization
export async function fetchCourses(
  organizationId: string,
  options?: PaginationOptions
): Promise<{
  data: Course[] | null
  error: Error | null
  count?: number
}> {
  let query = supabase
    .from('courses')
    .select(`
      *
    `, { count: options?.limit || options?.offset ? 'exact' : undefined })
    .eq('organization_id', organizationId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })

  // Apply pagination if provided — use range() only (not limit + range)
  if (options?.limit || options?.offset) {
    const offset = options?.offset || 0
    const limit = options?.limit || 50
    query = query.range(offset, offset + limit - 1)
  }

  const { data, error, count } = await query

  if (error) {
    return { data: null, error: error as Error }
  }

  return { data: data as unknown as Course[], error: null, count: count || undefined }
}

// Fetch a single course by ID (with signups count)
export async function fetchCourseById(courseId: string): Promise<{
  data: Course & { signups_count: number } | null
  error: Error | null
}> {
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select(`
      *
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
    data: {
      ...(course as unknown as Course),
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

// Schedule conflict result
export interface ScheduleConflict {
  sessionDate: string
  startTime: string
  conflictingCourse: {
    id: string
    title: string
    startTime: string
    endTime: string
  }
}

// Check for schedule conflicts before creating a course
export async function checkScheduleConflicts(
  organizationId: string,
  plannedSessions: { date: string; startTime: string; duration: number }[]
): Promise<{ conflicts: ScheduleConflict[]; error: Error | null }> {
  if (plannedSessions.length === 0) {
    return { conflicts: [], error: null }
  }

  // Get all session dates we need to check
  const sessionDates = plannedSessions.map(s => s.date)

  // Fetch existing sessions for this organization on those dates
  const { data: existingSessions, error } = await typedFrom('course_sessions')
    .select(`
      id,
      session_date,
      start_time,
      course:courses!inner(
        id,
        title,
        organization_id,
        duration,
        status
      )
    `)
    .in('session_date', sessionDates)
    .eq('course.organization_id', organizationId)
    .neq('course.status', 'cancelled')
    .neq('status', 'cancelled')

  if (error) {
    return { conflicts: [], error: error as Error }
  }

  if (!existingSessions || existingSessions.length === 0) {
    return { conflicts: [], error: null }
  }

  const conflicts: ScheduleConflict[] = []
  const typedSessions = existingSessions as unknown as SessionWithCourseJoin[]

  // Check each planned session against existing sessions
  for (const planned of plannedSessions) {
    const plannedStart = timeToMinutes(planned.startTime)
    const plannedEnd = plannedStart + planned.duration

    for (const existing of typedSessions) {
      const existingCourse = existing.course

      // Skip if different date
      if (existing.session_date !== planned.date) continue

      const existingStart = timeToMinutes(existing.start_time)
      // Ensure duration is at least 1 minute (default to 60 if missing or zero)
      const existingDuration = existingCourse.duration > 0 ? existingCourse.duration : 60
      const existingEnd = existingStart + existingDuration

      // Check for time overlap
      // Two sessions overlap if: start1 < end2 AND start2 < end1
      if (plannedStart < existingEnd && existingStart < plannedEnd) {
        // Calculate end time string
        const endHours = Math.floor(existingEnd / 60)
        const endMins = existingEnd % 60
        const endTimeStr = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`

        // Format start time to HH:MM (strip seconds if present)
        const startTimeStr = existing.start_time.slice(0, 5)

        conflicts.push({
          sessionDate: planned.date,
          startTime: planned.startTime,
          conflictingCourse: {
            id: existingCourse.id,
            title: existingCourse.title,
            startTime: startTimeStr,
            endTime: endTimeStr
          }
        })
        break // Only report one conflict per planned session
      }
    }
  }

  return { conflicts, error: null }
}

// Booked time slot info for time picker
export interface BookedTimeSlot {
  startTime: string  // HH:MM format
  endTime: string    // HH:MM format
  courseTitle: string
  courseId: string
}

// Fetch booked time slots for a specific date (for time picker availability)
export async function fetchBookedTimesForDate(
  organizationId: string,
  date: string, // YYYY-MM-DD format
  excludeCourseId?: string // Optional: exclude this course from results (for editing existing courses)
): Promise<{ data: BookedTimeSlot[] | null; error: Error | null }> {
  // Query sessions for this date with course data, filtered by organization in the DB
  const { data: sessions, error } = await typedFrom('course_sessions')
    .select(`
      id,
      session_date,
      start_time,
      status,
      course:courses!inner(
        id,
        title,
        organization_id,
        duration,
        status
      )
    `)
    .eq('session_date', date)
    .eq('course.organization_id', organizationId)
    .neq('course.status', 'cancelled')
    .neq('status', 'cancelled')

  if (error) {
    return { data: null, error: error as Error }
  }

  if (!sessions || sessions.length === 0) {
    return { data: [], error: null }
  }

  // Filter and map sessions to booked time slots
  const bookedSlots: BookedTimeSlot[] = []
  const typedSessions = sessions as unknown as SessionWithCourseJoin[]

  for (const session of typedSessions) {
    const course = session.course

    // Skip if no course data
    if (!course) continue
    // Skip if this is the course we're excluding (editing)
    if (excludeCourseId && course.id === excludeCourseId) continue

    const startMinutes = timeToMinutes(session.start_time || '')
    const duration = course.duration > 0 ? course.duration : 60
    const endMinutes = startMinutes + duration

    // Format times to HH:MM
    const formatTime = (mins: number) => {
      const h = Math.floor(mins / 60)
      const m = mins % 60
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    }

    bookedSlots.push({
      startTime: (session.start_time || '').slice(0, 5), // Strip seconds if present
      endTime: formatTime(endMinutes),
      courseTitle: course.title,
      courseId: course.id
    })
  }

  return { data: bookedSlots, error: null }
}

// Helper to convert time string to minutes since midnight
function timeToMinutes(time: string): number {
  if (!time || !time.includes(':')) {
    return 0 // Default to midnight for invalid time
  }
  const parts = time.split(':')
  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)
  if (isNaN(hours) || isNaN(minutes)) {
    return 0
  }
  return hours * 60 + minutes
}

// Helper to format date as YYYY-MM-DD in local timezone
function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Parse a start time from a time_schedule string (e.g., "Mandager, 18:00" -> "18:00").
// Logs a warning and falls back to '09:00' when the regex does not match.
function parseStartTime(timeSchedule: string | null | undefined): string {
  if (!timeSchedule) {
    console.warn(
      '[courses] parseStartTime: time_schedule is empty/null — defaulting to "09:00"'
    )
    return '09:00'
  }
  const match = timeSchedule.match(/(\d{1,2}:\d{2})/)
  if (!match) {
    console.warn(
      `[courses] parseStartTime: could not extract time from "${timeSchedule}" — defaulting to "09:00"`
    )
    return '09:00'
  }
  return match[1]
}

// Generate session date/time entries based on the course type.
// Returns an array of { date, startTime } objects that can be used both for
// conflict checking and for inserting course_sessions rows.
function generateSessionDates(
  courseData: CourseInsert,
  startTime: string,
  options?: {
    eventDays?: number
    sessionTimeOverrides?: SessionTimeOverride[]
  }
): { date: string; startTime: string }[] {
  if (!courseData.start_date) return []

  const baseDate = new Date(courseData.start_date + 'T12:00:00') // noon avoids timezone drift
  const results: { date: string; startTime: string }[] = []

  if (courseData.course_type === 'course-series' && courseData.total_weeks) {
    for (let i = 0; i < courseData.total_weeks; i++) {
      const d = new Date(baseDate.getTime())
      d.setDate(baseDate.getDate() + i * 7)
      results.push({ date: formatLocalDate(d), startTime })
    }
  } else if (courseData.course_type === 'event') {
    const eventDays = options?.eventDays || 1
    const overrides = options?.sessionTimeOverrides || []

    for (let i = 0; i < eventDays; i++) {
      const d = new Date(baseDate.getTime())
      d.setDate(baseDate.getDate() + i)
      const override = overrides.find(o => o.dayIndex === i)
      results.push({
        date: formatLocalDate(d),
        startTime: override?.time || startTime,
      })
    }
  }

  return results
}

// Insert course sessions and set end_date on the course.
// If the session insert fails the course row is deleted so no orphan remains.
async function insertCourseSessionsOrRollback(
  courseId: string,
  sessionEntries: { date: string; startTime: string }[]
): Promise<{ error: Error | null }> {
  if (sessionEntries.length === 0) return { error: null }

  // Compute and set end_date (last session's date)
  if (sessionEntries.length > 1) {
    const endDate = sessionEntries[sessionEntries.length - 1].date
    await typedFrom('courses')
      .update({ end_date: endDate })
      .eq('id', courseId)
  }

  const sessions: CourseSessionInsert[] = sessionEntries.map((entry, i) => ({
    course_id: courseId,
    session_number: i + 1,
    session_date: entry.date,
    start_time: entry.startTime,
    status: 'upcoming' as const,
  }))

  const { error: sessionsError } = await typedFrom('course_sessions').insert(sessions)
  if (sessionsError) {
    // Rollback: delete the orphaned course
    await typedFrom('courses').delete().eq('id', courseId)
    return { error: sessionsError as Error }
  }

  return { error: null }
}

// Create a new course (and auto-generate sessions for course series)
export async function createCourse(
  courseData: CourseInsert,
  options?: {
    eventDays?: number // Number of days for multi-day events
    sessionTimeOverrides?: SessionTimeOverride[] // Custom times for specific days
    skipConflictCheck?: boolean // Skip conflict validation (for testing/admin)
  }
): Promise<{ data: Course | null; error: Error | null; conflicts?: ScheduleConflict[] }> {
  const startTime = parseStartTime(courseData.time_schedule)
  const duration = courseData.duration || 60

  // Generate the session dates once — reused for both conflict check and insert
  const sessionEntries = generateSessionDates(courseData, startTime, options)

  // --- Conflict check ---
  if (!options?.skipConflictCheck && courseData.start_date && courseData.organization_id && sessionEntries.length > 0) {
    const plannedSessions = sessionEntries.map(e => ({
      date: e.date,
      startTime: e.startTime,
      duration,
    }))

    const { conflicts, error: conflictError } = await checkScheduleConflicts(
      courseData.organization_id,
      plannedSessions
    )

    if (conflictError) {
      return { data: null, error: conflictError }
    }

    if (conflicts.length > 0) {
      return {
        data: null,
        error: new Error('Det finnes allerede et kurs på dette tidspunktet'),
        conflicts
      }
    }
  }

  // --- Insert the course row ---
  const { data, error } = await typedFrom('courses')
    .insert(courseData)
    .select()
    .single()

  if (error) {
    // Check if it's an idempotency key collision (same course already exists)
    const pgError = error as { code?: string; message?: string }
    if (pgError.code === '23505' && pgError.message?.includes('idempotency_key')) {
      // Fetch the existing course with this idempotency key
      if (courseData.idempotency_key && courseData.organization_id) {
        const { data: existing } = await supabase
          .from('courses')
          .select('*')
          .eq('organization_id', courseData.organization_id)
          .eq('idempotency_key', courseData.idempotency_key)
          .single()

        if (existing) {
          // Return the existing course (idempotent behavior)
          return { data: existing as Course, error: null }
        }
      }
    }
    return { data: null, error: error as Error }
  }

  const course = data as Course

  // --- Insert sessions (with rollback on failure) ---
  const { error: sessionsError } = await insertCourseSessionsOrRollback(
    course.id,
    sessionEntries
  )
  if (sessionsError) {
    return { data: null, error: sessionsError }
  }

  return { data: course, error: null }
}

// Update a course
export async function updateCourse(courseId: string, courseData: CourseUpdate): Promise<{ data: Course | null; error: Error | null }> {
  const { data, error } = await typedFrom('courses')
    .update(courseData)
    .eq('id', courseId)
    .select()
    .single()

  if (error) {
    return { data: null, error: error as Error }
  }

  return { data: data as Course, error: null }
}

// Delete a course and its dependent records using a transaction via RPC
export async function deleteCourse(courseId: string): Promise<{ error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)('delete_course_cascade', {
    p_course_id: courseId
  })

  if (error) {
    return { error: error as Error }
  }

  return { error: null }
}

// Cancel course result
export interface CancelCourseResult {
  success: boolean
  refunds_processed: number
  refunds_failed: number
  notifications_sent: number
  total_refunded: number
  message: string
}

// Cancel a course with refunds and notifications
export async function cancelCourse(
  courseId: string,
  options?: { reason?: string; notify_participants?: boolean }
): Promise<{ data: CancelCourseResult | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('cancel-course', {
      body: {
        course_id: courseId,
        reason: options?.reason,
        notify_participants: options?.notify_participants ?? true
      }
    })

    if (error) {
      return { data: null, error: error as Error }
    }

    return { data: data as CancelCourseResult, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error')
    }
  }
}

// ============================================
// COURSE SESSIONS
// ============================================

// Fetch all sessions for a course
export async function fetchCourseSessions(courseId: string): Promise<{ data: CourseSession[] | null; error: Error | null }> {
  const { data, error } = await typedFrom('course_sessions')
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
  const { data, error } = await typedFrom('course_sessions')
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
    course: Course
    attendeeCount: number
  } | null
  error: Error | null
}> {
  // Get today's date in ISO format
  const today = new Date().toISOString().split('T')[0]

  // Find the next upcoming session (exclude cancelled courses)
  const { data: sessionData, error: sessionError } = await supabase
    .from('course_sessions')
    .select(`
      *,
      course:courses!inner(
        *
      )
    `)
    .eq('course.organization_id', organizationId)
    .neq('course.status', 'cancelled')
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

  const session = sessionData as unknown as SessionWithFullCourseJoin
  const course = session.course as Course

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

// Fetch upcoming sessions for the week (for dashboard "Dine kurs" component)
export async function fetchWeekSessions(organizationId: string, limit = 6): Promise<{
  data: Array<{
    session: CourseSession
    course: Course
  }> | null
  error: Error | null
}> {
  // Get today and end of week dates
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Get end of week (Sunday)
  const endOfWeek = new Date(today)
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()))
  const endOfWeekStr = endOfWeek.toISOString().split('T')[0]

  const { data: sessionsData, error: sessionsError } = await supabase
    .from('course_sessions')
    .select(`
      *,
      course:courses!inner(
        *
      )
    `)
    .eq('course.organization_id', organizationId)
    .neq('course.status', 'cancelled')
    .neq('course.status', 'completed')
    .gte('session_date', todayStr)
    .lte('session_date', endOfWeekStr)
    .eq('status', 'upcoming')
    .order('session_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(limit)

  if (sessionsError) {
    return { data: null, error: sessionsError as Error }
  }

  if (!sessionsData || sessionsData.length === 0) {
    return { data: [], error: null }
  }

  const typedResults = sessionsData as unknown as SessionWithFullCourseJoin[]
  const results = typedResults.map(session => ({
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
    } as CourseSession,
    course: session.course as Course,
  }))

  return { data: results, error: null }
}

// Generate sessions for an existing course (useful for updating week count)
export async function generateCourseSessions(
  courseId: string,
  startDate: string,
  weekCount: number,
  startTime: string
): Promise<{ error: Error | null }> {
  // Fetch existing sessions first so we can restore on failure
  const { data: existingSessions } = await typedFrom('course_sessions')
    .select('*')
    .eq('course_id', courseId)

  // Delete existing sessions
  const { error: deleteError } = await typedFrom('course_sessions')
    .delete()
    .eq('course_id', courseId)

  if (deleteError) {
    return { error: deleteError as Error }
  }

  // Generate new sessions
  const sessions: CourseSessionInsert[] = []
  const baseDate = new Date(startDate + 'T12:00:00') // noon avoids timezone drift

  for (let i = 0; i < weekCount; i++) {
    const sessionDate = new Date(baseDate)
    sessionDate.setDate(baseDate.getDate() + (i * 7))
    sessions.push({
      course_id: courseId,
      session_number: i + 1,
      session_date: formatLocalDate(sessionDate),
      start_time: startTime,
      status: 'upcoming',
    })
  }

  const { error } = await typedFrom('course_sessions').insert(sessions)

  if (error) {
    // Rollback: re-insert the original sessions so the course isn't left empty
    if (existingSessions && existingSessions.length > 0) {
      const rollbackSessions = (existingSessions as CourseSession[]).map(s => ({
        course_id: s.course_id,
        session_number: s.session_number,
        session_date: s.session_date,
        start_time: s.start_time,
        end_time: s.end_time,
        status: s.status,
        notes: s.notes,
      }))
      await typedFrom('course_sessions').insert(rollbackSessions).catch((rollbackErr: unknown) => {
        console.error('CRITICAL: Rollback of course sessions failed:', rollbackErr)
      })
    }
    return { error: error as Error }
  }

  return { error: null }
}

