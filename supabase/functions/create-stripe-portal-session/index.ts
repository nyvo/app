import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  handleCors,
  errorResponse,
  successResponse,
  verifyAuthAndOrgMembership,
  isAllowedOrigin,
} from '../_shared/auth.ts'
import { createStripePortalSession } from '../_shared/stripe.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface RequestBody {
  sellerId: string
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const body = (await req.json()) as RequestBody
    if (!body.sellerId) {
      return errorResponse('Missing sellerId', 400, req)
    }

    const authz = await verifyAuthAndOrgMembership(req, body.sellerId, ['owner'])
    if (!authz.authenticated) {
      return errorResponse('Du må være innlogget.', 401, req)
    }
    if (!authz.authorized) {
      return errorResponse('Du har ikke tilgang til dette studioet.', 403, req)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('subscription_customer_id')
      .eq('id', body.sellerId)
      .single()

    if (sellerError || !seller) {
      return errorResponse('Studioet finnes ikke.', 404, req)
    }

    if (!seller.subscription_customer_id) {
      return errorResponse('Studioet har ikke et Stripe-abonnement ennå.', 400, req)
    }

    // Return the owner to the app origin they started from (validated against the
    // allowlist), falling back to SITE_URL. Using the caller's origin makes a
    // non-5173 dev port + staging work, not just the single SITE_URL value.
    const origin = req.headers.get('origin')
    const baseUrl = isAllowedOrigin(origin)
      ? (origin as string)
      : (Deno.env.get('SITE_URL') || 'http://localhost:5173')

    const session = await createStripePortalSession({
      customerId: seller.subscription_customer_id,
      returnUrl: `${baseUrl}/settings/billing`,
    })

    return successResponse({ url: session.url }, 200, req)
  } catch (error) {
    console.error('create-stripe-portal-session error:', error)
    return errorResponse('Kunne ikke åpne fakturering. Prøv igjen.', 500, req)
  }
})
