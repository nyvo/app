// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17.3.1'
import { verifyAuth, verifyOrgMembership, handleCors, errorResponse, successResponse } from '../_shared/auth.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-12-18.acacia',
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173'

interface SendPaymentLinkRequest {
  signup_id: string
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    // Verify authentication
    const authResult = await verifyAuth(req)
    if (!authResult.authenticated) {
      return errorResponse(authResult.error || 'Unauthorized', 401)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body: SendPaymentLinkRequest = await req.json()

    if (!body.signup_id) {
      return errorResponse('Missing signup_id', 400)
    }

    // Get signup with course and organization details
    const { data: signup, error: signupError } = await supabase
      .from('signups')
      .select(`
        *,
        course:courses(
          id, title, description, price, drop_in_price, start_date, time_schedule, location,
          organization_id,
          organization:organizations(id, name, slug, stripe_account_id, stripe_onboarding_complete)
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
        stripe_account_id: string | null
        stripe_onboarding_complete: boolean
      }
    }

    // Verify teacher is authorized
    const authzResult = await verifyOrgMembership(
      authResult.userId!,
      course.organization_id,
      ['owner', 'admin', 'teacher']
    )
    if (!authzResult.authorized) {
      return errorResponse('You do not have permission to send payment links for this organization', 403)
    }

    // Validate signup is in a state where payment link makes sense
    if (signup.status === 'cancelled' || signup.status === 'course_cancelled') {
      return errorResponse('Cannot send payment link for a cancelled signup', 400)
    }

    if (signup.payment_status === 'paid') {
      return errorResponse('Signup is already paid', 400)
    }

    // Determine price - check if signup had a package
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

    const priceInOre = Math.round(price * 100)
    const org = course.organization

    const successUrl = `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&org=${org.slug}`
    const cancelUrl = `${siteUrl}/${org.slug}`

    // Create Stripe Checkout Session
    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: signup.participant_email,
      line_items: [
        {
          price_data: {
            currency: 'nok',
            product_data: {
              name: productName,
              description: productDescription,
              metadata: {
                course_id: course.id,
                organization_id: org.id,
              },
            },
            unit_amount: priceInOre,
          },
          quantity: 1,
        },
      ],
      metadata: {
        course_id: course.id,
        organization_id: org.id,
        organization_slug: org.slug,
        customer_name: signup.participant_name,
        customer_email: signup.participant_email,
        customer_phone: signup.participant_phone || '',
        is_drop_in: (signup.is_drop_in || false).toString(),
        session_id: signup.class_session_id || '',
        signup_package_id: signup.signup_package_id || '',
        package_weeks: signup.package_weeks?.toString() || '',
        // Link to existing signup so webhook can update it instead of creating a new one
        existing_signup_id: signup.id,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: 'nb',
    }

    // Configure payment intent with manual capture (matching existing pattern)
    if (org.stripe_account_id && org.stripe_onboarding_complete) {
      const platformFee = Math.round(priceInOre * 0.05)
      sessionOptions.payment_intent_data = {
        capture_method: 'manual',
        application_fee_amount: platformFee,
        transfer_data: {
          destination: org.stripe_account_id,
        },
      }
    } else {
      sessionOptions.payment_intent_data = {
        capture_method: 'manual',
      }
    }

    const checkoutSession = await stripe.checkout.sessions.create(sessionOptions)

    if (!checkoutSession.url) {
      return errorResponse('Failed to create checkout session', 500)
    }

    // Send payment link email to participant
    const courseDate = course.start_date
      ? new Date(course.start_date).toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })
      : ''

    try {
      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          to: signup.participant_email,
          subject: `Fullfør betaling: ${course.title}`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #10b981; }
    .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 500; margin-bottom: 20px; }
    .pending { background: #fef3c7; color: #92400e; }
    .details-box { background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .button { display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; margin: 20px 0; }
    .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Ease</div>
    </div>

    <p style="text-align: center;">
      <span class="status-badge pending">Betaling venter</span>
    </p>

    <p>Hei ${signup.participant_name || ''},</p>

    <p>Vi ser at betalingen for <strong>${course.title}</strong> ikke er fullført ennå. Bruk lenken nedenfor for å fullføre betalingen.</p>

    <div class="details-box">
      <p><strong>Kurs:</strong> ${course.title}</p>
      ${courseDate ? `<p><strong>Dato:</strong> ${courseDate}</p>` : ''}
      ${course.time_schedule ? `<p><strong>Tid:</strong> ${course.time_schedule}</p>` : ''}
      <p><strong>Beløp:</strong> ${price} kr</p>
    </div>

    <p style="text-align: center;">
      <a href="${checkoutSession.url}" class="button">Betal nå</a>
    </p>

    <p style="text-align: center; font-size: 12px; color: #9ca3af;">
      Eller kopier denne lenken: ${checkoutSession.url}
    </p>

    <p>Ta kontakt med ${org.name} hvis du har spørsmål.</p>

    <div class="footer">
      <p>Hilsen,<br>${org.name || 'Ease'}</p>
    </div>
  </div>
</body>
</html>
          `,
          text: `Hei ${signup.participant_name || ''}, vi ser at betalingen for ${course.title} ikke er fullført. Bruk denne lenken for å betale: ${checkoutSession.url}. Beløp: ${price} kr.`
        })
      })
    } catch (emailError) {
      console.error('Error sending payment link email:', emailError)
      // Don't fail the request if email fails - the checkout session was still created
    }

    return successResponse({
      success: true,
      message: 'Betalingslenke sendt til deltaker',
      checkout_url: checkoutSession.url,
    })
  } catch (error) {
    console.error('Send payment link error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return errorResponse(message, 500)
  }
})
