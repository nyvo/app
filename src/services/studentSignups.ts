import { supabase } from '@/lib/supabase'
import type { Signup, Course } from '@/types/database'

// Shared Supabase select string for student signup queries
const SIGNUP_WITH_COURSE_SELECT = `
  *,
  course:courses!inner(
    id,
    title,
    description,
    course_type,
    location,
    time_schedule,
    start_date,
    end_date,
    duration,
    price,
    image_url,
    level,
    instructor_id,
    instructor:profiles!courses_instructor_id_fkey(
      name,
      avatar_url
    )
  )
` as const

// Student signup with full course and instructor details
export interface StudentSignupWithCourse extends Signup {
  course: (Pick<Course, 'id' | 'title' | 'description' | 'course_type' | 'location' | 'time_schedule' | 'start_date' | 'end_date' | 'duration' | 'price' | 'image_url' | 'level' | 'instructor_id'> & {
    instructor?: {
      name: string | null
      avatar_url: string | null
    } | null
  }) | null
}

// Fetch upcoming signups for a student
export async function fetchUpcomingSignups(
  userId: string,
  email: string
): Promise<{ data: StudentSignupWithCourse[] | null; error: Error | null }> {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('signups')
    .select(SIGNUP_WITH_COURSE_SELECT)
    .or(`user_id.eq.${userId},participant_email.eq.${email}`)
    .eq('status', 'confirmed')
    .gte('courses.start_date', today)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: error as Error }
  }

  // Sort by course start_date in JavaScript since we can't do it in the query
  const sortedData = ((data || []) as unknown as StudentSignupWithCourse[]).sort((a, b) => {
    const dateA = a.course?.start_date ? new Date(a.course.start_date).getTime() : 0
    const dateB = b.course?.start_date ? new Date(b.course.start_date).getTime() : 0
    return dateA - dateB
  })

  return { data: sortedData as unknown as StudentSignupWithCourse[], error: null }
}

// Fetch past signups for a student
export async function fetchPastSignups(
  userId: string,
  email: string
): Promise<{ data: StudentSignupWithCourse[] | null; error: Error | null }> {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('signups')
    .select(SIGNUP_WITH_COURSE_SELECT)
    .or(`user_id.eq.${userId},participant_email.eq.${email}`)
    .eq('status', 'confirmed')
    .lt('courses.end_date', today)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: error as Error }
  }

  // Sort by course end_date in JavaScript since we can't do it in the query
  const sortedData = ((data || []) as unknown as StudentSignupWithCourse[]).sort((a, b) => {
    const dateA = a.course?.end_date ? new Date(a.course.end_date).getTime() : 0
    const dateB = b.course?.end_date ? new Date(b.course.end_date).getTime() : 0
    return dateB - dateA // Descending order (most recent first)
  })

  return { data: sortedData as unknown as StudentSignupWithCourse[], error: null }
}

// Cancellation result with refund info
export interface CancellationResult {
  success: boolean
  refunded: boolean
  refund_amount: number
  message: string
  error?: string
}

// Cancel a signup with refund processing
export async function cancelMySignup(
  signupId: string
): Promise<{ data: CancellationResult | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('process-refund', {
      body: { signup_id: signupId }
    })

    if (error) {
      return { data: null, error: error as Error }
    }

    return { data: data as CancellationResult, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Ukjent feil')
    }
  }
}

// Link guest bookings to the authenticated user's account.
// Uses a server-side RPC that looks up the caller's email via auth.uid(),
// so the client cannot spoof userId or email.
export async function linkGuestBookings(): Promise<{ count: number; error: Error | null }> {
  const { data, error } = await supabase.rpc('link_guest_bookings')

  if (error) {
    return { count: 0, error: error as Error }
  }

  return { count: (data as number) || 0, error: null }
}

