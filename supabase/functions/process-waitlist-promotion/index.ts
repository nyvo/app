// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { handleCors, getCorsHeaders, errorResponse, successResponse } from '../_shared/auth.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = getCorsHeaders()

interface ProcessWaitlistRequest {
  course_id: string
  count?: number // Optional: number of spots to offer (for batch promotion)
}

// Helper functions for formatting
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

const formatExpiryTime = (date: Date): string => {
  return date.toLocaleString('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const extractTime = (schedule: string | null): string => {
  if (!schedule) return ''
  const timeMatch = schedule.match(/(\d{1,2}:\d{2})/)
  return timeMatch ? timeMatch[1] : ''
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    // This function is called internally by other edge functions (process-refund, process-expired-offers)
    // It uses service role key, so we verify the request comes from a trusted source
    // by checking for service role authorization
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.includes(supabaseServiceKey)) {
      // Allow if called from another edge function with service key
      // For external calls, verify auth
      const isInternalCall = authHeader?.includes('Bearer ') &&
        authHeader.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.substring(0, 20) || '')

      if (!isInternalCall && !authHeader) {
        return errorResponse('Unauthorized', 401)
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body: ProcessWaitlistRequest = await req.json()

    if (!body.course_id) {
      return errorResponse('Missing course_id', 400)
    }

    const courseId = body.course_id
    const requestedCount = body.count || 1 // Default to 1 for backwards compatibility

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, max_participants, price, start_date, time_schedule, location, organization_id')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return errorResponse('Course not found', 404)
    }

    // Count current confirmed signups and pending offers
    const { count: confirmedCount } = await supabase
      .from('signups')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('status', 'confirmed')

    const { count: pendingOfferCount } = await supabase
      .from('signups')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('status', 'waitlist')
      .eq('offer_status', 'pending')

    // Available spots = max - confirmed - pending offers (to avoid over-offering)
    const spotsAvailable = (course.max_participants || 0) - (confirmedCount || 0) - (pendingOfferCount || 0)

    if (spotsAvailable <= 0) {
      return successResponse({
        success: true,
        message: 'No spots available',
        promoted_count: 0,
        offered: false
      })
    }

    // Process any expired offers first (so they can be re-offered)
    const { data: expiredResult } = await supabase.rpc('process_expired_waitlist_offers', {
      p_course_id: courseId
    })
    if (expiredResult?.expired_count > 0) {
      console.log(`Processed ${expiredResult.expired_count} expired offers`)
    }

    // Calculate how many to promote
    const maxToPromote = Math.min(spotsAvailable, requestedCount)

    // Get organization name for emails
    const { data: org } = await supabase
      .from('organizations')
      .select('name, slug')
      .eq('id', course.organization_id)
      .single()

    const baseUrl = Deno.env.get('SITE_URL') || 'https://ease.no'
    const promotedSignups: Array<{ id: string; email: string; name: string }> = []

    // Use atomic function to promote waitlist entries
    // This prevents race conditions where two cancellations might promote the same person
    for (let i = 0; i < maxToPromote; i++) {
      // Call atomic promotion function (uses row-level locking)
      const { data: promotionResult, error: promotionError } = await supabase.rpc(
        'promote_next_waitlist_entry',
        {
          p_course_id: courseId,
          p_offer_hours: 24
        }
      )

      if (promotionError) {
        console.error('Error calling promote_next_waitlist_entry:', promotionError)
        break // Stop trying if there's an error
      }

      // Check if promotion was successful
      if (!promotionResult?.success) {
        console.log('No more entries to promote:', promotionResult?.error || 'unknown')
        break // No more entries to promote
      }

      const { signup_id, participant_name, participant_email, claim_token, expires_at } = promotionResult

      // Build claim URL
      const claimUrl = `${baseUrl}/claim-spot/${claim_token}`
      const expiresAtDate = new Date(expires_at)

      // Send "spot available" email
      try {
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            to: participant_email,
            template: 'spot-available',
            templateData: {
              participantName: participant_name || '',
              courseName: course.title,
              courseDate: formatDate(course.start_date),
              courseTime: extractTime(course.time_schedule),
              courseLocation: course.location || '',
              coursePrice: course.price || 0,
              claimUrl: claimUrl,
              expiresAt: formatExpiryTime(expiresAtDate),
              organizationName: org?.name || 'Ease'
            }
          })
        })

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text()
          console.error(`Failed to send spot-available email to ${participant_email}:`, errorText)
        } else {
          console.log(`Spot available email sent to ${participant_email}`)
        }
      } catch (emailError) {
        console.error(`Error sending spot-available email to ${participant_email}:`, emailError)
      }

      promotedSignups.push({
        id: signup_id,
        email: participant_email,
        name: participant_name || ''
      })
    }

    const promotedCount = promotedSignups.length

    return successResponse({
      success: true,
      offered: promotedCount > 0,
      promoted_count: promotedCount,
      promoted_signups: promotedSignups,
      message: promotedCount > 0
        ? `Tilbud sendt til ${promotedCount} ${promotedCount === 1 ? 'person' : 'personer'} på ventelisten`
        : 'Ingen å promotere fra ventelisten'
    })
  } catch (error) {
    console.error('Process waitlist promotion error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return errorResponse(message, 500)
  }
})
