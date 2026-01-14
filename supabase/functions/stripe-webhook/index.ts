// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17.3.1'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-12-18.acacia',
})

// Use SubtleCrypto for webhook verification in Deno
const cryptoProvider = Stripe.createSubtleCryptoProvider()

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

Deno.serve(async (req: Request) => {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  try {
    const body = await req.text()
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    )

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Extract metadata
        const metadata = session.metadata || {}
        const courseId = metadata.course_id
        const organizationId = metadata.organization_id
        const customerName = metadata.customer_name
        const customerEmail = metadata.customer_email || session.customer_email
        const customerPhone = metadata.customer_phone
        const isDropIn = metadata.is_drop_in === 'true'
        const sessionId = metadata.session_id
        // Waitlist claim metadata
        const isWaitlistClaim = metadata.is_waitlist_claim === 'true'
        const claimToken = metadata.claim_token
        const signupIdToClaim = metadata.signup_id

        if (!courseId || !organizationId || !customerEmail) {
          console.error('Missing required metadata in checkout session')
          return new Response('Missing metadata', { status: 400 })
        }

        // Handle waitlist claim differently
        if (isWaitlistClaim && signupIdToClaim) {
          // Validate claim token and update existing signup
          const { data: existingSignup, error: signupFetchError } = await supabase
            .from('signups')
            .select('id, offer_claim_token, offer_status, offer_expires_at')
            .eq('id', signupIdToClaim)
            .single()

          if (signupFetchError || !existingSignup) {
            console.error('Waitlist signup not found:', signupIdToClaim)
            return new Response('Signup not found', { status: 400 })
          }

          // Verify claim token
          if (existingSignup.offer_claim_token !== claimToken) {
            console.error('Invalid claim token')
            return new Response('Invalid claim token', { status: 400 })
          }

          // Check if already claimed
          if (existingSignup.offer_status === 'claimed') {
            console.log('Spot already claimed')
            return new Response('OK', { status: 200 })
          }

          // Check if expired
          if (existingSignup.offer_expires_at && new Date(existingSignup.offer_expires_at) < new Date()) {
            console.error('Offer has expired')
            return new Response('Offer expired', { status: 400 })
          }

          // Update the existing signup to confirmed
          const { error: updateError } = await supabase
            .from('signups')
            .update({
              status: 'confirmed',
              offer_status: 'claimed',
              payment_status: 'paid',
              waitlist_position: null,
              stripe_checkout_session_id: session.id,
              stripe_payment_intent_id: session.payment_intent as string,
              amount_paid: session.amount_total ? session.amount_total / 100 : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', signupIdToClaim)

          if (updateError) {
            console.error('Error updating waitlist signup:', updateError)
            return new Response('Error updating signup', { status: 500 })
          }

          console.log(`Waitlist claim successful for signup ${signupIdToClaim}`)

          // Send confirmation email
          try {
            const { data: course } = await supabase
              .from('courses')
              .select('title, location, time_schedule, start_date')
              .eq('id', courseId)
              .single()

            const { data: org } = await supabase
              .from('organizations')
              .select('name')
              .eq('id', organizationId)
              .single()

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

            const extractTime = (schedule: string | null): string => {
              if (!schedule) return ''
              const timeMatch = schedule.match(/(\d{1,2}:\d{2})/)
              return timeMatch ? timeMatch[1] : ''
            }

            await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`
              },
              body: JSON.stringify({
                to: customerEmail,
                template: 'signup-confirmation',
                templateData: {
                  courseName: course?.title || 'Kurs',
                  courseDate: formatDate(course?.start_date),
                  courseTime: extractTime(course?.time_schedule),
                  location: course?.location || '',
                  organizationName: org?.name || 'Ease'
                }
              })
            })
          } catch (emailError) {
            console.error('Error sending confirmation email:', emailError)
          }

          return new Response('OK', { status: 200 })
        }

        // Check if signup already exists (idempotency for regular signups)
        const { data: existingSignup } = await supabase
          .from('signups')
          .select('id')
          .eq('stripe_payment_intent_id', session.payment_intent)
          .single()

        if (existingSignup) {
          console.log('Signup already exists for this payment intent')
          return new Response('OK', { status: 200 })
        }

        // Get course details for signup status and confirmation email
        const { data: course } = await supabase
          .from('courses')
          .select('title, max_participants, location, time_schedule, start_date')
          .eq('id', courseId)
          .single()

        // Count current confirmed signups
        const { count: currentSignups } = await supabase
          .from('signups')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', courseId)
          .eq('status', 'confirmed')

        // Determine if this signup should be waitlisted
        const spotsAvailable = course?.max_participants
          ? course.max_participants - (currentSignups || 0)
          : 999

        const signupStatus = spotsAvailable > 0 ? 'confirmed' : 'waitlist'
        const waitlistPosition = signupStatus === 'waitlist' ? (currentSignups || 0) - (course?.max_participants || 0) + 1 : null

        // Get session date/time if it's a drop-in
        let classDate = null
        let classTime = null

        if (isDropIn && sessionId) {
          const { data: courseSession } = await supabase
            .from('course_sessions')
            .select('session_date, start_time')
            .eq('id', sessionId)
            .single()

          if (courseSession) {
            classDate = courseSession.session_date
            classTime = courseSession.start_time
          }
        }

        // Create the signup
        const { error: signupError } = await supabase
          .from('signups')
          .insert({
            organization_id: organizationId,
            course_id: courseId,
            participant_name: customerName,
            participant_email: customerEmail,
            participant_phone: customerPhone || null,
            status: signupStatus,
            waitlist_position: waitlistPosition,
            is_drop_in: isDropIn,
            class_date: classDate,
            class_time: classTime,
            payment_status: 'paid',
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent as string,
            amount_paid: session.amount_total ? session.amount_total / 100 : null,
          })

        if (signupError) {
          console.error('Error creating signup:', signupError)
          return new Response('Error creating signup', { status: 500 })
        }

        console.log(`Signup created for ${customerEmail} - Course: ${courseId}`)

        // Send confirmation email (non-blocking)
        try {
          // Get organization name for email
          const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', organizationId)
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

          // Extract time from time_schedule (e.g., "Tirsdager, 18:00" -> "18:00")
          const extractTime = (schedule: string | null): string => {
            if (!schedule) return ''
            const timeMatch = schedule.match(/(\d{1,2}:\d{2})/)
            return timeMatch ? timeMatch[1] : ''
          }

          // Use class date if drop-in, otherwise course start date
          const emailDate = isDropIn && classDate ? classDate : course?.start_date
          const emailTime = isDropIn && classTime ? classTime : extractTime(course?.time_schedule)

          // Call send-email edge function
          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({
              to: customerEmail,
              template: 'signup-confirmation',
              templateData: {
                courseName: course?.title || 'Kurs',
                courseDate: formatDate(emailDate),
                courseTime: emailTime,
                location: course?.location || '',
                organizationName: org?.name || 'Ease'
              }
            })
          })

          if (!emailResponse.ok) {
            const errorText = await emailResponse.text()
            console.error('Failed to send confirmation email:', errorText)
          } else {
            console.log(`Confirmation email sent to ${customerEmail}`)
          }
        } catch (emailError) {
          // Don't fail the webhook if email fails
          console.error('Error sending confirmation email:', emailError)
        }

        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log(`Checkout session expired: ${session.id}`)
        // Could notify user or clean up pending bookings
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log(`Payment failed: ${paymentIntent.id}`)

        // Update any pending signup to failed status
        const { error: updateError } = await supabase
          .from('signups')
          .update({ payment_status: 'failed' })
          .eq('stripe_payment_intent_id', paymentIntent.id)

        if (updateError) {
          console.error('Error updating signup payment status:', updateError)
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        console.log(`Charge refunded: ${charge.id}`)

        // Update signup to refunded/cancelled
        const { error: updateError } = await supabase
          .from('signups')
          .update({
            payment_status: 'refunded',
            status: 'cancelled',
          })
          .eq('stripe_payment_intent_id', charge.payment_intent)

        if (updateError) {
          console.error('Error updating signup for refund:', updateError)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Webhook error:', message)
    return new Response(`Webhook Error: ${message}`, { status: 400 })
  }
})
