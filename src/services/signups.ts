import { supabase, typedFrom } from '@/lib/supabase'
import type { Signup, SignupInsert, Profile, Course, PaymentStatus } from '@/types/database'

// Signup with joined course and profile data
export interface SignupWithDetails extends Signup {
  course: Pick<Course, 'id' | 'title' | 'course_type' | 'time_schedule' | 'start_date' | 'end_date' | 'status' | 'max_participants'> | null
  profile: Pick<Profile, 'id' | 'name' | 'email' | 'avatar_url'> | null
  // Exception detection fields (already on Signup, explicitly noted here)
  // payment_status is inherited from Signup
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

  return { data: data as unknown as SignupWithDetails[], error: null }
}

// ============================================
// CRUD OPERATIONS FOR BOOKING FLOW
// ============================================

// Create a new signup (for public booking)
export async function createSignup(
  signupData: SignupInsert
): Promise<{ data: Signup | null; error: Error | null }> {
  const { data, error } = await typedFrom('signups')
    .insert(signupData)
    .select()
    .single()

  if (error) {
    return { data: null, error: error as Error }
  }

  return { data: data as Signup, error: null }
}

// Send signup confirmation email (used for free courses where no webhook fires)
export async function sendSignupConfirmationEmail(courseId: string, signupId: string): Promise<void> {
  try {
    await supabase.functions.invoke('send-confirmation-email', {
      body: { courseId, signupId },
    })
  } catch (err) {
    // Non-blocking — don't fail the signup if email fails
    console.error('Failed to send confirmation email:', err)
  }
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

  return { data: data as unknown as SignupWithProfile[], error: null }
}

// Fetch all signups for an organization (for SignupsPage)
export async function fetchAllSignups(
  organizationId: string
): Promise<{ data: SignupWithDetails[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('signups')
    .select(`
      *,
      course:courses(id, title, course_type, time_schedule, start_date, end_date, status, max_participants),
      profile:profiles(id, name, email, avatar_url)
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: error as Error }
  }

  return { data: data as unknown as SignupWithDetails[], error: null }
}

// Check course availability (spots remaining).
// NOTE: This is a point-in-time estimate, NOT an atomic reservation.
// The real capacity guard is the `create_signup_if_available` RPC in the webhook.
// Do not use this result to decide whether a signup should proceed — only for UI display.
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

  const total = (course as unknown as { max_participants: number })?.max_participants || 0

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

// ============================================
// TEACHER ACTION FUNCTIONS
// ============================================

// Teacher-initiated cancellation with optional Stripe refund
export async function teacherCancelSignup(
  signupId: string,
  options?: { refund?: boolean; reason?: string }
): Promise<{ data: { success: boolean; refunded: boolean; message: string } | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('teacher-cancel-signup', {
      body: {
        signup_id: signupId,
        refund: options?.refund ?? false,
        reason: options?.reason,
      }
    })

    if (error) {
      return { data: null, error: new Error(error.message || 'Kunne ikke avbestille deltaker') }
    }

    if (data?.error) {
      return { data: null, error: new Error(data.error) }
    }

    return { data, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Ukjent feil')
    }
  }
}

// Send a new payment link to a participant
export async function sendPaymentLink(
  signupId: string
): Promise<{ data: { success: boolean; message: string } | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-payment-link', {
      body: { signup_id: signupId }
    })

    if (error) {
      return { data: null, error: new Error(error.message || 'Kunne ikke sende betalingslenke') }
    }

    if (data?.error) {
      return { data: null, error: new Error(data.error) }
    }

    return { data, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Ukjent feil')
    }
  }
}

// Mark a signup's payment as resolved (received outside Stripe)
export async function markPaymentResolved(
  signupId: string
): Promise<{ error: Error | null }> {
  const { error } = await typedFrom('signups')
    .update({ payment_status: 'paid' as PaymentStatus })
    .eq('id', signupId)

  return { error: error ? (error as Error) : null }
}

