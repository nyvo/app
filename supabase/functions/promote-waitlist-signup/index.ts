// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PromoteSignupRequest {
  signup_id: string
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body: PromoteSignupRequest = await req.json()

    if (!body.signup_id) {
      return new Response(
        JSON.stringify({ error: 'Missing signup_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the signup
    const { data: signup, error: signupError } = await supabase
      .from('signups')
      .select(`
        *,
        course:courses(id, title, price, organization_id, start_date, time_schedule, location)
      `)
      .eq('id', body.signup_id)
      .single()

    if (signupError || !signup) {
      return new Response(
        JSON.stringify({ error: 'Signup not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify it's a waitlist signup
    if (signup.status !== 'waitlist') {
      return new Response(
        JSON.stringify({ error: 'Signup is not on waitlist' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const course = signup.course as {
      id: string
      title: string
      price: number
      organization_id: string
      start_date: string
      time_schedule: string
      location: string
    }

    // Generate claim token and expiry
    const claimToken = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    // Mark any other pending offers as skipped (teacher is promoting someone specific)
    await supabase
      .from('signups')
      .update({
        offer_status: 'skipped',
        updated_at: new Date().toISOString()
      })
      .eq('course_id', course.id)
      .eq('offer_status', 'pending')

    // Update signup with offer details
    const { error: updateError } = await supabase
      .from('signups')
      .update({
        offer_sent_at: new Date().toISOString(),
        offer_expires_at: expiresAt.toISOString(),
        offer_status: 'pending',
        offer_claim_token: claimToken,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.signup_id)

    if (updateError) {
      console.error('Error updating signup:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update signup' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get organization name
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', course.organization_id)
      .single()

    // Format expiry for email
    const formatExpiry = (date: Date): string => {
      return date.toLocaleString('nb-NO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // Build claim URL
    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173'
    const claimUrl = `${siteUrl}/claim-spot/${claimToken}`

    // Send spot-available email
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          to: signup.participant_email,
          subject: `En plass er ledig: ${course.title}!`,
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
    .highlight-box { background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }
    .highlight-title { color: #166534; font-weight: 600; font-size: 18px; margin-bottom: 8px; }
    .urgency-box { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; padding: 16px; margin: 20px 0; }
    .urgency-title { color: #92400e; font-weight: 600; margin-bottom: 4px; }
    .urgency-text { color: #92400e; font-size: 14px; }
    .button { display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; margin: 20px 0; }
    .course-info { background: #f9fafb; border-radius: 12px; padding: 16px; margin: 20px 0; }
    .course-title { font-weight: 600; color: #111; margin-bottom: 8px; }
    .course-detail { color: #6b7280; font-size: 14px; }
    .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Ease</div>
    </div>

    <div class="highlight-box">
      <p class="highlight-title">En plass har blitt ledig!</p>
      <p>Du har ventet på plass i <strong>${course.title}</strong> - og nå er det din tur!</p>
    </div>

    <p>Hei ${signup.participant_name || ''},</p>

    <p>Gode nyheter! En plass har blitt ledig i kurset du sto på venteliste for. Du er nå blitt tilbudt plassen.</p>

    <div class="urgency-box">
      <p class="urgency-title">Du har 24 timer</p>
      <p class="urgency-text">Tilbudet utløper ${formatExpiry(expiresAt)}. Bekreft plassen din før det er for sent!</p>
    </div>

    <div class="course-info">
      <p class="course-title">${course.title}</p>
      ${course.start_date ? `<p class="course-detail">Startdato: ${new Date(course.start_date).toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })}</p>` : ''}
      ${course.time_schedule ? `<p class="course-detail">Tid: ${course.time_schedule}</p>` : ''}
      ${course.location ? `<p class="course-detail">Sted: ${course.location}</p>` : ''}
      <p class="course-detail"><strong>Pris: ${course.price} kr</strong></p>
    </div>

    <p style="text-align: center;">
      <a href="${claimUrl}" class="button">Bekreft plassen nå</a>
    </p>

    <p style="text-align: center; font-size: 12px; color: #9ca3af;">
      Eller kopier denne lenken: ${claimUrl}
    </p>

    <div class="footer">
      <p>Hilsen,<br>${org?.name || 'Ease'}</p>
    </div>
  </div>
</body>
</html>
          `,
          text: `Hei ${signup.participant_name || ''}, en plass har blitt ledig i ${course.title}! Du har 24 timer på å bekrefte plassen din. Klikk her for å bekrefte: ${claimUrl}`
        })
      })
    } catch (emailError) {
      console.error('Error sending promotion email:', emailError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Tilbud sendt til deltaker',
        claim_token: claimToken,
        expires_at: expiresAt.toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Promote waitlist signup error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
