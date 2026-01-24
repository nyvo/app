// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17.3.1'

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
if (!stripeKey) {
  console.error('STRIPE_SECRET_KEY not configured')
}

const stripe = new Stripe(stripeKey || '', {
  apiVersion: '2024-12-18.acacia',
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CheckoutRequest {
  courseId: string
  organizationSlug: string
  customerEmail: string
  customerName: string
  customerPhone?: string
  isDropIn?: boolean
  sessionId?: string // For drop-in to a specific session
  successUrl: string
  cancelUrl: string
  // Package selection
  signupPackageId?: string  // ID of the selected signup package
  packageWeeks?: number     // Number of weeks in the package
  // Waitlist claim fields
  claim_token?: string
  signup_id?: string
  // Alternative field names from ClaimSpotPage
  course_id?: string
  participant_name?: string
  participant_email?: string
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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
      successUrl,
      cancelUrl,
      signupPackageId,
      packageWeeks,
      claim_token,
      signup_id,
      // Support alternative field names
      course_id: altCourseId,
      participant_name,
      participant_email,
    } = body

    // Use alternative field names if primary ones not provided
    const finalCourseId = courseId || altCourseId
    const finalCustomerEmail = customerEmail || participant_email
    const finalCustomerName = customerName || participant_name

    // Check if this is a waitlist claim request
    const isWaitlistClaim = !!claim_token && !!signup_id

    // Validate required fields (different requirements for waitlist claims)
    if (isWaitlistClaim) {
      if (!finalCourseId || !finalCustomerEmail || !finalCustomerName) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields for waitlist claim' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      if (!finalCourseId || !organizationSlug || !finalCustomerEmail || !finalCustomerName) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
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
      .eq('id', finalCourseId)
      .single()

    if (courseError || !course) {
      console.error('Course fetch error:', courseError)
      return new Response(
        JSON.stringify({ error: 'Course not found', details: courseError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify organization slug matches (skip for waitlist claims which don't have slug)
    if (!isWaitlistClaim && (!course.organization || course.organization.slug !== organizationSlug)) {
      return new Response(
        JSON.stringify({ error: 'Course not found for this organization' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If a package is selected, fetch it to get the correct price
    let selectedPackage: { id: string; price: number; weeks: number; label: string } | null = null
    if (signupPackageId) {
      const { data: packageData, error: packageError } = await supabase
        .from('course_signup_packages')
        .select('id, price, weeks, label')
        .eq('id', signupPackageId)
        .eq('course_id', finalCourseId)
        .single()

      if (packageError || !packageData) {
        return new Response(
          JSON.stringify({ error: 'Invalid signup package' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      selectedPackage = packageData
    }

    // For waitlist claims, validate the claim token
    if (isWaitlistClaim) {
      const { data: signup, error: signupError } = await supabase
        .from('signups')
        .select('id, offer_claim_token, offer_status, offer_expires_at')
        .eq('id', signup_id)
        .single()

      if (signupError || !signup) {
        return new Response(
          JSON.stringify({ error: 'Invalid signup' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify claim token matches
      if (signup.offer_claim_token !== claim_token) {
        return new Response(
          JSON.stringify({ error: 'Invalid claim token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if already claimed
      if (signup.offer_status === 'claimed') {
        return new Response(
          JSON.stringify({ error: 'Spot already claimed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if expired
      if (signup.offer_expires_at && new Date(signup.offer_expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Offer has expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
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

    // Check capacity (skip for waitlist claims - they already have a reserved spot)
    if (!isWaitlistClaim) {
      const { count: currentSignups } = await supabase
        .from('signups')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', finalCourseId)
        .in('status', ['confirmed', 'waitlist'])

      const spotsAvailable = course.max_participants
        ? course.max_participants - (currentSignups || 0)
        : true

      if (spotsAvailable !== true && spotsAvailable <= 0) {
        return new Response(
          JSON.stringify({ error: 'Course is full' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Prepare Stripe checkout session options
    const priceInOre = Math.round(price * 100) // Convert NOK to øre

    // Determine URLs for waitlist claims
    // Include organization_slug in success URL so the success page can redirect back to the studio
    const orgSlug = organizationSlug || course.organization.slug
    const finalSuccessUrl = isWaitlistClaim
      ? `${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/checkout/success?session_id={CHECKOUT_SESSION_ID}&org=${orgSlug}`
      : successUrl
    const finalCancelUrl = isWaitlistClaim
      ? `${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/claim-spot/${claim_token}`
      : cancelUrl

    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: finalCustomerEmail,
      line_items: [
        {
          price_data: {
            currency: 'nok',
            product_data: {
              name: selectedPackage
                ? `${course.title} - ${selectedPackage.label}`
                : course.title,
              description: isWaitlistClaim
                ? `Venteliste-plass: ${course.title}`
                : selectedPackage
                  ? `${selectedPackage.label} - ${course.title}`
                  : isDropIn
                    ? `Drop-in: ${course.title}`
                    : course.description || `Påmelding til ${course.title}`,
              metadata: {
                course_id: finalCourseId,
                organization_id: course.organization.id,
              },
            },
            unit_amount: priceInOre,
          },
          quantity: 1,
        },
      ],
      metadata: {
        course_id: finalCourseId,
        organization_id: course.organization.id,
        organization_slug: organizationSlug || course.organization.slug,
        customer_name: finalCustomerName,
        customer_email: finalCustomerEmail,
        customer_phone: customerPhone || '',
        is_drop_in: isDropIn.toString(),
        session_id: sessionId || '',
        // Package metadata for package-aware capacity
        signup_package_id: signupPackageId || '',
        package_weeks: packageWeeks?.toString() || '',
        // Waitlist claim metadata
        is_waitlist_claim: isWaitlistClaim.toString(),
        claim_token: claim_token || '',
        signup_id: signup_id || '',
      },
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      locale: 'nb', // Norwegian
    }

    // Configure payment intent data
    // Use manual capture to allow atomic capacity check before charging
    // This prevents overbooking in race conditions
    const org = course.organization

    if (org.stripe_account_id && org.stripe_onboarding_complete) {
      // Organization has Stripe Connect - use connected account with platform fee
      const platformFee = Math.round(priceInOre * 0.05) // 5% platform fee

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
        checkout_url: checkoutSession.url, // Alias for ClaimSpotPage compatibility
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Checkout session error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    const stack = error instanceof Error ? error.stack : undefined
    return new Response(
      JSON.stringify({ error: message, stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
