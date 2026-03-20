// Lightweight edge function to send signup confirmation emails.
// Used by the free-course signup flow (no webhook involved).
// Callable with anon key — validates input, then calls send-email internally.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { handleCors, getCorsHeaders, errorResponse, successResponse } from '../_shared/auth.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = getCorsHeaders()

interface ConfirmationRequest {
  to: string
  courseName: string
  courseDate?: string
  courseTime?: string
  location?: string
  organizationName?: string
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const body: ConfirmationRequest = await req.json()

    if (!body.to || !body.courseName) {
      return errorResponse('Missing required fields: to, courseName', 400)
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.to)) {
      return errorResponse('Invalid email format', 400)
    }

    // Call send-email with service role key
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        to: body.to,
        template: 'signup-confirmation',
        templateData: {
          courseName: body.courseName,
          courseDate: body.courseDate || '',
          courseTime: body.courseTime || '',
          location: body.location || '',
          organizationName: body.organizationName || 'Ease',
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
