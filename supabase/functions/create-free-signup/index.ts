// Server-side signup creation for free courses.
// The public booking page cannot be trusted to enforce "course is free" —
// this function verifies course.price <= 0 server-side before calling the
// atomic capacity RPC, closing the free-signup forgery hole that existed
// when the client inserted signups directly.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { handleCors, errorResponse, successResponse } from '../_shared/auth.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface CreateFreeSignupRequest {
  courseId: string
  participantName: string
  participantEmail: string
  participantPhone: string
  participantNote?: string
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const body: CreateFreeSignupRequest = await req.json()
    const { courseId, participantName, participantEmail, participantPhone, participantNote } = body

    if (!courseId || !participantName || !participantEmail || !participantPhone) {
      return errorResponse('Missing required fields', 400, req)
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(participantEmail)) {
      return errorResponse('Invalid email format', 400, req)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch course to verify it's actually free and bookable
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, seller_id, status, price, start_date, time_schedule, location')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return errorResponse('Course not found', 404, req)
    }

    if (course.status === 'draft' || course.status === 'cancelled') {
      return errorResponse('Course is not available for booking', 400, req)
    }

    // Enforce "free" server-side: price must be null or <= 0
    if (course.price != null && course.price > 0) {
      return errorResponse('Course is not free — use the paid checkout flow', 400, req)
    }

    // Resolve the course's default ticket tier — every course has exactly one
    // (created in the 20260426020000 migration). For free courses, the default
    // tier price will be 0, matching course.price.
    const { data: defaultTier, error: tierError } = await supabase
      .from('course_signup_packages')
      .select('id')
      .eq('course_id', course.id)
      .eq('is_default', true)
      .maybeSingle()

    if (tierError || !defaultTier) {
      return errorResponse('Course has no default ticket type', 500, req)
    }

    // Call the atomic capacity RPC. The advisory lock inside it serialises
    // concurrent free signups so the capacity check + insert can't oversell.
    const { data: result, error: rpcError } = await supabase.rpc('create_signup_if_available', {
      p_seller_id: course.seller_id,
      p_course_id: course.id,
      p_ticket_type_id: (defaultTier as { id: string }).id,
      p_participant_name: participantName.trim(),
      p_participant_email: participantEmail.trim(),
      p_participant_phone: participantPhone.trim(),
      p_amount_paid: 0,
      p_dintero_transaction_id: null,
      p_dintero_session_id: null,
      p_dintero_merchant_reference: null,
      p_note: participantNote?.trim() || null,
    })

    if (rpcError) {
      console.error('create_signup_if_available failed:', rpcError)
      return errorResponse('Kunne ikke fullføre påmelding', 500, req)
    }

    const rpcResult = result as { success: boolean; signup_id?: string; error?: string; message?: string }

    if (!rpcResult.success) {
      const status = rpcResult.error === 'course_full' ? 409
        : rpcResult.error === 'already_signed_up' ? 409
        : rpcResult.error === 'course_not_found' ? 404
        : 400
      return errorResponse(rpcResult.message || 'Kunne ikke fullføre påmelding', status, req)
    }

    return successResponse({ signupId: rpcResult.signup_id }, 200, req)
  } catch (err) {
    console.error('create-free-signup error:', err)
    return errorResponse('Internal error', 500, req)
  }
})
