// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessWaitlistRequest {
  course_id: string
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body: ProcessWaitlistRequest = await req.json()

    if (!body.course_id) {
      return new Response(
        JSON.stringify({ error: 'Missing course_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const courseId = body.course_id

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, max_participants, price, start_date, time_schedule, location, organization_id')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return new Response(
        JSON.stringify({ error: 'Course not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Count current confirmed signups
    const { count: confirmedCount } = await supabase
      .from('signups')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('status', 'confirmed')

    const spotsAvailable = (course.max_participants || 0) - (confirmedCount || 0)

    if (spotsAvailable <= 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No spots available',
          offered: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find next eligible person on waitlist
    // - Status is 'waitlist'
    // - Either has no pending offer, or offer has expired
    const { data: nextInLine, error: waitlistError } = await supabase
      .from('signups')
      .select('*')
      .eq('course_id', courseId)
      .eq('status', 'waitlist')
      .or('offer_status.is.null,offer_status.eq.expired')
      .order('waitlist_position', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (waitlistError) {
      console.error('Error fetching waitlist:', waitlistError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch waitlist' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!nextInLine) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No one on waitlist',
          offered: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate claim token and set 24-hour expiry
    const claimToken = crypto.randomUUID()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now

    // Update signup with offer details
    const { error: updateError } = await supabase
      .from('signups')
      .update({
        offer_sent_at: now.toISOString(),
        offer_expires_at: expiresAt.toISOString(),
        offer_status: 'pending',
        offer_claim_token: claimToken,
        updated_at: now.toISOString()
      })
      .eq('id', nextInLine.id)

    if (updateError) {
      console.error('Error updating signup with offer:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to create offer' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get organization name for email
    const { data: org } = await supabase
      .from('organizations')
      .select('name, slug')
      .eq('id', course.organization_id)
      .single()

    // Format date for email
    const formatDate = (dateStr: string | null): string => {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      return date.toLocaleDateString('nb-NO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    }

    // Format expiry time for email
    const formatExpiryTime = (date: Date): string => {
      return date.toLocaleString('nb-NO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // Extract time from time_schedule
    const extractTime = (schedule: string | null): string => {
      if (!schedule) return ''
      const timeMatch = schedule.match(/(\d{1,2}:\d{2})/)
      return timeMatch ? timeMatch[1] : ''
    }

    // Build claim URL
    const baseUrl = Deno.env.get('SITE_URL') || 'https://ease.no'
    const claimUrl = `${baseUrl}/claim-spot/${claimToken}`

    // Send "spot available" email
    try {
      const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          to: nextInLine.participant_email,
          template: 'spot-available',
          templateData: {
            participantName: nextInLine.participant_name || '',
            courseName: course.title,
            courseDate: formatDate(course.start_date),
            courseTime: extractTime(course.time_schedule),
            courseLocation: course.location || '',
            coursePrice: course.price || 0,
            claimUrl: claimUrl,
            expiresAt: formatExpiryTime(expiresAt),
            organizationName: org?.name || 'Ease'
          }
        })
      })

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text()
        console.error('Failed to send spot-available email:', errorText)
      } else {
        console.log(`Spot available email sent to ${nextInLine.participant_email}`)
      }
    } catch (emailError) {
      // Don't fail if email fails - the offer is still created
      console.error('Error sending spot-available email:', emailError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        offered: true,
        signup_id: nextInLine.id,
        participant_email: nextInLine.participant_email,
        expires_at: expiresAt.toISOString(),
        message: `Spot offered to ${nextInLine.participant_name || nextInLine.participant_email}`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Process waitlist promotion error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
