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
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const body: CreateFreeSignupRequest = await req.json()
    const { courseId, participantName, participantEmail, participantPhone } = body

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
      .select('id, title, organization_id, status, price, start_date, time_schedule, location')
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

    // Call the atomic capacity RPC. It serialises by locking the course row,
    // so concurrent free signups cannot overbook.
    const { data: result, error: rpcError } = await supabase.rpc('create_signup_if_available', {
      p_course_id: course.id,
      p_organization_id: course.organization_id,
      p_participant_name: participantName.trim(),
      p_participant_email: participantEmail.trim(),
      p_participant_phone: participantPhone.trim(),
      p_dintero_transaction_id: null,
      p_dintero_session_id: null,
      p_dintero_merchant_reference: null,
      p_amount_paid: 0,
      p_is_drop_in: false,
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

    // Send confirmation email. Parallel to the paid-flow finalize path — same
    // template, best-effort (email failure must not fail the signup response).
    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', course.organization_id)
        .single()

      const courseDate = course.start_date
        ? new Date(course.start_date).toLocaleDateString('nb-NO', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })
        : ''

      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          to: participantEmail.trim(),
          template: 'signup-confirmation',
          templateData: {
            courseName: course.title || 'Kurs',
            courseDate,
            courseTime: course.time_schedule || '',
            location: course.location || '',
            organizationName: org?.name || 'Ease',
          },
        }),
      })
    } catch (_err) {
      // Email failures are non-fatal — signup already succeeded.
    }

    return successResponse({ signupId: rpcResult.signup_id }, 200, req)
  } catch (err) {
    console.error('create-free-signup error:', err)
    return errorResponse('Internal error', 500, req)
  }
})
