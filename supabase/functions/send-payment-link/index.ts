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
      return errorResponse(authResult.error || 'Unauthorized', 401)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = (await req.json()) as SendPaymentLinkRequest

    if (!body.signup_id) {
      return errorResponse('Missing signup_id', 400)
    }

    const { data: signup, error: signupError } = await supabase
      .from('signups')
      .select(`
        *,
        course:courses(
          id, title, description, price, drop_in_price, start_date, time_schedule, location,
          organization_id,
          organization:organizations(id, name, slug, dintero_seller_id, dintero_onboarding_complete)
        )
      `)
      .eq('id', body.signup_id)
      .single()

    if (signupError || !signup) {
      return errorResponse('Signup not found', 404)
    }

    const course = signup.course as {
      id: string
      title: string
      description: string | null
      price: number
      drop_in_price: number | null
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
      return errorResponse('You do not have permission to send payment links for this organization', 403)
    }

    if (signup.status === 'cancelled' || signup.status === 'course_cancelled') {
      return errorResponse('Cannot send payment link for a cancelled signup', 400)
    }
    if (signup.payment_status === 'paid') {
      return errorResponse('Signup is already paid', 400)
    }

    const org = course.organization
    if (!org.dintero_seller_id || !org.dintero_onboarding_complete) {
      return errorResponse('Payment is not set up for this organization', 400)
    }

    // Resolve price
    let price = course.price
    let productName = course.title
    let productDescription = course.description || `Betaling for ${course.title}`

    if (signup.signup_package_id) {
      const { data: packageData } = await supabase
        .from('course_signup_packages')
        .select('id, price, weeks, label')
        .eq('id', signup.signup_package_id)
        .single()
      if (packageData) {
        price = packageData.price
        productName = `${course.title} - ${packageData.label}`
        productDescription = `${packageData.label} - ${course.title}`
      }
    } else if (signup.is_drop_in && course.drop_in_price) {
      price = course.drop_in_price
      productDescription = `Drop-in: ${course.title}`
    }

    if (!price || price <= 0) {
      return errorResponse('Course has no valid price', 400)
    }

    const { serviceFeeNok, totalPrice, priceInOre, basePriceInOre, serviceFeeInOre, platformFee } =
      calculatePricing(price)

    // Create payment attempt row pointing to existing signup
    const { data: attempt, error: attemptError } = await supabase
      .from('payment_attempts')
      .insert({
        course_id: course.id,
        organization_id: org.id,
        participant_name: signup.participant_name,
        participant_email: signup.participant_email,
        participant_phone: signup.participant_phone,
        is_drop_in: signup.is_drop_in || false,
        class_date: signup.class_date,
        class_time: signup.class_time,
        signup_package_id: signup.signup_package_id,
        package_weeks: signup.package_weeks,
        base_price_nok: price,
        service_fee_nok: serviceFeeNok,
        total_price_nok: totalPrice,
        existing_signup_id: signup.id,
        status: 'pending',
      })
      .select('id')
      .single()

    if (attemptError || !attempt) {
      return errorResponse('Failed to record payment attempt', 500)
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
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return errorResponse(message, 500)
  }
})
