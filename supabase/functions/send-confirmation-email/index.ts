// Lightweight edge function to send signup confirmation emails.
// Used by the free-course signup flow (no webhook involved).
// Requires courseId + signupId — looks up data server-side to prevent abuse.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { handleCors, getCorsHeaders, errorResponse, successResponse } from '../_shared/auth.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const { courseId, signupId } = await req.json()

    if (!courseId || !signupId) {
      return errorResponse('Missing required fields: courseId, signupId', 400)
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    // Look up the signup and course server-side
    const { data: signup, error: signupError } = await serviceClient
      .from('signups')
      .select('id, participant_email, course_id')
      .eq('id', signupId)
      .eq('course_id', courseId)
      .single()

    if (signupError || !signup) {
      return errorResponse('Signup not found', 404)
    }

    const { data: course, error: courseError } = await serviceClient
      .from('courses')
      .select('id, title, start_date, time_schedule, location, organization_id')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return errorResponse('Course not found', 404)
    }

    // Look up organization name
    let organizationName = 'Ease'
    if (course.organization_id) {
      const { data: org } = await serviceClient
        .from('organizations')
        .select('name')
        .eq('id', course.organization_id)
        .single()
      if (org?.name) organizationName = org.name
    }

    // Format date
    let courseDate = ''
    if (course.start_date) {
      courseDate = new Date(course.start_date).toLocaleDateString('nb-NO', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    }

    // Extract time from schedule
    const courseTime = course.time_schedule?.match(/(\d{1,2}:\d{2})/)?.[1] || ''

    // Call send-email with service role key
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        to: signup.participant_email,
        template: 'signup-confirmation',
        templateData: {
          courseName: course.title,
          courseDate,
          courseTime,
          location: course.location || '',
          organizationName,
        },
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.error('Failed to send confirmation email:', errorText)
      return errorResponse('Failed to send email', 500)
    }

    return successResponse({ success: true })
  } catch (error) {
    console.error('send-confirmation-email error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return errorResponse(message, 500)
  }
})
