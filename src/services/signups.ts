import { supabase } from '@/lib/supabase'
import type { Signup, SignupInsert, SignupUpdate, Profile, Course, SignupStatus } from '@/types/database'

// Signup with joined course and profile data
export interface SignupWithDetails extends Signup {
  course: Pick<Course, 'id' | 'title' | 'course_type' | 'time_schedule' | 'start_date'> | null
  profile: Pick<Profile, 'id' | 'name' | 'email' | 'avatar_url'> | null
}

// Signup with profile for participants list
export interface SignupWithProfile extends Signup {
  profile: Pick<Profile, 'id' | 'name' | 'email' | 'avatar_url'> | null
}

// Fetch recent signups for the dashboard
export async function fetchRecentSignups(
  organizationId: string,
  limit: number = 4
): Promise<{ data: SignupWithDetails[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('signups')
    .select(`
      *,
      course:courses!inner(id, title, course_type, time_schedule, start_date),
      profile:profiles(id, name, email, avatar_url)
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return { data: null, error: error as Error }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { data: data as any as SignupWithDetails[], error: null }
}

// Fetch signups for a specific course
export async function fetchSignupsByCourse(
  courseId: string
): Promise<{ data: SignupWithDetails[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('signups')
    .select(`
      *,
      course:courses(id, title, course_type, time_schedule, start_date),
      profile:profiles(id, name, email, avatar_url)
    `)
    .eq('course_id', courseId)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: error as Error }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { data: data as any as SignupWithDetails[], error: null }
}

// Get signup counts by status for a course
export async function fetchSignupStats(courseId: string): Promise<{
  data: { confirmed: number; waitlist: number; cancelled: number } | null
  error: Error | null
}> {
  const { data, error } = await supabase
    .from('signups')
    .select('status')
    .eq('course_id', courseId)

  if (error) {
    return { data: null, error: error as Error }
  }

  const stats = {
    confirmed: 0,
    waitlist: 0,
    cancelled: 0
  }

  for (const signup of data || []) {
    if (signup.status in stats) {
      stats[signup.status as keyof typeof stats]++
    }
  }

  return { data: stats, error: null }
}

// ============================================
// CRUD OPERATIONS FOR BOOKING FLOW
// ============================================

// Create a new signup (for public booking)
export async function createSignup(
  signupData: SignupInsert
): Promise<{ data: Signup | null; error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from('signups') as any)
    .insert(signupData)
    .select()
    .single()

  if (error) {
    return { data: null, error: error as Error }
  }

  return { data: data as Signup, error: null }
}

// Update a signup
export async function updateSignup(
  signupId: string,
  signupData: SignupUpdate
): Promise<{ data: Signup | null; error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from('signups') as any)
    .update(signupData)
    .eq('id', signupId)
    .select()
    .single()

  if (error) {
    return { data: null, error: error as Error }
  }

  return { data: data as Signup, error: null }
}

// Update signup status only
export async function updateSignupStatus(
  signupId: string,
  status: SignupStatus
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('signups')
    .update({ status })
    .eq('id', signupId)

  if (error) {
    return { error: error as Error }
  }

  return { error: null }
}

// Fetch signups for a course with profile data (for participants tab)
export async function fetchSignupsByCourseWithProfiles(
  courseId: string
): Promise<{ data: SignupWithProfile[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('signups')
    .select(`
      *,
      profile:profiles(id, name, email, avatar_url)
    `)
    .eq('course_id', courseId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: error as Error }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { data: data as any as SignupWithProfile[], error: null }
}

// Fetch all signups for an organization (for SignupsPage)
export async function fetchAllSignups(
  organizationId: string
): Promise<{ data: SignupWithDetails[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('signups')
    .select(`
      *,
      course:courses(id, title, course_type, time_schedule, start_date),
      profile:profiles(id, name, email, avatar_url)
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: error as Error }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { data: data as any as SignupWithDetails[], error: null }
}

// Check course availability (spots remaining)
export async function checkCourseAvailability(
  courseId: string
): Promise<{ available: number; total: number; error: Error | null }> {
  // Get course capacity
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('max_participants')
    .eq('id', courseId)
    .single()

  if (courseError) {
    return { available: 0, total: 0, error: courseError as Error }
  }

  const total = course?.max_participants || 0

  // Count confirmed signups
  const { count, error: countError } = await supabase
    .from('signups')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .eq('status', 'confirmed')

  if (countError) {
    return { available: 0, total, error: countError as Error }
  }

  const confirmed = count || 0
  const available = Math.max(0, total - confirmed)

  return { available, total, error: null }
}
