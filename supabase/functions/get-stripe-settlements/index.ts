// Fetch a Stripe Connect studio's balance + recent payouts, plus a single-use
// Express dashboard link.
//
// Stripe endpoints used (via _shared/stripe.ts, connected-account context):
//   GET  /v1/balance                       -> retrieveBalance(accountId)
//   GET  /v1/payouts?limit=20              -> listPayouts({ accountId, limit })
//   POST /v1/accounts/{id}/login_links     -> createLoginLink(accountId)
//
// Amounts from Stripe are in øre (minor units) and are returned RAW — the
// frontend formats them with formatKroner(). A seller without a connected
// account is a valid pre-onboarding state, so we degrade to empty settlements
// rather than erroring.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  verifyAuthAndOrgMembership,
  handleCors,
  errorResponse,
  successResponse,
} from '../_shared/auth.ts'
import {
  retrieveBalance,
  listPayouts,
  createLoginLink,
  type StripeBalance,
  type StripeList,
  type StripePayout,
} from '../_shared/stripe.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface SettlementsRequest {
  sellerId: string
}

interface SettlementsResponse {
  balance: StripeBalance
  payouts: StripePayout[]
  dashboardUrl: string | null
}

const EMPTY_BALANCE: StripeBalance = { available: [], pending: [] }

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const body = (await req.json()) as SettlementsRequest
    if (!body.sellerId) {
      return errorResponse('sellerId is required', 400, req)
    }

    const auth = await verifyAuthAndOrgMembership(req, body.sellerId, ['owner'])
    if (!auth.authenticated) return errorResponse(auth.error || 'Du må være innlogget.', 401, req)
    if (!auth.authorized) return errorResponse(auth.error || 'Du har ikke tilgang til dette studioet.', 403, req)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, stripe_account_id, stripe_onboarding_complete, stripe_account_status')
      .eq('id', body.sellerId)
      .single()

    if (sellerError || !seller) {
      return errorResponse('Studioet finnes ikke.', 404, req)
    }

    // No connected account yet — a valid pre-onboarding state. Return empty
    // settlements instead of erroring so the payouts page renders cleanly.
    if (!seller.stripe_account_id) {
      const empty: SettlementsResponse = {
        balance: EMPTY_BALANCE,
        payouts: [],
        dashboardUrl: null,
      }
      return successResponse(empty, 200, req)
    }

    const accountId = seller.stripe_account_id as string

    const [balanceResult, payoutsResult, loginLinkResult] = await Promise.allSettled([
      retrieveBalance(accountId),
      listPayouts({ accountId, limit: 20 }),
      createLoginLink(accountId),
    ])

    const balance: StripeBalance =
      balanceResult.status === 'fulfilled' ? balanceResult.value : EMPTY_BALANCE

    const payouts: StripePayout[] =
      payoutsResult.status === 'fulfilled'
        ? (payoutsResult.value as StripeList<StripePayout>).data
        : []

    const dashboardUrl: string | null =
      loginLinkResult.status === 'fulfilled' ? loginLinkResult.value.url : null

    const response: SettlementsResponse = { balance, payouts, dashboardUrl }
    return successResponse(response, 200, req)
  } catch (err) {
    console.error('get-stripe-settlements error:', err)
    return errorResponse('Noe gikk galt. Prøv igjen.', 500, req)
  }
})
