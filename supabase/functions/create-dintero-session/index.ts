// Create a Dintero checkout session for the embedded payment flow.
// Replaces the Stripe create-payment-intent function.
//
// Flow:
//  1. Validate course + org + Dintero seller status.
//  2. Insert a payment_attempts row that holds the full context.
//  3. Create a Dintero session with:
//       - configuration.auto_capture = false  (we capture from the webhook after capacity check)
//       - splits per item: teacher share + platform fee
//       - merchant_reference = payment_attempts.id (our lookup key on webhook)
//  4. Return { sid, url } so the client can embed or redirect.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { handleCors, getCorsHeaders, errorResponse } from '../_shared/auth.ts'
import { calculatePricing } from '../_shared/pricing.ts'
import {
  createSession,
  getProfileId,
  type DinteroSessionRequest,
} from '../_shared/dintero.ts'

const corsHeaders = getCorsHeaders()

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173'

interface SessionRequestBody {
  courseId: string
  organizationSlug: string
  customerEmail: string
  customerName: string
  customerPhone?: string
  isDropIn?: boolean
  sessionId?: string
  signupPackageId?: string
  packageWeeks?: number
}

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = (await req.json()) as SessionRequestBody

    const {
      courseId,
      organizationSlug,
      customerEmail,
      customerName,
      customerPhone,
      isDropIn = false,
      sessionId,
      signupPackageId,
      packageWeeks,
    } = body

    if (!courseId || !organizationSlug || !customerEmail || !customerName) {
      return errorResponse('Missing required fields', 400)
    }

    // Validate UUID-shaped inputs before they flow into .eq() queries.
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(courseId)) {
      return errorResponse('Invalid courseId', 400)
    }
    if (sessionId !== undefined && sessionId !== null && !uuidRegex.test(sessionId)) {
      return errorResponse('Invalid sessionId', 400)
    }
    if (signupPackageId !== undefined && signupPackageId !== null && !uuidRegex.test(signupPackageId)) {
      return errorResponse('Invalid signupPackageId', 400)
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(customerEmail)) {
      return errorResponse('Invalid email format', 400)
    }

    // Load course + organization
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select(`
        *,
        organization:organizations(
          id,
          name,
          slug,
          dintero_seller_id,
          dintero_onboarding_complete
        )
      `)
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return errorResponse('Course not found', 404)
    }

    const org = course.organization as {
      id: string
      name: string
      slug: string
      dintero_seller_id: string | null
      dintero_onboarding_complete: boolean
    } | null

    if (!org || org.slug !== organizationSlug) {
      return errorResponse('Course not found for this organization', 404)
    }

    if (course.status === 'draft' || course.status === 'cancelled') {
      return errorResponse('Course is not available for booking', 400)
    }

    if (!org.dintero_seller_id || !org.dintero_onboarding_complete) {
      return errorResponse('Payment is not set up for this organization', 400)
    }

    // Resolve package pricing if applicable
    let selectedPackage: { id: string; price: number; weeks: number; label: string } | null = null
    if (signupPackageId) {
      const { data: packageData, error: packageError } = await supabase
        .from('course_signup_packages')
        .select('id, price, weeks, label')
        .eq('id', signupPackageId)
        .eq('course_id', courseId)
        .single()
      if (packageError || !packageData) {
        return errorResponse('Invalid signup package', 400)
      }
      selectedPackage = packageData
    }

    const price = selectedPackage
      ? selectedPackage.price
      : isDropIn && course.drop_in_price
        ? course.drop_in_price
        : course.price

    if (!price || price <= 0) {
      return errorResponse('Course has no valid price', 400)
    }

    // Soft capacity check. Hard guard is in create_signup_if_available RPC at webhook time.
    if (course.max_participants) {
      const { count: currentSignups } = await supabase
        .from('signups')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId)
        .eq('status', 'confirmed')
      if ((currentSignups || 0) >= course.max_participants) {
        return errorResponse('Course is full', 400)
      }
    }

    // Resolve drop-in session date/time
    let classDate: string | null = null
    let classTime: string | null = null
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

    const { serviceFeeNok, totalPrice, priceInOre, basePriceInOre, serviceFeeInOre, platformFee } =
      calculatePricing(price)

    // Persist the attempt. Its id becomes merchant_reference on the Dintero session.
    const { data: attempt, error: attemptError } = await supabase
      .from('payment_attempts')
      .insert({
        course_id: courseId,
        organization_id: org.id,
        participant_name: customerName,
        participant_email: customerEmail,
        participant_phone: customerPhone ?? null,
        is_drop_in: isDropIn,
        course_session_id: sessionId ?? null,
        class_date: classDate,
        class_time: classTime,
        signup_package_id: signupPackageId ?? null,
        package_weeks: packageWeeks ?? null,
        base_price_nok: price,
        service_fee_nok: serviceFeeNok,
        total_price_nok: totalPrice,
        status: 'pending',
      })
      .select('id')
      .single()

    if (attemptError || !attempt) {
      return errorResponse('Failed to record payment attempt', 500)
    }

    const merchantReference = attempt.id
    const description = selectedPackage
      ? `${course.title} - ${selectedPackage.label}`
      : isDropIn
        ? `Drop-in: ${course.title}`
        : course.title

    // Splits: teacher receives base price minus 5% platform cut; platform keeps the rest (service fee + platform fee).
    const teacherShare = basePriceInOre - (platformFee - serviceFeeInOre) // = basePriceInOre * (1 - 0.05)
    const platformShare = priceInOre - teacherShare

    const sessionRequest: DinteroSessionRequest = {
      url: {
        return_url: `${siteUrl}/checkout/success?transaction_id={{transaction_id}}&ref=${merchantReference}&org=${org.slug}`,
        callback_url: `${supabaseUrl}/functions/v1/dintero-webhook`,
      },
      order: {
        amount: priceInOre,
        currency: 'NOK',
        merchant_reference: merchantReference,
        items: [
          {
            id: courseId,
            line_id: '1',
            description,
            quantity: 1,
            amount: priceInOre,
            splits: [
              { payout_destination_id: org.dintero_seller_id, amount: teacherShare },
              { payout_destination_id: 'platform', amount: platformShare },
            ],
          },
        ],
      },
      configuration: {
        auto_capture: false,
      },
      profile_id: getProfileId(),
    }

    const session = await createSession(sessionRequest)

    // Backlink the Dintero session id to the attempt for later reconciliation.
    await supabase
      .from('payment_attempts')
      .update({ dintero_session_id: session.id })
      .eq('id', merchantReference)

    return new Response(
      JSON.stringify({
        sid: session.id,
        url: session.url,
        merchantReference,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return jsonError(message, 500)
  }
})
