import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  handleCors,
  errorResponse,
  successResponse,
  verifyAuthAndOrgMembership,
  isAllowedOrigin,
} from '../_shared/auth.ts'
import {
  createStripeCheckoutSession,
  createStripeCustomer,
  listLiveSubscriptions,
} from '../_shared/stripe.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface RequestBody {
  sellerId: string
  /** Billing interval — defaults to monthly. */
  interval?: 'month' | 'year'
}

function priceIdForOperatingModel(operatingModel: string | null, interval: 'month' | 'year'): string {
  if (interval === 'year') {
    const soloYearly =
      Deno.env.get('STRIPE_PRO_SOLO_YEARLY_PRICE_ID') || Deno.env.get('STRIPE_PRO_YEARLY_PRICE_ID') || ''
    const studioYearly = Deno.env.get('STRIPE_PRO_STUDIO_YEARLY_PRICE_ID') || soloYearly
    return operatingModel === 'studio' ? studioYearly : soloYearly
  }
  const solo = Deno.env.get('STRIPE_PRO_SOLO_PRICE_ID') || Deno.env.get('STRIPE_PRO_PRICE_ID') || ''
  const studio = Deno.env.get('STRIPE_PRO_STUDIO_PRICE_ID') || solo
  return operatingModel === 'studio' ? studio : solo
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const body = (await req.json()) as RequestBody
    if (!body.sellerId) {
      return errorResponse('Missing sellerId', 400, req)
    }
    const interval: 'month' | 'year' = body.interval === 'year' ? 'year' : 'month'

    const authz = await verifyAuthAndOrgMembership(req, body.sellerId, ['owner'])
    if (!authz.authenticated) {
      return errorResponse('Du må være innlogget.', 401, req)
    }
    if (!authz.authorized || !authz.userId) {
      return errorResponse('Du har ikke tilgang til dette studioet.', 403, req)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, name, operating_model, subscription_plan, subscription_status, subscription_customer_id')
      .eq('id', body.sellerId)
      .single()

    if (sellerError || !seller) {
      return errorResponse('Studioet finnes ikke.', 404, req)
    }

    if (seller.subscription_plan === 'pro' && ['active', 'past_due'].includes(seller.subscription_status)) {
      return errorResponse('Studioet har allerede Pro.', 409, req)
    }

    const priceId = priceIdForOperatingModel(seller.operating_model, interval)
    if (!priceId) {
      return errorResponse('Stripe price is not configured', 500, req)
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('id', authz.userId)
      .single()

    if (profileError || !profile?.email) {
      return errorResponse('Fant ikke e-post for kontoen.', 400, req)
    }

    let customerId = seller.subscription_customer_id as string | null
    if (!customerId) {
      const customer = await createStripeCustomer({
        email: profile.email,
        name: seller.name || profile.name || profile.email,
        sellerId: seller.id,
        userId: authz.userId,
      })
      customerId = customer.id

      const { error: updateError } = await supabase
        .from('sellers')
        .update({
          subscription_provider: 'stripe',
          subscription_customer_id: customerId,
        })
        .eq('id', seller.id)

      if (updateError) {
        return errorResponse('Kunne ikke lagre Stripe-kunde.', 500, req)
      }
    }

    // Source-of-truth guard against the DB plan flag lagging the webhook: if
    // Stripe already has a live subscription for this customer, don't open a
    // second checkout — prevents accidental double-subscribe / double-billing.
    if (customerId) {
      const liveSubs = await listLiveSubscriptions(customerId)
      if (liveSubs.length > 0) {
        return errorResponse('Studioet har allerede et aktivt abonnement.', 409, req)
      }
    }

    // Return the owner to the app origin they started from (validated against the
    // allowlist), falling back to SITE_URL. Using the caller's origin makes a
    // non-5173 dev port + staging work, not just the single SITE_URL value.
    const origin = req.headers.get('origin')
    const baseUrl = isAllowedOrigin(origin)
      ? (origin as string)
      : (Deno.env.get('SITE_URL') || 'http://localhost:5173')

    const session = await createStripeCheckoutSession({
      customerId,
      priceId,
      sellerId: seller.id,
      successUrl: `${baseUrl}/settings/billing?stripe=success`,
      cancelUrl: `${baseUrl}/settings/billing?stripe=cancelled`,
    })

    return successResponse({ url: session.url }, 200, req)
  } catch (error) {
    console.error('create-stripe-checkout-session error:', error)
    return errorResponse('Kunne ikke starte abonnement. Prøv igjen.', 500, req)
  }
})
