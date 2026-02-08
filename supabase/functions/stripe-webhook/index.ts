// Setup type definitions for built-in Supabase Runtime APIs
// Deployed: 2026-01-20 - using Stripe SDK constructEventAsync for verification
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17.3.1'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
})

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// Use Stripe SDK for signature verification - it handles all the complexity
async function verifyAndParseWebhook(body: string, signature: string, secret: string): Promise<Stripe.Event | null> {
  try {
    // The Stripe SDK handles HMAC verification correctly
    // Use constructEventAsync which is the proper async version
    const event = await stripe.webhooks.constructEventAsync(body, signature, secret)
    console.log('Stripe SDK verified signature successfully!')
    return event
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Stripe SDK verification failed:', message)
    return null
  }
}

Deno.serve(async (req: Request) => {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  try {
    const body = await req.text()
    console.log('Body length:', body.length)

    // Use Stripe SDK for verification
    const event = await verifyAndParseWebhook(body, signature, webhookSecret)
    if (!event) {
      return new Response('Invalid signature', { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // ============================================
    // IDEMPOTENCY: Claim this event ID before doing any work.
    // The processed_webhook_events table has a UNIQUE constraint on event_id.
    // If two webhook deliveries race, only one INSERT succeeds.
    // ============================================
    const eventId = event.id

    const { error: claimError } = await supabase
      .from('processed_webhook_events')
      .insert({
        event_id: eventId,
        event_type: event.type,
        result: { status: 'processing' }
      })

    if (claimError) {
      // UNIQUE violation means another invocation already claimed this event
      if (claimError.code === '23505') {
        console.log(`Event ${eventId} already claimed, skipping (idempotency)`)
        return new Response(JSON.stringify({
          status: 'already_processed',
          event_id: eventId,
        }), { status: 200 })
      }
      // Other DB error - log but continue processing (don't lose the event)
      console.error('Warning: Could not claim event:', claimError)
    }

    // Process the event and track result
    let processingResult: Record<string, unknown> = {}

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
        // Package metadata
        const signupPackageId = metadata.signup_package_id || null
        const packageWeeks = metadata.package_weeks ? parseInt(metadata.package_weeks, 10) : null

        // Validate all required metadata with detailed logging
        const missingFields: string[] = []
        if (!courseId) missingFields.push('course_id')
        if (!organizationId) missingFields.push('organization_id')
        if (!customerEmail) missingFields.push('customer_email')
        if (!customerName) missingFields.push('customer_name')

        if (missingFields.length > 0) {
          console.error('CRITICAL: Missing required metadata in checkout session:', {
            sessionId: session.id,
            missingFields,
            metadata,
            customerEmail: session.customer_email,
          })
          // Return 500 so Stripe retries — metadata may arrive on a subsequent attempt.
          // Mark the idempotency record for manual review.
          await supabase.from('processed_webhook_events')
            .update({ result: { status: 'metadata_error', missing_fields: missingFields, session_id: session.id } })
            .eq('event_id', eventId)
            .catch(() => {})
          // Delete the idempotency claim so retries can re-process
          await supabase.from('processed_webhook_events')
            .delete()
            .eq('event_id', eventId)
            .catch(() => {})
          return new Response(`Missing metadata: ${missingFields.join(', ')}`, { status: 500 })
        }

        console.log('Processing checkout.session.completed:', {
          sessionId: session.id,
          courseId,
          organizationId,
          customerEmail,
          customerName,
          isDropIn,
          paymentIntent: session.payment_intent,
          amountTotal: session.amount_total,
        })

        // Check if signup already exists (idempotency for regular signups)
        const { data: existingSignups, error: idempotencyError } = await supabase
          .from('signups')
          .select('id')
          .eq('stripe_payment_intent_id', session.payment_intent)

        if (idempotencyError) {
          console.error('Error checking for existing signup:', {
            error: idempotencyError,
            paymentIntent: session.payment_intent,
          })
        }

        if (existingSignups && existingSignups.length > 0) {
          console.log('Signup already exists for this payment intent:', {
            existingId: existingSignups[0].id,
            paymentIntent: session.payment_intent,
          })
          // Ensure payment is captured if signup exists
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string)
            if (paymentIntent.status === 'requires_capture') {
              await stripe.paymentIntents.capture(session.payment_intent as string)
              console.log('Captured payment for existing signup')
            }
          } catch (captureError) {
            console.error('Error capturing payment for existing signup:', captureError)
          }
          // Update event record (claimed at start)
          await supabase.from('processed_webhook_events')
            .update({ result: { type: 'regular_signup', status: 'already_exists', existing_id: existingSignups[0].id } })
            .eq('event_id', eventId)
            .catch(() => {}) // Ignore errors
          return new Response('OK', { status: 200 })
        }

        // ============================================
        // PAYMENT LINK FLOW: Update existing signup instead of creating new one
        // When a teacher sends a payment link, the checkout session has
        // existing_signup_id in metadata. We update that signup's payment fields
        // and capture the payment, rather than calling create_signup_if_available.
        // ============================================
        const existingSignupId = metadata.existing_signup_id
        if (existingSignupId) {
          console.log('Payment link flow - updating existing signup:', existingSignupId)

          // Capture payment first
          let receiptUrl: string | null = null
          try {
            const captured = await stripe.paymentIntents.capture(session.payment_intent as string)
            if (captured.latest_charge) {
              const charge = await stripe.charges.retrieve(captured.latest_charge as string)
              receiptUrl = charge.receipt_url || null
            }
          } catch (captureError) {
            console.error('CRITICAL: Payment capture failed for payment link signup:', captureError)
            await supabase.from('signups')
              .update({ payment_status: 'failed' })
              .eq('id', existingSignupId)
            processingResult = {
              type: 'payment_link',
              signup_id: existingSignupId,
              status: 'capture_failed',
              error: captureError instanceof Error ? captureError.message : 'Unknown'
            }
            await supabase.from('processed_webhook_events')
              .update({ result: processingResult })
              .eq('event_id', eventId)
              .catch(() => {})
            return new Response(JSON.stringify({ status: 'capture_failed' }), { status: 200 })
          }

          // Update existing signup with payment info
          const { error: updateError } = await supabase
            .from('signups')
            .update({
              stripe_checkout_session_id: session.id,
              stripe_payment_intent_id: session.payment_intent as string,
              stripe_receipt_url: receiptUrl,
              payment_status: 'paid',
              amount_paid: session.amount_total ? session.amount_total / 100 : null,
              status: 'confirmed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingSignupId)

          if (updateError) {
            console.error('Error updating existing signup for payment link:', updateError)
            processingResult = { type: 'payment_link', signup_id: existingSignupId, status: 'update_failed', error: updateError.message }
          } else {
            console.log('Payment link signup updated successfully:', existingSignupId)
            processingResult = { type: 'payment_link', signup_id: existingSignupId, status: 'confirmed' }
          }

          // Send confirmation email (non-blocking)
          try {
            const { data: course } = await supabase.from('courses').select('title, location, time_schedule, start_date').eq('id', courseId).single()
            const { data: org } = await supabase.from('organizations').select('name').eq('id', organizationId).single()
            const formatDate = (dateStr: string | null): string => {
              if (!dateStr) return ''
              const date = new Date(dateStr)
              return date.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
            }
            const extractTime = (schedule: string | null): string => {
              if (!schedule) return ''
              const timeMatch = schedule.match(/(\d{1,2}:\d{2})/)
              return timeMatch ? timeMatch[1] : ''
            }
            await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
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
            console.error('Error sending confirmation email for payment link:', emailError)
          }

          // Update idempotency record and return
          await supabase.from('processed_webhook_events')
            .update({ result: processingResult })
            .eq('event_id', eventId)
            .catch(() => {})
          return new Response('OK', { status: 200 })
        }

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

        // Use atomic function to check capacity and create signup
        // This prevents race conditions where two people try to book the last spot
        const { data: signupResult, error: signupError } = await supabase
          .rpc('create_signup_if_available', {
            p_course_id: courseId,
            p_organization_id: organizationId,
            p_participant_name: customerName,
            p_participant_email: customerEmail,
            p_participant_phone: customerPhone || null,
            p_stripe_checkout_session_id: session.id,
            p_stripe_payment_intent_id: session.payment_intent as string,
            p_stripe_receipt_url: null, // Will update after capture
            p_amount_paid: session.amount_total ? session.amount_total / 100 : null,
            p_is_drop_in: isDropIn,
            p_class_date: classDate,
            p_class_time: classTime,
            // Package parameters for package-aware capacity
            p_signup_package_id: signupPackageId,
            p_package_weeks: packageWeeks
          })

        // Handle atomic function result
        if (signupError) {
          console.error('Error calling create_signup_if_available:', signupError)
          // Cancel the payment authorization since we couldn't create signup
          try {
            await stripe.paymentIntents.cancel(session.payment_intent as string)
            console.log('Payment cancelled due to database error')
          } catch (cancelError) {
            console.error('Error cancelling payment:', cancelError)
          }
          return new Response(`Error creating signup: ${signupError.message}`, { status: 500 })
        }

        // Check if signup was successful
        if (!signupResult || !signupResult.success) {
          const errorType = signupResult?.error || 'unknown'
          const errorMessage = signupResult?.message || 'Kunne ikke opprette påmelding'

          console.log('Signup failed - cancelling payment:', {
            error: errorType,
            message: errorMessage,
            courseId,
            customerEmail,
          })

          // Course is full or duplicate - cancel the payment authorization
          try {
            await stripe.paymentIntents.cancel(session.payment_intent as string)
            console.log('Payment authorization cancelled successfully')
          } catch (cancelError) {
            console.error('Error cancelling payment authorization:', cancelError)
          }

          // Send booking failed email to notify customer
          try {
            // Get course details for email
            const { data: course } = await supabase
              .from('courses')
              .select('title')
              .eq('id', courseId)
              .single()

            await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`
              },
              body: JSON.stringify({
                to: customerEmail,
                template: 'booking-failed',
                templateData: {
                  courseName: course?.title || 'Kurset',
                  reason: errorType === 'course_full' ? 'Kurset ble dessverre fullt før vi kunne bekrefte din påmelding.' :
                          errorType === 'already_signed_up' ? 'Du er allerede påmeldt dette kurset.' :
                          'Det oppstod en feil ved påmelding.',
                  wasCharged: 'false'
                }
              })
            })
            console.log('Booking failed email sent to', customerEmail)
          } catch (emailError) {
            console.error('Error sending booking failed email:', emailError)
          }

          return new Response('OK', { status: 200 }) // Return OK - we handled it gracefully
        }

        // Signup created successfully - now capture the payment
        console.log('Signup created successfully, capturing payment:', {
          signupId: signupResult.signup_id,
          status: signupResult.status,
          paymentIntent: session.payment_intent,
        })

        // Track result for idempotency
        processingResult = {
          type: 'regular_signup',
          signup_id: signupResult.signup_id,
          status: 'confirmed'
        }

        let receiptUrl: string | null = null
        try {
          const capturedPayment = await stripe.paymentIntents.capture(session.payment_intent as string)
          console.log('Payment captured successfully:', capturedPayment.id)

          // Get receipt URL from the charge
          if (capturedPayment.latest_charge) {
            const charge = await stripe.charges.retrieve(capturedPayment.latest_charge as string)
            receiptUrl = charge.receipt_url || null
          }

          // Update signup with receipt URL
          if (receiptUrl) {
            await supabase
              .from('signups')
              .update({ stripe_receipt_url: receiptUrl })
              .eq('id', signupResult.signup_id)
          }
        } catch (captureError) {
          // Payment capture failed - signup exists but payment not captured.
          // Return 200 so Stripe does not retry into inconsistent state.
          // The signup is marked 'failed' for manual reconciliation.
          console.error('CRITICAL: Payment capture failed after signup created:', captureError)
          await supabase
            .from('signups')
            .update({ payment_status: 'failed' })
            .eq('id', signupResult.signup_id)
          processingResult = {
            type: 'regular_signup',
            signup_id: signupResult.signup_id,
            status: 'capture_failed',
            error: captureError instanceof Error ? captureError.message : 'Unknown'
          }
          // Update idempotency record and return 200
          await supabase.from('processed_webhook_events')
            .update({ result: processingResult })
            .eq('event_id', eventId)
            .catch(() => {})
          return new Response(JSON.stringify({ status: 'capture_failed' }), { status: 200 })
        }

        // Get course details for confirmation email
        const { data: course } = await supabase
          .from('courses')
          .select('title, location, time_schedule, start_date')
          .eq('id', courseId)
          .single()

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
        processingResult = { type: 'session_expired', session_id: session.id }
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
        processingResult = { type: 'payment_failed', payment_intent_id: paymentIntent.id }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const isFullRefund = charge.amount_refunded >= charge.amount
        console.log(`Charge refunded: ${charge.id}, full=${isFullRefund}, refunded=${charge.amount_refunded}/${charge.amount}`)

        if (isFullRefund) {
          // Full refund — cancel the signup
          const { error: updateError } = await supabase
            .from('signups')
            .update({
              payment_status: 'refunded',
              status: 'cancelled',
            })
            .eq('stripe_payment_intent_id', charge.payment_intent)

          if (updateError) {
            console.error('Error updating signup for full refund:', updateError)
          }
        } else {
          // Partial refund — keep signup confirmed, just note the partial refund
          const { error: updateError } = await supabase
            .from('signups')
            .update({
              payment_status: 'refunded',
            })
            .eq('stripe_payment_intent_id', charge.payment_intent)

          if (updateError) {
            console.error('Error updating signup for partial refund:', updateError)
          }
        }
        processingResult = { type: 'refund', charge_id: charge.id, full_refund: isFullRefund }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
        processingResult = { status: 'unhandled', event_type: event.type }
    }

    // ============================================
    // UPDATE EVENT WITH FINAL RESULT (claimed at start)
    // ============================================
    try {
      await supabase.from('processed_webhook_events')
        .update({ result: processingResult })
        .eq('event_id', eventId)
      console.log(`Recorded event ${eventId} as processed`)
    } catch (recordError) {
      // Don't fail if we can't record - the event was still processed
      console.error('Warning: Could not update processed event:', recordError)
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Webhook error:', message)
    return new Response(`Webhook Error: ${message}`, { status: 400 })
  }
})
