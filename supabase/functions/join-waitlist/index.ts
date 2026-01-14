// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JoinWaitlistRequest {
  course_id: string
  organization_id: string
  customer_email: string
  customer_name: string
  customer_phone?: string
}

interface JoinWaitlistResponse {
  success: boolean
  signup_id: string
  waitlist_position: number
  message: string
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body: JoinWaitlistRequest = await req.json()

    // Validate required fields
    if (!body.course_id || !body.organization_id || !body.customer_email || !body.customer_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: course_id, organization_id, customer_email, customer_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, max_participants, status, organization_id')
      .eq('id', body.course_id)
      .single()

    if (courseError || !course) {
      return new Response(
        JSON.stringify({ error: 'Course not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify organization matches
    if (course.organization_id !== body.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Organization mismatch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already has a signup for this course
    const { data: existingSignup } = await supabase
      .from('signups')
      .select('id, status')
      .eq('course_id', body.course_id)
      .eq('participant_email', body.customer_email)
      .in('status', ['confirmed', 'waitlist'])
      .maybeSingle()

    if (existingSignup) {
      return new Response(
        JSON.stringify({
          error: existingSignup.status === 'confirmed'
            ? 'Du er allerede påmeldt dette kurset'
            : 'Du er allerede på ventelisten for dette kurset'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Count current confirmed signups to verify course is actually full
    const { count: confirmedCount } = await supabase
      .from('signups')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', body.course_id)
      .eq('status', 'confirmed')

    const spotsAvailable = (course.max_participants || 0) - (confirmedCount || 0)

    // If spots are actually available, they should use normal checkout
    if (spotsAvailable > 0) {
      return new Response(
        JSON.stringify({
          error: 'Det er fortsatt ledige plasser på kurset. Vennligst bruk vanlig påmelding.',
          spots_available: spotsAvailable
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the highest current waitlist position
    const { data: maxPositionResult } = await supabase
      .from('signups')
      .select('waitlist_position')
      .eq('course_id', body.course_id)
      .eq('status', 'waitlist')
      .order('waitlist_position', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextPosition = (maxPositionResult?.waitlist_position || 0) + 1

    // Create the waitlist signup (no payment required)
    const { data: signup, error: signupError } = await supabase
      .from('signups')
      .insert({
        organization_id: body.organization_id,
        course_id: body.course_id,
        participant_name: body.customer_name,
        participant_email: body.customer_email,
        participant_phone: body.customer_phone || null,
        status: 'waitlist',
        waitlist_position: nextPosition,
        payment_status: 'pending', // Will pay when spot becomes available
        is_drop_in: false,
      })
      .select('id')
      .single()

    if (signupError || !signup) {
      console.error('Error creating waitlist signup:', signupError)
      return new Response(
        JSON.stringify({ error: 'Kunne ikke legge til på ventelisten. Prøv igjen.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get organization name for email
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', body.organization_id)
      .single()

    // Send waitlist confirmation email
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          to: body.customer_email,
          subject: `Du er på ventelisten for ${course.title}`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #10b981; }
    .position-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #fef3c7;
      color: #92400e;
      font-size: 32px;
      font-weight: bold;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      margin: 20px auto;
    }
    .info-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Ease</div>
    </div>

    <p>Hei ${body.customer_name},</p>

    <p>Du er nå på ventelisten for <strong>${course.title}</strong>!</p>

    <div style="text-align: center;">
      <div class="position-badge">#${nextPosition}</div>
      <p style="color: #92400e; font-weight: 500;">Din plass på ventelisten</p>
    </div>

    <div class="info-box">
      <p style="margin: 0;"><strong>Hva skjer nå?</strong></p>
      <p style="margin: 8px 0 0 0;">Vi sender deg en e-post med en gang en plass blir ledig. Du vil da ha 24 timer på deg til å bekrefte og betale for plassen.</p>
    </div>

    <p>Du trenger ikke foreta deg noe før du hører fra oss. Vi holder deg oppdatert!</p>

    <div class="footer">
      <p>Hilsen,<br>${org?.name || 'Ease'}</p>
    </div>
  </div>
</body>
</html>
          `,
          text: `Hei ${body.customer_name}, du er nå på plass #${nextPosition} på ventelisten for ${course.title}. Vi sender deg en e-post så snart en plass blir ledig. Du vil da ha 24 timer på deg til å bekrefte plassen.`
        })
      })
    } catch (emailError) {
      // Don't fail if email fails
      console.error('Error sending waitlist confirmation email:', emailError)
    }

    const response: JoinWaitlistResponse = {
      success: true,
      signup_id: signup.id,
      waitlist_position: nextPosition,
      message: `Du er nå på plass #${nextPosition} på ventelisten`
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Join waitlist error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
