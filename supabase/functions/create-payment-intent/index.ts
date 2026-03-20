// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import type Stripe from 'npm:stripe@17.3.1'
import { createStripeClient } from '../_shared/stripe.ts'
import { handleCors, getCorsHeaders, errorResponse } from '../_shared/auth.ts'
import { calculatePricing } from '../_shared/pricing.ts'

const stripe = createStripeClient()

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = getCorsHeaders()

interface PaymentIntentRequest {
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

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body: PaymentIntentRequest = await req.json()

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

    // Validate required fields
    if (!courseId || !organizationSlug || !customerEmail || !customerName) {
      console.error('Missing required fields:', { courseId: !!courseId, organizationSlug: !!organizationSlug, customerEmail: !!customerEmail, customerName: !!customerName })
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(customerEmail)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch course with organization
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select(`
        *,
        organization:organizations(
          id,
          name,
          slug,
          stripe_account_id,
          stripe_onboarding_complete
        )
      `)
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      console.error('Course fetch error:', courseError)
      return new Response(
        JSON.stringify({ error: 'Course not found', details: courseError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify organization slug matches
    if (!course.organization || course.organization.slug !== organizationSlug) {
      return new Response(
        JSON.stringify({ error: 'Course not found for this organization' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Reject bookings for courses that aren't bookable
    if (course.status === 'draft' || course.status === 'cancelled') {
      return new Response(
        JSON.stringify({ error: 'Course is not available for booking' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify Stripe is set up for the organization
    if (!course.organization.stripe_account_id || !course.organization.stripe_onboarding_complete) {
      return new Response(
        JSON.stringify({ error: 'Payment is not set up for this organization' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If a package is selected, fetch it to get the correct price
    let selectedPackage: { id: string; price: number; weeks: number; label: string } | null = null
    if (signupPackageId) {
      const { data: packageData, error: packageError } = await supabase
        .from('course_signup_packages')
        .select('id, price, weeks, label')
        .eq('id', signupPackageId)
        .eq('course_id', courseId)
        .single()

      if (packageError || !packageData) {
        return new Response(
          JSON.stringify({ error: 'Invalid signup package' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      selectedPackage = packageData
    }

    // Determine price - use package price if selected, otherwise course price
    const price = selectedPackage
      ? selectedPackage.price
      : isDropIn && course.drop_in_price
        ? course.drop_in_price
        : course.price

    if (!price || price <= 0) {
      console.error('Course has no valid price:', { price, coursePrice: course.price, dropInPrice: course.drop_in_price, isDropIn })
      return new Response(
        JSON.stringify({ error: 'Course has no valid price' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Soft capacity check (real guard is in create_signup_if_available RPC)
    if (course.max_participants) {
      const { count: currentSignups } = await supabase
        .from('signups')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId)
        .eq('status', 'confirmed')

      if ((currentSignups || 0) >= course.max_participants) {
        return new Response(
          JSON.stringify({ error: 'Course is full' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Prepare PaymentIntent options
    const { serviceFeeNok, totalPrice, priceInOre } = calculatePricing(price)

    const description = selectedPackage
      ? `${course.title} - ${selectedPackage.label}`
      : isDropIn
        ? `Drop-in: ${course.title}`
        : course.title

    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: priceInOre,
      currency: 'nok',
      capture_method: 'manual',
      automatic_payment_methods: { enabled: true },
      description,
      metadata: {
        course_id: courseId,
        organization_id: course.organization.id,
        organization_slug: organizationSlug || course.organization.slug,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || '',
        is_drop_in: isDropIn.toString(),
        session_id: sessionId || '',
        signup_package_id: signupPackageId || '',
        package_weeks: packageWeeks?.toString() || '',
        payment_flow: 'embedded', // Distinguish from checkout session flow
        base_price_nok: price.toString(),
        service_fee_nok: serviceFeeNok.toString(),
        total_price_nok: totalPrice.toString(),
      },
      receipt_email: customerEmail,
    }

    // Configure Stripe Connect if applicable
    const org = course.organization
    if (org.stripe_account_id && org.stripe_onboarding_complete) {
      // Platform fee: percentage of base course price + the full service fee goes to Ease
      const { platformFee } = calculatePricing(price)
      paymentIntentParams.application_fee_amount = platformFee
      paymentIntentParams.transfer_data = {
        destination: org.stripe_account_id,
      }
    }

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams)

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Payment intent error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
