import { supabase } from '@/lib/supabase'

export interface JoinWaitlistParams {
  courseId: string
  organizationId: string
  customerEmail: string
  customerName: string
  customerPhone?: string
}

export interface JoinWaitlistResult {
  success: boolean
  signup_id: string
  waitlist_position: number
  message: string
}

export interface WaitlistSignup {
  id: string
  participant_name: string | null
  participant_email: string | null
  waitlist_position: number | null
  offer_status: 'pending' | 'claimed' | 'expired' | 'skipped' | null
  offer_sent_at: string | null
  offer_expires_at: string | null
  created_at: string
}

// Join a course waitlist (free, no payment required)
export async function joinWaitlist(
  params: JoinWaitlistParams
): Promise<{ data: JoinWaitlistResult | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('join-waitlist', {
      body: {
        course_id: params.courseId,
        organization_id: params.organizationId,
        customer_email: params.customerEmail,
        customer_name: params.customerName,
        customer_phone: params.customerPhone
      }
    })

    if (error) {
      return { data: null, error: error.message || 'Kunne ikke legge til på ventelisten' }
    }

    if (data?.error) {
      return { data: null, error: data.error }
    }

    return { data: data as JoinWaitlistResult, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Ukjent feil'
    }
  }
}

// Get waitlist for a course (teacher view)
export async function fetchCourseWaitlist(
  courseId: string
): Promise<{ data: WaitlistSignup[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('signups')
    .select(`
      id,
      participant_name,
      participant_email,
      waitlist_position,
      offer_status,
      offer_sent_at,
      offer_expires_at,
      created_at
    `)
    .eq('course_id', courseId)
    .eq('status', 'waitlist')
    .order('waitlist_position', { ascending: true })

  if (error) {
    return { data: null, error: error as unknown as Error }
  }

  return { data: data as WaitlistSignup[], error: null }
}

// Get waitlist count for a course
export async function getWaitlistCount(
  courseId: string
): Promise<{ count: number; error: Error | null }> {
  const { count, error } = await supabase
    .from('signups')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .eq('status', 'waitlist')

  if (error) {
    return { count: 0, error: error as unknown as Error }
  }

  return { count: count || 0, error: null }
}

// Remove someone from waitlist (teacher action)
export async function removeFromWaitlist(
  signupId: string
): Promise<{ error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase
    .from('signups') as any)
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', signupId)

  if (error) {
    return { error: error as unknown as Error }
  }

  return { error: null }
}

// Promote someone from waitlist (teacher action) - sends payment link
export async function promoteFromWaitlist(
  signupId: string
): Promise<{ data: { success: boolean; message: string } | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('promote-waitlist-signup', {
      body: { signup_id: signupId }
    })

    if (error) {
      return { data: null, error: error.message || 'Kunne ikke promotere fra venteliste' }
    }

    if (data?.error) {
      return { data: null, error: data.error }
    }

    return { data: data, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Ukjent feil'
    }
  }
}

// Validate a claim token (for ClaimSpotPage)
export async function validateClaimToken(
  claimToken: string
): Promise<{
  data: {
    valid: boolean
    signup: {
      id: string
      participant_name: string
      participant_email: string
      offer_expires_at: string
      course: {
        id: string
        title: string
        price: number
        start_date: string
        time_schedule: string
        location: string
      }
      organization: {
        id: string
        name: string
        slug: string
      }
    } | null
  } | null
  error: string | null
}> {
  try {
    const { data, error } = await supabase.functions.invoke('validate-claim-token', {
      body: { claim_token: claimToken }
    })

    if (error) {
      return { data: null, error: error.message || 'Ugyldig lenke' }
    }

    if (data?.error) {
      return { data: null, error: data.error }
    }

    return { data: data, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Ukjent feil'
    }
  }
}
