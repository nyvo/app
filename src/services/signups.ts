import { supabase } from '@/lib/supabase'
import { extractEdgeError } from '@/lib/edge-errors'
import { UNKNOWN_ERROR } from '@/lib/error-strings'
import type { Signup, SignupInsert, Profile, Course } from '@/types/database'

// Signup with joined course, profile, and (for drop-ins) session data.
// `course_session` is populated from the FK on signups.course_session_id —
// only set for drop-in signups; package buyers have it null.
export interface SignupWithDetails extends Signup {
  course: Pick<Course, 'id' | 'title' | 'format' | 'delivery_mode' | 'time_schedule' | 'start_date' | 'end_date' | 'status' | 'max_participants' | 'total_weeks'> | null
  profile: Pick<Profile, 'id' | 'name' | 'email'> | null
  course_session: { session_date: string; start_time: string } | null
}

// Signup with profile + ticket price for participants list. The ticket price is
// joined from course_signup_packages so the row can display the *expected*
// amount even for pending/failed signups where amount_paid is null. This
// matches the Stripe/Polar convention: amount is always present, status
// communicates whether the money has cleared.
export interface SignupWithProfile extends Signup {
  profile: Pick<Profile, 'id' | 'name' | 'email'> | null
  // Optional: the course-participants query joins it for a price fallback, but
  // lighter callers (e.g. the dashboard "Siste påmeldinger" drawer) omit it.
  ticket_type?: { price: number } | null
}

// --- Buyer-side (claimed bookings) -----------------------------------------

// Signup row as the buyer dashboard needs it: course details plus the
// public storefront identity (seller name/logo/slug via column grants).
// Explicit column list, not `*` — the buyer owns these rows, but future
// signup columns must not silently start flowing to the client.
export interface BuyerSignup extends Pick<Signup,
  'id' | 'status' | 'amount_paid' | 'created_at'> {
  course: (Pick<Course, 'id' | 'title' | 'slug' | 'start_date' | 'end_date' | 'time_schedule' | 'location' | 'image_url'> & {
    seller: {
      name: string
      logo_url: string | null
      slug: string
    } | null
  }) | null
}

// Backfill signups.buyer_id for the current user by verified-email match.
// SECURITY DEFINER RPC (migration 20260611192342) — idempotent, never touches
// already-claimed rows. Returns how many rows were claimed.
export async function claimMySignups(): Promise<{ count: number; error: Error | null }> {
  const { data, error } = await supabase.rpc('claim_my_signups')

  if (error) {
    return { count: 0, error: error as Error }
  }
  return { count: (data as unknown as number) ?? 0, error: null }
}

// All signups claimed by the given user, newest first. Scoped on buyer_id
// explicitly — the SELECT RLS also exposes member rows to seller members,
// and this list must only ever show the user's own bookings.
export async function fetchMySignups(
  userId: string
): Promise<{ data: BuyerSignup[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('signups')
    .select(`
      id, status, amount_paid, created_at,
      course:courses(
        id, title, slug, start_date, end_date, time_schedule, location, image_url,
        seller:sellers(name, logo_url, slug)
      )
    `)
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: error as Error }
  }
  return { data: data as unknown as BuyerSignup[], error: null }
}

// Contact fields from the user's freshest claimed signup — prefills the
// buyer onboarding form so a post-booking signup is zero-typing.
export async function fetchLatestClaimedContact(
  userId: string
): Promise<{ data: { participant_name: string; participant_phone: string | null } | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('signups')
    .select('participant_name, participant_phone')
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return { data: null, error: error as Error }
  }
  return {
    data: data as { participant_name: string; participant_phone: string | null } | null,
    error: null,
  }
}

export async function fetchRecentSignups(
  sellerId: string,
  limit: number = 4
): Promise<{ data: SignupWithDetails[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('signups')
    .select(`
      *,
      course:courses!inner(id, title, format, delivery_mode, time_schedule, start_date),
      profile:profiles(id, name, email),
      course_session:course_sessions(session_date, start_time)
    `)
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return { data: null, error: error as Error }
  }

  return { data: data as unknown as SignupWithDetails[], error: null }
}

/**
 * Insert a signup. Manually-added participants (teacher-side) skip the
 * payment-aware RPC, so we resolve the course's default ticket tier here
 * and populate the required ticket_type_id + 3 snapshot fields. The caller
 * doesn't need to know about ticket types — they just supply participant
 * data + status. If the caller already specifies ticket_type_id, we trust
 * them and only fill in snapshots they didn't provide.
 */
