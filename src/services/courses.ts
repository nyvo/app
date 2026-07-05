import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { formatLocalDateKey, osloTodayKey } from '@/utils/dateUtils'
import type {
  Course,
  CourseInsert,
  CourseUpdate,
  CourseSession,
  CourseSessionInsert,
  CourseSessionUpdate,
  CourseFormat,
  DeliveryMode,
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
    seller_id: string
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

// Pagination options for course queries
export interface PaginationOptions {
  limit?: number
  offset?: number
}

export async function fetchCourses(
  sellerId: string,
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
    .eq('seller_id', sellerId)
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

/** Explicit per-day spec for multi-day single courses (arbitrary dates + times). */
export interface SessionDaySpec {
  date: string      // YYYY-MM-DD
  startTime: string // HH:MM
  endTime: string   // HH:MM
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


// Existing session info for conflict warnings
export interface ExistingSession {
  courseTitle: string
  startTime: string
  endTime: string
  startMinutes: number
  endMinutes: number
  date: string
}

// Fetch existing sessions for given dates within a seller's catalogue.
export async function fetchExistingSessions(
  sellerId: string,
  dates: string[]
): Promise<{ data: ExistingSession[]; error: Error | null }> {
  if (dates.length === 0) return { data: [], error: null }

  const { data: sessions, error } = await supabase.from('course_sessions')
    .select(`
      session_date,
      start_time,
      course:courses!inner(
        id,
        title,
        seller_id,
        duration,
        status
      )
    `)
    .in('session_date', dates)
    .eq('course.seller_id', sellerId)
    .neq('course.status', 'cancelled')
    .neq('status', 'cancelled')

  if (error) return { data: [], error: error as Error }
  if (!sessions || sessions.length === 0) return { data: [], error: null }

  const typed = sessions as unknown as SessionWithCourseJoin[]
  const result: ExistingSession[] = typed.map(s => {
    const start = timeToMinutes(s.start_time)
    const dur = s.course.duration > 0 ? s.course.duration : 60
    const endMin = start + dur
    const endH = Math.floor(endMin / 60).toString().padStart(2, '0')
    const endM = (endMin % 60).toString().padStart(2, '0')
    return {
      courseTitle: s.course.title,
      startTime: s.start_time.slice(0, 5),
      endTime: `${endH}:${endM}`,
      startMinutes: start,
      endMinutes: endMin,
      date: s.session_date,
    }
  })

  return { data: result, error: null }
}

// Parse a start time from a time_schedule string (e.g., "Mandager, 18:00" -> "18:00").
// Logs a warning and falls back to '09:00' when the regex does not match.
function parseStartTime(timeSchedule: string | null | undefined): string {
  if (!timeSchedule) {
    logger.warn(
      '[courses] parseStartTime: time_schedule is empty/null — defaulting to "09:00"'
    )
    return '09:00'
  }
  const match = timeSchedule.match(/(\d{1,2}:\d{2})/)
  if (!match) {
    logger.warn(
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
  courseData: Omit<CourseInsert, 'slug'>,
  startTime: string,
  options?: {
    eventDays?: number
    sessionTimeOverrides?: SessionTimeOverride[]
  }
): { date: string; startTime: string }[] {
  if (!courseData.start_date) return []

  const baseDate = new Date(courseData.start_date + 'T12:00:00') // noon avoids timezone drift
  const results: { date: string; startTime: string }[] = []

  if (courseData.format === 'series' && courseData.total_weeks) {
    for (let i = 0; i < courseData.total_weeks; i++) {
      const d = new Date(baseDate.getTime())
      d.setDate(baseDate.getDate() + i * 7)
      results.push({ date: formatLocalDateKey(d), startTime })
    }
  } else if (courseData.format === 'single') {
    const eventDays = options?.eventDays || 1
    const overrides = options?.sessionTimeOverrides || []

    for (let i = 0; i < eventDays; i++) {
      const d = new Date(baseDate.getTime())
      d.setDate(baseDate.getDate() + i)
      const override = overrides.find(o => o.dayIndex === i)
      results.push({
        date: formatLocalDateKey(d),
        startTime: override?.time || startTime,
      })
    }
  }

  return results
}

// Insert course sessions. courses.start_date/end_date are derived from the
// session rows by the sync_course_date_bounds DB trigger — no manual sync.
// If the session insert fails the course row is deleted so no orphan remains.
async function insertCourseSessionsOrRollback(
  courseId: string,
  sessionEntries: { date: string; startTime: string; endTime?: string }[]
): Promise<{ error: Error | null }> {
  if (sessionEntries.length === 0) return { error: null }

  const sessions: CourseSessionInsert[] = sessionEntries.map((entry, i) => ({
    course_id: courseId,
    session_number: i + 1,
    session_date: entry.date,
    start_time: entry.startTime,
    end_time: entry.endTime ?? null,
    status: 'upcoming' as const,
  }))

  const { error: sessionsError } = await supabase.from('course_sessions').insert(sessions)
  if (sessionsError) {
    // Rollback: delete the orphaned course
    await supabase.from('courses').delete().eq('id', courseId)
    return { error: sessionsError as Error }
  }

  return { error: null }
}

/**
 * Generate a URL-safe slug from a course title using the same Norwegian-aware
 * rules as `ensure_seller_for_user` (`_normalize_slug` in the DB) — keeps
 * the client and server in sync on what a slug looks like.
 */
function slugifyTitle(title: string): string {
  let s = title.toLowerCase()
  s = s.replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
  s = s.replace(/[^a-z0-9]+/g, '-')
  s = s.replace(/^-+|-+$/g, '')
  s = s.slice(0, 60)
  return s
}

// Create a new course (and auto-generate sessions for course series).
// The course slug is generated from the title inside this function; callers
// don't pass it. On collision, retry with -2, -3, … suffixes. Globally unique.
export async function createCourse(
  courseData: Omit<CourseInsert, 'slug'>,
  options?: {
    eventDays?: number // Number of days for multi-day events
    sessionTimeOverrides?: SessionTimeOverride[] // Custom times for specific days
    sessionDays?: SessionDaySpec[] // Explicit per-day specs (arbitrary dates + times)
  }
): Promise<{ data: Course | null; error: Error | null }> {
  const startTime = parseStartTime(courseData.time_schedule)

  // When explicit per-day specs are provided, use them verbatim; otherwise
  // fall back to the legacy consecutive-date generation.
  const sessionEntries: { date: string; startTime: string; endTime?: string }[] =
    options?.sessionDays && options.sessionDays.length > 0
      ? options.sessionDays.map((spec) => ({
          date: spec.date,
          startTime: spec.startTime,
          endTime: spec.endTime,
        }))
      : generateSessionDates(courseData, startTime, options)

  const baseSlug = slugifyTitle(courseData.title) || courseData.title.slice(0, 8)
  let data: Course | null = null
  let lastError: { code?: string; message?: string } | null = null

  for (let suffix = 0; suffix < 100; suffix++) {
    const candidateSlug = suffix === 0
      ? baseSlug
      : `${baseSlug.slice(0, 60 - 1 - String(suffix).length)}-${suffix}`

    const { data: inserted, error } = await supabase.from('courses')
      .insert({ ...courseData, slug: candidateSlug })
      .select()
      .single()

    if (!error) {
      data = inserted as Course
      break
    }

    const pgError = error as { code?: string; message?: string }
    lastError = pgError

    // Idempotency-key collision → return the existing course.
    if (pgError.code === '23505' && pgError.message?.includes('idempotency_key')) {
      if (courseData.idempotency_key && courseData.seller_id) {
        const { data: existing } = await supabase
          .from('courses')
          .select('*')
          .eq('seller_id', courseData.seller_id)
          .eq('idempotency_key', courseData.idempotency_key)
          .single()
        if (existing) return { data: existing as Course, error: null }
      }
      return { data: null, error: error as Error }
    }

    // Slug-collision → retry with next suffix.
    if (pgError.code === '23505' && pgError.message?.includes('courses_slug_unique')) {
      continue
    }

    // Other error → bail.
    return { data: null, error: error as Error }
  }

  if (!data) {
    return { data: null, error: new Error(lastError?.message || 'Kunne ikke opprette unik lenke for kurset') }
  }

  const course = data as Course

  const { error: sessionsError } = await insertCourseSessionsOrRollback(
    course.id,
    sessionEntries
  )
  if (sessionsError) {
    return { data: null, error: sessionsError }
  }

  return { data: course, error: null }
}

export async function updateCourse(courseId: string, courseData: CourseUpdate): Promise<{ data: Course | null; error: Error | null }> {
  const { data, error } = await supabase.from('courses')
    .update(courseData)
    .eq('id', courseId)
    .select()
    .single()

  if (error) {
    return { data: null, error: error as Error }
  }

  return { data: data as Course, error: null }
}

/**
 * Toggle drop-in availability for a course. Single source of truth — the
 * existence of an `is_active=true` drop-in tier row on `course_signup_packages`
 * is the policy. The RPC `available_ticket_types` gates the runtime exposure
 * (course must be a series, started, with spots open) and returns the explicit
 * drop-in price stored on the tier row.
 *
 * - `enabled=true` upserts/reactivates the drop-in tier.
 * - `enabled=false` deactivates it (preserves the row so past signups' FKs
 *   remain valid).
 *
 * The stored `price` column on the tier row is what buyers see and pay.
 */
export async function syncCourseDropInTier(
  courseId: string,
  enabled: boolean,
  price: number = 0,
): Promise<{ error: Error | null }> {
  const { data: existing, error: fetchError } = await supabase
    .from('course_signup_packages')
    .select('id')
    .eq('course_id', courseId)
    .eq('ticket_kind', 'drop_in')
    .maybeSingle()

  if (fetchError) return { error: fetchError as Error }

  if (!enabled) {
    if (!existing) return { error: null }
    const { error: updateError } = await supabase
      .from('course_signup_packages')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    return { error: updateError as Error | null }
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from('course_signup_packages')
      .update({
        is_active: true,
        label: 'Drop-in',
        price,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    return { error: updateError as Error | null }
  }

  const { error: insertError } = await supabase
    .from('course_signup_packages')
    .insert({
      course_id: courseId,
      label: 'Drop-in',
      ticket_kind: 'drop_in',
      audience: 'standard',
      price,
      is_active: true,
      is_default: false,
    })
  return { error: insertError as Error | null }
}

/**
 * Returns the active drop-in tier row for the course.
 * This is the canonical "is drop-in offered?" check the teacher UI reads.
 */
export async function fetchDropInTier(courseId: string): Promise<{ active: boolean; price: number }> {
  const { data } = await supabase
    .from('course_signup_packages')
    .select('id, price')
    .eq('course_id', courseId)
    .eq('ticket_kind', 'drop_in')
    .eq('is_active', true)
    .maybeSingle()
  return { active: !!data, price: data ? Number((data as { price: number }).price) : 0 }
}

// Publish a draft course (sets status to 'upcoming')
export async function publishCourse(courseId: string): Promise<{ data: Course | null; error: Error | null }> {
  return updateCourse(courseId, { status: 'upcoming' })
}

// Unpublish a course (sets status back to 'draft')
export async function unpublishCourse(courseId: string): Promise<{ data: Course | null; error: Error | null }> {
  return updateCourse(courseId, { status: 'draft' })
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
      error: err instanceof Error ? err : new Error('Ukjent feil')
    }
  }
}

export async function fetchCourseSessions(courseId: string): Promise<{ data: CourseSession[] | null; error: Error | null }> {
  const { data, error } = await supabase.from('course_sessions')
    .select('*')
    .eq('course_id', courseId)
    .order('session_number', { ascending: true })

  if (error) {
    return { data: null, error: error as Error }
  }

  return { data: data as CourseSession[], error: null }
}

export async function updateCourseSession(
  sessionId: string,
  sessionData: CourseSessionUpdate
): Promise<{ data: CourseSession | null; error: Error | null }> {
  const { data, error } = await supabase.from('course_sessions')
    .update(sessionData)
    .eq('id', sessionId)
    .select()
    .single()

  if (error) {
    return { data: null, error: error as Error }
  }

  return { data: data as CourseSession, error: null }
}

/**
 * Insert a single new session row for a draft single-format course.
 * Only call for courses in 'draft' status — a published course must go
 * through rescheduleCourseSession to notify participants.
 */
export async function createCourseSession(
  courseId: string,
  spec: { session_date: string; start_time: string; end_time: string; session_number: number },
): Promise<{ data: CourseSession | null; error: Error | null }> {
  const { data, error } = await supabase.from('course_sessions')
    .insert({
      course_id: courseId,
      session_date: spec.session_date,
      start_time: spec.start_time,
      end_time: spec.end_time || null,
      session_number: spec.session_number,
      status: 'upcoming' as const,
    })
    .select()
    .single()

  if (error) {
    return { data: null, error: error as Error }
  }

  return { data: data as CourseSession, error: null }
}

/**
 * Delete a single session row. ONLY safe for draft courses that have no
 * signups referencing this session (course_session_id FK on signups/
 * payment_attempts). Caller MUST verify status === 'draft' before calling.
 */
export async function deleteCourseSession(sessionId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('course_sessions')
    .delete()
    .eq('id', sessionId)

  if (error) {
    return { error: error as Error }
  }

  return { error: null }
}

/**
 * Permanently delete a course and all its dependent rows (sessions,
 * tickets, etc.). Wraps the `delete_course_cascade` Postgres function,
 * which enforces ownership via SECURITY DEFINER + an explicit check.
 *
 * Destructive — no undo. Caller must confirm before invoking.
 */
export async function deleteCourse(courseId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.rpc('delete_course_cascade', { p_course_id: courseId })
  if (error) return { error: error as Error }
  return { error: null }
}

/**
 * Send a custom message from the teacher to every confirmed participant
 * on a course. Goes through the send-course-message edge function which
 * validates ownership and fans out via the course-message email template.
 *
 * Returns the count of emails dispatched. Failures are reported in
 * `failed` — individual email failures do not abort the run.
 */
export async function sendCourseMessage(input: {
  courseId: string
  body: string
}): Promise<{ data: { notified: number; failed: number } | null; error: Error | null }> {
  const { data, error } = await supabase.functions.invoke('send-course-message', {
    body: {
      course_id: input.courseId,
      body: input.body,
    },
  })

  if (error) return { data: null, error: error as Error }
  const result = data as { notified?: number; failed?: number }
  return { data: { notified: result.notified ?? 0, failed: result.failed ?? 0 }, error: null }
}

/**
 * Reschedule a single session (date + start/end time) AND notify every
 * confirmed participant via the session-rescheduled email template.
 *
 * Goes through the `update-session` Edge Function (not direct table UPDATE)
 * because the notification fan-out needs the service role to read profile
 * emails. Use this from Oversikt's per-session edit modal.
 */
export async function rescheduleCourseSession(input: {
  sessionId: string
  newDate: string       // YYYY-MM-DD
  newStartTime: string  // HH:MM or HH:MM:SS
  newEndTime?: string
}): Promise<{ data: { notified: number; failed: number } | null; error: Error | null }> {
  const { data, error } = await supabase.functions.invoke('update-session', {
    body: {
      session_id: input.sessionId,
      new_date: input.newDate,
      new_start_time: input.newStartTime,
      new_end_time: input.newEndTime,
    },
  })

  if (error) {
    return { data: null, error: error as Error }
  }

  const result = data as { notified?: number; failed?: number }
  return {
    data: { notified: result.notified ?? 0, failed: result.failed ?? 0 },
    error: null,
  }
}

// Fetch the next N upcoming sessions (future only, no week limit)
export async function fetchNextSessions(sellerId: string, limit = 3): Promise<{
  data: Array<{
    session: CourseSession
    course: Course
    signupCount: number
  }> | null
  error: Error | null
}> {
  const today = osloTodayKey()

  const { data: sessionsData, error: sessionsError } = await supabase
    .from('course_sessions')
    .select(`
      *,
      course:courses!inner(*)
    `)
    .eq('course.seller_id', sellerId)
    .neq('course.status', 'cancelled')
    .neq('course.status', 'completed')
    .gte('session_date', today)
    .eq('status', 'upcoming')
    .order('session_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(limit + 5) // fetch extra to filter out past start times

  if (sessionsError) {
    return { data: null, error: sessionsError as Error }
  }

  if (!sessionsData || sessionsData.length === 0) {
    return { data: [], error: null }
  }

  // Filter out sessions whose start time has already passed today
  const now = new Date()
  const typedResults = sessionsData as unknown as SessionWithFullCourseJoin[]
  const filtered = typedResults.filter(session => {
    if (session.session_date > today) return true
    // Same day — check if start time is in the future
    const timeParts = session.start_time?.split(':')
    if (!timeParts || timeParts.length < 2) return false
    const sessionTime = new Date()
    sessionTime.setHours(Number(timeParts[0]), Number(timeParts[1]), 0, 0)
    return sessionTime.getTime() > now.getTime()
  })

  const sliced = filtered.slice(0, limit)

  // Fetch confirmed signup counts for the courses in the result
  const courseIds = [...new Set(sliced.map(s => s.course_id))]
  const signupCountMap: Record<string, number> = {}

  if (courseIds.length > 0) {
    // Aggregate server-side — fetching signup rows to count in JS silently
    // truncates at PostgREST's 1000-row cap and undercounts busy studios.
    const { data: countRows } = await supabase.rpc('public_signup_counts', {
      p_course_ids: courseIds,
    })

    for (const row of countRows ?? []) {
      signupCountMap[row.course_id] = row.confirmed_count
    }
  }

  return {
    data: sliced.map(session => ({
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
      signupCount: signupCountMap[session.course_id] || 0,
    })),
    error: null,
  }
}

// Type for session schedule table rows (teacher admin view)
export interface SessionScheduleRow {
  sessionId: string
  courseId: string
  courseTitle: string
  courseFormat: CourseFormat
  deliveryMode: DeliveryMode
  sessionDate: string        // YYYY-MM-DD
  startTime: string          // HH:MM
  endTime: string            // HH:MM (calculated from duration if null)
  location: string
  price: number | null
  signupsCount: number
  maxParticipants: number | null
  courseStatus: string
  courseStartDate: string | null
  courseEndDate?: string | null
  totalWeeks?: number | null
  timeSchedule?: string | null
  imageUrl?: string | null
  allowsDropIn?: boolean | null
}
