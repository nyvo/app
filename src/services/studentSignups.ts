import { supabase } from '@/lib/supabase'
import type { Signup, Course, CourseStyle } from '@/types/database'

// Student signup with full course details
export interface StudentSignupWithCourse extends Signup {
  course: (Pick<Course, 'id' | 'title' | 'description' | 'course_type' | 'location' | 'time_schedule' | 'start_date' | 'end_date' | 'duration' | 'price' | 'image_url' | 'level'> & {
    style: CourseStyle | null
  }) | null
}

// Fetch all signups for a student (by user_id or participant_email)
export async function fetchMySignups(
  userId: string,
  email: string
): Promise<{ data: StudentSignupWithCourse[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('signups')
    .select(`
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
        style:course_styles(*)
      )
    `)
    .or(`user_id.eq.${userId},participant_email.eq.${email}`)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: error as Error }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { data: data as any as StudentSignupWithCourse[], error: null }
}

// Fetch upcoming signups for a student
export async function fetchUpcomingSignups(
  userId: string,
  email: string
): Promise<{ data: StudentSignupWithCourse[] | null; error: Error | null }> {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('signups')
    .select(`
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
        style:course_styles(*)
      )
    `)
    .or(`user_id.eq.${userId},participant_email.eq.${email}`)
    .eq('status', 'confirmed')
    .gte('courses.start_date', today)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: error as Error }
  }

  // Sort by course start_date in JavaScript since we can't do it in the query
  const sortedData = (data || []).sort((a, b) => {
    const dateA = a.course?.start_date ? new Date(a.course.start_date).getTime() : 0
    const dateB = b.course?.start_date ? new Date(b.course.start_date).getTime() : 0
    return dateA - dateB
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { data: sortedData as any as StudentSignupWithCourse[], error: null }
}

// Fetch past signups for a student
export async function fetchPastSignups(
  userId: string,
  email: string
): Promise<{ data: StudentSignupWithCourse[] | null; error: Error | null }> {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('signups')
    .select(`
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
        style:course_styles(*)
      )
    `)
    .or(`user_id.eq.${userId},participant_email.eq.${email}`)
    .eq('status', 'confirmed')
    .lt('courses.end_date', today)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: error as Error }
  }

  // Sort by course end_date in JavaScript since we can't do it in the query
  const sortedData = (data || []).sort((a, b) => {
    const dateA = a.course?.end_date ? new Date(a.course.end_date).getTime() : 0
    const dateB = b.course?.end_date ? new Date(b.course.end_date).getTime() : 0
    return dateB - dateA // Descending order (most recent first)
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { data: sortedData as any as StudentSignupWithCourse[], error: null }
}

// Cancel a signup
export async function cancelMySignup(
  signupId: string
): Promise<{ error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase
    .from('signups') as any)
    .update({ status: 'cancelled' })
    .eq('id', signupId)

  if (error) {
    return { error: error as Error }
  }

  return { error: null }
}

// Link bookings without user_id to student account after registration
export async function linkGuestBookingsToUser(
  userId: string,
  email: string
): Promise<{ count: number; error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from('signups') as any)
    .update({ user_id: userId })
    .eq('participant_email', email)
    .is('user_id', null)
    .select('id')

  if (error) {
    return { count: 0, error: error as Error }
  }

  return { count: data?.length || 0, error: null }
}

// Check if student is already signed up for a course
export async function checkIfAlreadySignedUp(
  courseId: string,
  userId: string,
  email: string
): Promise<{ isSignedUp: boolean; signupStatus: string | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('signups')
    .select('status')
    .eq('course_id', courseId)
    .or(`user_id.eq.${userId},participant_email.eq.${email}`)
    .neq('status', 'cancelled')
    .maybeSingle()

  if (error) {
    return { isSignedUp: false, signupStatus: null, error: error as Error }
  }

  return {
    isSignedUp: !!data,
    signupStatus: data?.status || null,
    error: null
  }
}