export async function createSignup(
  signupData: Omit<SignupInsert,
    'ticket_type_id' | 'ticket_label_snapshot' | 'ticket_audience_snapshot' | 'ticket_kind_snapshot'>
    & Partial<Pick<SignupInsert,
      'ticket_type_id' | 'ticket_label_snapshot' | 'ticket_audience_snapshot' | 'ticket_kind_snapshot'>>
): Promise<{ data: Signup | null; error: Error | null }> {
  let resolved: SignupInsert

  if (signupData.ticket_type_id) {
    // Caller knows what they're doing — only backfill missing snapshots.
    if (!signupData.ticket_label_snapshot
        || !signupData.ticket_audience_snapshot
        || !signupData.ticket_kind_snapshot) {
      const { data: tier, error: tierErr } = await supabase
        .from('course_signup_packages')
        .select('label, audience, ticket_kind')
        .eq('id', signupData.ticket_type_id)
        .maybeSingle()

      if (tierErr || !tier) {
        return { data: null, error: new Error('Fant ikke billettypen') }
      }

      resolved = {
        ...signupData,
        ticket_type_id: signupData.ticket_type_id,
        ticket_label_snapshot: signupData.ticket_label_snapshot ?? (tier as { label: string }).label,
        ticket_audience_snapshot: signupData.ticket_audience_snapshot
          ?? (tier as { audience: SignupInsert['ticket_audience_snapshot'] }).audience!,
        ticket_kind_snapshot: signupData.ticket_kind_snapshot
          ?? (tier as { ticket_kind: SignupInsert['ticket_kind_snapshot'] }).ticket_kind!,
      }
    } else {
      resolved = signupData as SignupInsert
    }
  } else {
    // No tier specified — pick the course's default. This is the manual-add
    // path (teacher fills in a participant who paid by other means).
    const { data: defaultTier, error: defaultErr } = await supabase
      .from('course_signup_packages')
      .select('id, label, audience, ticket_kind')
      .eq('course_id', signupData.course_id)
      .eq('is_default', true)
      .maybeSingle()

    if (defaultErr || !defaultTier) {
      return {
        data: null,
        error: new Error('Kurset mangler en standard billettype. Opprett en før du legger til deltakere manuelt.'),
      }
    }

    const tier = defaultTier as {
      id: string
      label: string
      audience: NonNullable<SignupInsert['ticket_audience_snapshot']>
      ticket_kind: NonNullable<SignupInsert['ticket_kind_snapshot']>
    }
    resolved = {
      ...signupData,
      ticket_type_id: tier.id,
      ticket_label_snapshot: tier.label,
      ticket_audience_snapshot: tier.audience,
      ticket_kind_snapshot: tier.ticket_kind,
    }
  }

  const { data, error } = await supabase.from('signups')
    .insert(resolved)
    .select()
    .single()

  if (error) {
    return { data: null, error: error as Error }
  }

  return { data: data as Signup, error: null }
}

// Fetch signups for a course with profile data (for participants tab)
export async function fetchSignupsByCourseWithProfiles(
  courseId: string
): Promise<{ data: SignupWithProfile[] | null; error: Error | null }> {
  // Returns ALL signups for the course (confirmed + cancelled + course_cancelled).
  // The participants tab shows cancelled rows visually demoted rather than
  // hiding them outright — matches Stripe / Mindbody / Linear convention for
  // operational rosters where audit trail and reconciliation matter.
  const { data, error } = await supabase
    .from('signups')
    .select(`
      *,
      profile:profiles(id, name, email),
      ticket_type:course_signup_packages!ticket_type_id(price)
    `)
    .eq('course_id', courseId)
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: error as Error }
  }

  return { data: data as unknown as SignupWithProfile[], error: null }
}

export async function fetchAllSignups(
  sellerId: string
): Promise<{ data: SignupWithDetails[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('signups')
    .select(`
      *,
      course:courses(id, title, format, delivery_mode, time_schedule, start_date, end_date, status, max_participants, total_weeks),
      profile:profiles(id, name, email)
    `)
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    // PostgREST silently truncates at 1000 rows anyway — make the bound
    // deliberate (the 1000 most recent bookings) until this list gets real
    // pagination.
    .limit(1000)

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

  // NULL max_participants means UNLIMITED — the same convention the
  // create_signup_if_available RPC uses (it skips capacity checks when NULL).
  // The old `max_participants || 0` reported those courses as full (0 spots),
  // so a course bookable via checkout was blocked in the manual-add drawer.
  const rawMax = (course as unknown as { max_participants: number | null })?.max_participants
  const isUnlimited = rawMax === null || rawMax === undefined
  const total = isUnlimited ? Infinity : rawMax

  // Count confirmed signups via the public counts RPC. A direct count on
  // `signups` only works for seller members — anon (guest checkout) has no
  // SELECT on the table, so the old direct count errored and the checkout
  // pre-check read every paid course as "Kurset er fullt" for logged-out
  // buyers.
  const { data: counts, error: countError } = await supabase.rpc(
    'public_signup_counts',
    { p_course_ids: [courseId] },
  )

  if (countError) {
    return { available: isUnlimited ? Infinity : 0, total, error: countError as Error }
  }

  const confirmed = (counts as { course_id: string; confirmed_count: number }[] | null)
    ?.find((c) => c.course_id === courseId)?.confirmed_count ?? 0
  const available = isUnlimited ? Infinity : Math.max(0, total - confirmed)

  return { available, total, error: null }
}

// Teacher-initiated cancellation with optional refund
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
      // supabase-js wraps a non-2xx as a generic FunctionsHttpError; the edge function's
      // Norwegian message (e.g. the 409 partial-remainder notice, or a 500/502 Stripe error)
      // lives on error.context and is only readable via extractEdgeError.
      const { message } = await extractEdgeError(error)
      return { data: null, error: new Error(message || 'Kunne ikke avbestille deltaker') }
    }

    if (data?.error) {
      return { data: null, error: new Error(data.error) }
    }

    return { data, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(UNKNOWN_ERROR)
    }
  }
}

// Create a signup for a free course. Routes through an edge function that
// verifies the course price server-side and calls the atomic capacity RPC,
// so the client cannot forge a free signup for a paid course.
export async function createFreeSignup(input: {
  courseId: string
  participantName: string
  participantEmail: string
  /** Optional. Public signup form no longer collects phone (2026-04-25). */
  participantPhone?: string
  participantNote?: string
}): Promise<{ data: { signupId: string } | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('create-free-signup', {
      body: input,
    })

    if (error) {
      const { message } = await extractEdgeError(error)
      return { data: null, error: new Error(message || 'Kunne ikke fullføre påmelding') }
    }
    if (data?.error) {
      return { data: null, error: new Error(data.error) }
    }
    return { data: data as { signupId: string }, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(UNKNOWN_ERROR) }
  }
}

