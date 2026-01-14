// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExpiredOffer {
  id: string
  course_id: string
  participant_email: string
  participant_name: string
  offer_expires_at: string
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const now = new Date().toISOString()

    // Find all pending offers that have expired
    const { data: expiredOffers, error: fetchError } = await supabase
      .from('signups')
      .select('id, course_id, participant_email, participant_name, offer_expires_at')
      .eq('offer_status', 'pending')
      .lt('offer_expires_at', now)
      .order('offer_expires_at', { ascending: true })

    if (fetchError) {
      console.error('Error fetching expired offers:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch expired offers' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!expiredOffers || expiredOffers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No expired offers to process', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing ${expiredOffers.length} expired offers`)

    const results = {
      processed: 0,
      promotions_triggered: 0,
      emails_sent: 0,
      errors: [] as string[]
    }

    // Group by course to avoid race conditions
    const courseGroups = new Map<string, ExpiredOffer[]>()
    for (const offer of expiredOffers) {
      const existing = courseGroups.get(offer.course_id) || []
      existing.push(offer)
      courseGroups.set(offer.course_id, existing)
    }

    // Process each course's expired offers
    for (const [courseId, offers] of courseGroups) {
      // Get max waitlist position for this course
      const { data: maxPositionData } = await supabase
        .from('signups')
        .select('waitlist_position')
        .eq('course_id', courseId)
        .eq('status', 'waitlist')
        .order('waitlist_position', { ascending: false })
        .limit(1)
        .single()

      const maxPosition = maxPositionData?.waitlist_position || 0

      // Process each expired offer
      for (const offer of offers) {
        try {
          // Move to end of list and mark as expired
          const newPosition = maxPosition + 1

          const { error: updateError } = await supabase
            .from('signups')
            .update({
              offer_status: 'expired',
              offer_sent_at: null,
              offer_expires_at: null,
              offer_claim_token: null,
              waitlist_position: newPosition,
              updated_at: new Date().toISOString()
            })
            .eq('id', offer.id)

          if (updateError) {
            console.error(`Error updating expired offer ${offer.id}:`, updateError)
            results.errors.push(`Failed to update offer ${offer.id}`)
            continue
          }

          results.processed++

          // Get course name for email
          const { data: course } = await supabase
            .from('courses')
            .select('title, organization_id')
            .eq('id', courseId)
            .single()

          // Get organization name
          const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', course?.organization_id)
            .single()

          // Send offer-expired email
          try {
            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`
              },
              body: JSON.stringify({
                to: offer.participant_email,
                subject: `Tilbudet ditt har utløpt`,
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
    .alert-box { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .alert-title { color: #92400e; font-weight: 600; margin-bottom: 8px; }
    .info-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Ease</div>
    </div>

    <p>Hei ${offer.participant_name || ''},</p>

    <div class="alert-box">
      <p class="alert-title">Tilbudet har utløpt</p>
      <p>Tiden for å bekrefte plassen din i <strong>${course?.title || 'kurset'}</strong> har dessverre gått ut.</p>
    </div>

    <div class="info-box">
      <p><strong>Du er fortsatt på ventelisten</strong></p>
      <p>Du er nå på plass #${newPosition} på ventelisten. Vi sender deg en ny e-post dersom det blir ledig plass igjen.</p>
    </div>

    <p>Tusen takk for forståelsen!</p>

    <div class="footer">
      <p>Hilsen,<br>${org?.name || 'Ease'}</p>
    </div>
  </div>
</body>
</html>
                `,
                text: `Hei ${offer.participant_name || ''}, tiden for å bekrefte plassen din i ${course?.title || 'kurset'} har dessverre gått ut. Du er nå på plass #${newPosition} på ventelisten. Vi sender deg en ny e-post dersom det blir ledig plass igjen.`
              })
            })

            if (emailResponse.ok) {
              results.emails_sent++
            }
          } catch (emailError) {
            console.error(`Error sending expired email to ${offer.participant_email}:`, emailError)
          }
        } catch (offerError) {
          console.error(`Error processing expired offer ${offer.id}:`, offerError)
          results.errors.push(`Error processing ${offer.id}`)
        }
      }

      // After processing all expired offers for this course, trigger promotion to next person
      try {
        const promotionResponse = await fetch(`${supabaseUrl}/functions/v1/process-waitlist-promotion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ course_id: courseId })
        })

        if (promotionResponse.ok) {
          const promotionResult = await promotionResponse.json()
          if (promotionResult.promoted) {
            results.promotions_triggered++
            console.log(`Promotion triggered for course ${courseId}`)
          }
        }
      } catch (promotionError) {
        console.error(`Error triggering promotion for course ${courseId}:`, promotionError)
      }
    }

    console.log(`Processed ${results.processed} expired offers, triggered ${results.promotions_triggered} promotions`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.processed} expired offers`,
        ...results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Process expired offers error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
