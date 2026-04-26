// Send a Dintero payment link to a participant with an existing pending signup.
// Replaces the Stripe Checkout Session implementation.
//
// Flow:
//  1. Teacher invokes with signup_id for a signup that's pending payment.
//  2. We create a payment_attempts row linked to that signup.
//  3. We create a Dintero session (auto_capture: false) using merchant_reference = attempt.id.
//  4. We email the Dintero-hosted session.url to the participant.
//  5. Participant pays → webhook sees existing_signup_id on the attempt and updates the signup.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  verifyAuth,
  verifyOrgMembership,
  handleCors,
  errorResponse,
  successResponse,
} from '../_shared/auth.ts'
import { calculatePricing } from '../_shared/pricing.ts'
import {
  createSession,
  getProfileId,
  type DinteroSessionRequest,
} from '../_shared/dintero.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173'

interface SendPaymentLinkRequest {
  signup_id: string
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const authResult = await verifyAuth(req)
    if (!authResult.authenticated) {
      return errorResponse(authResult.error || 'Unauthorized', 401, req)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = (await req.json()) as SendPaymentLinkRequest

    if (!body.signup_id) {
      return errorResponse('Missing signup_id', 400, req)
    }

    // The signup carries ticket_type_id + 3 snapshots — those are the source
     // of truth for what was bought, not course.price / course.drop_in_price
     // (the latter no longer exists). The tier row is loaded separately to
     // get the current price (in case it shifted since the signup was created;
     // the snapshot label is what the email/UI shows, but we charge today's
     // tier price — same as if the buyer were going through checkout fresh).
    const { data: signup, error: signupError } = await supabase
      .from('signups')
      .select(`
        *,
        course:courses(
          id, title, description, start_date, time_schedule, location,
          organization_id,
          organization:organizations(id, name, slug, dintero_seller_id, dintero_onboarding_complete)
        )
      `)
      .eq('id', body.signup_id)
      .single()

    if (signupError || !signup) {
      return errorResponse('Signup not found', 404, req)
    }

    const course = signup.course as {
      id: string
      title: string
      description: string | null
      start_date: string
      time_schedule: string
      location: string
      organization_id: string
      organization: {
        id: string
        name: string
        slug: string
        dintero_seller_id: string | null
        dintero_onboarding_complete: boolean
      }
    }

    const authzResult = await verifyOrgMembership(authResult.userId!, course.organization_id, [
      'owner',
      'admin',
      'teacher',
    ])
    if (!authzResult.authorized) {
      return errorResponse('You do not have permission to send payment links for this organization', 403, req)
    }

    if (signup.status === 'cancelled' || signup.status === 'course_cancelled') {
      return errorResponse('Cannot send payment link for a cancelled signup', 400, req)
    }
    if (signup.payment_status === 'paid') {
      return errorResponse('Signup is already paid', 400, req)
    }

    const org = course.organization
    if (!org.dintero_seller_id || !org.dintero_onboarding_complete) {
      return errorResponse('Payment is not set up for this organization', 400, req)
    }

    // Resolve price + label from the signup's linked ticket type. Every
    // post-2026-04-26 signup has a ticket_type_id; legacy rows that don't
    // can't have a payment link sent (they were paid via other channels).
    if (!signup.ticket_type_id) {
      return errorResponse('Signup has no linked ticket type', 400, req)
    }

    const { data: tierRow, error: tierError } = await supabase
      .from('course_signup_packages')
      .select('id, price, label, ticket_kind')
      .eq('id', signup.ticket_type_id)
      .maybeSingle()

    if (tierError || !tierRow) {
      return errorResponse('Ticket type not found', 404, req)
    }

    const tier = tierRow as { id: string; price: number; label: string; ticket_kind: string }
    const price = tier.price
    const isDropIn = tier.ticket_kind === 'drop_in'
    const productName = isDropIn ? `Drop-in: ${course.title}` : `${course.title} – ${tier.label}`
    const productDescription = tier.label

    if (!price || price <= 0) {
      return errorResponse('Course has no valid price', 400, req)
    }

    const { serviceFeeNok, totalPrice, priceInOre, basePriceInOre, serviceFeeInOre, platformFee } =
      calculatePricing(price)

    // Create payment attempt row pointing to existing signup. Snapshots come
    // from the signup itself (write-once), not the live tier — preserves
    // historical accuracy if the tier was renamed/edited after the signup.
    const { data: attempt, error: attemptError } = await supabase
      .from('payment_attempts')
      .insert({
        course_id: course.id,
        organization_id: org.id,
        participant_name: signup.participant_name,
        participant_email: signup.participant_email,
        participant_phone: signup.participant_phone,
        course_session_id: signup.course_session_id,
        ticket_type_id: signup.ticket_type_id,
        ticket_label_snapshot: signup.ticket_label_snapshot,
        ticket_audience_snapshot: signup.ticket_audience_snapshot,
        ticket_kind_snapshot: signup.ticket_kind_snapshot,
        base_price_nok: price,
        service_fee_nok: serviceFeeNok,
        total_price_nok: totalPrice,
        existing_signup_id: signup.id,
        status: 'pending',
      })
      .select('id')
      .single()

    if (attemptError || !attempt) {
      return errorResponse('Failed to record payment attempt', 500, req)
    }

    const merchantReference = attempt.id

    // Two-line breakdown — see create-dintero-session/index.ts for rationale.
    const platformShareOnCourse = platformFee - serviceFeeInOre // = basePriceInOre * 0.05
    const teacherShareOnCourse = basePriceInOre - platformShareOnCourse // = basePriceInOre * 0.95

    const orderItems = [
      {
        id: course.id,
        line_id: '1',
        description: `${productName} — ${productDescription}`,
        quantity: 1,
        amount: basePriceInOre,
        splits: [
          { payout_destination_id: org.dintero_seller_id, amount: teacherShareOnCourse },
          { payout_destination_id: 'platform', amount: platformShareOnCourse },
        ],
      },
    ]

    if (serviceFeeInOre > 0) {
      orderItems.push({
        id: 'service-fee',
        line_id: '2',
        description: 'Servicegebyr',
        quantity: 1,
        amount: serviceFeeInOre,
        splits: [
          { payout_destination_id: 'platform', amount: serviceFeeInOre },
        ],
      })
    }

    const sessionRequest: DinteroSessionRequest = {
      url: {
        return_url: `${siteUrl}/checkout/success?transaction_id={{transaction_id}}&ref=${merchantReference}&org=${org.slug}`,
        callback_url: `${supabaseUrl}/functions/v1/dintero-webhook`,
      },
      order: {
        amount: priceInOre,
        currency: 'NOK',
        merchant_reference: merchantReference,
        items: orderItems,
      },
      configuration: { auto_capture: false },
      profile_id: getProfileId(),
    }

    const session = await createSession(sessionRequest)

    await supabase
      .from('payment_attempts')
      .update({ dintero_session_id: session.id })
      .eq('id', merchantReference)

    // Send payment link email
    const courseDate = course.start_date
      ? new Date(course.start_date).toLocaleDateString('nb-NO', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })
      : ''

    try {
      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          to: signup.participant_email,
          template: 'payment-link',
          templateData: {
            participantName: signup.participant_name || '',
            courseName: course.title,
            courseDate: courseDate || '',
            courseTime: course.time_schedule || '',
            totalPrice: totalPrice.toString(),
            paymentUrl: session.url,
            organizationName: org.name || '',
          },
        }),
      })
    } catch {
      // Non-fatal — session is created, url is in response
    }

    return successResponse({
      success: true,
      message: 'Betalingslenke sendt til deltaker',
      checkout_url: session.url,
    }, 200, req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return errorResponse(message, 500, req)
  }
})
