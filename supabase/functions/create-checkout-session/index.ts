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
const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173'

const corsHeaders = getCorsHeaders()

interface CheckoutRequest {
  courseId: string
  organizationSlug: string
  customerEmail: string
  customerName: string
  customerPhone?: string
  isDropIn?: boolean
  sessionId?: string // For drop-in to a specific session
  // Package selection
  signupPackageId?: string  // ID of the selected signup package
  packageWeeks?: number     // Number of weeks in the package
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body: CheckoutRequest = await req.json()

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

    // Prepare Stripe checkout session options
    const { serviceFeeNok, totalPrice, priceInOre } = calculatePricing(price)

    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: 'nok',
            product_data: {
              name: selectedPackage
                ? `${course.title} - ${selectedPackage.label}`
                : course.title,
              description: selectedPackage
                ? `${selectedPackage.label} - ${course.title}`
                : isDropIn
                  ? `Drop-in: ${course.title}`
                  : course.description || `Påmelding til ${course.title}`,
              metadata: {
                course_id: courseId,
                organization_id: course.organization.id,
              },
            },
            unit_amount: priceInOre,
          },
          quantity: 1,
        },
      ],
      metadata: {
        course_id: courseId,
        organization_id: course.organization.id,
        organization_slug: organizationSlug || course.organization.slug,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || '',
        is_drop_in: isDropIn.toString(),
        session_id: sessionId || '',
        // Package metadata for package-aware capacity
        signup_package_id: signupPackageId || '',
        package_weeks: packageWeeks?.toString() || '',
        // Pricing breakdown for transparency
        base_price_nok: price.toString(),
        service_fee_nok: serviceFeeNok.toString(),
        total_price_nok: totalPrice.toString(),
      },
      // Construct redirect URLs server-side to prevent phishing via client-controlled URLs
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&org=${course.organization.slug}`,
      cancel_url: `${siteUrl}/${course.organization.slug}`,
      locale: 'nb', // Norwegian
    }

    // Configure payment intent data
    // Use manual capture to allow atomic capacity check before charging
    // This prevents overbooking in race conditions
    const org = course.organization

    if (org.stripe_account_id && org.stripe_onboarding_complete) {
      // Organization has Stripe Connect - use connected account with platform fee
      const { platformFee } = calculatePricing(price)

      sessionOptions.payment_intent_data = {
        capture_method: 'manual', // Authorize only, capture after capacity check
        application_fee_amount: platformFee,
        transfer_data: {
          destination: org.stripe_account_id,
        },
      }
    } else {
      // No Stripe Connect - direct payment with manual capture
      sessionOptions.payment_intent_data = {
        capture_method: 'manual', // Authorize only, capture after capacity check
      }
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create(sessionOptions)

    return new Response(
      JSON.stringify({
        sessionId: checkoutSession.id,
        url: checkoutSession.url,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Checkout session error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
