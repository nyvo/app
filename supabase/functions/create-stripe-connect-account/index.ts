// Initiate Stripe Connect (Express) seller onboarding.
// Stripe-side counterpart to create-dintero-seller (Phase 1 of the Dintero → Stripe migration).
//
// Flow:
//  1. Teacher clicks "kom i gang" on the dashboard payments page.
//  2. If the seller has no connected account yet, we create an Express account
//     (createConnectedAccount) and persist its acct_… id + status='pending' via
//     the SERVICE-ROLE client (the stripe_* columns are write-protected).
//  3. We mint a hosted onboarding link (createAccountLink) pointing back to the
//     dashboard payments page with ?stripe=refresh / ?stripe=return markers.
//  4. We return `url` so the client can redirect the teacher into Stripe's
//     hosted Express onboarding.
//
// Idempotent: an existing stripe_account_id is REUSED — we never create a
// second connected account for the same seller.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  verifyAuthAndOrgMembership,
  handleCors,
  errorResponse,
  successResponse,
} from '../_shared/auth.ts'
import { createConnectedAccount, createAccountLink } from '../_shared/stripe.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173'

interface ConnectRequest {
  sellerId: string
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const body = (await req.json()) as ConnectRequest

    if (!body.sellerId) {
      return errorResponse('sellerId is required', 400, req)
    }

    const auth = await verifyAuthAndOrgMembership(req, body.sellerId, ['owner'])
    if (!auth.authenticated) return errorResponse(auth.error || 'Du må være innlogget.', 401, req)
    if (!auth.authorized) return errorResponse(auth.error || 'Du har ikke tilgang til dette studioet.', 403, req)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, name, email, organization_number, stripe_account_id')
      .eq('id', body.sellerId)
      .single()

    if (sellerError || !seller) {
      return errorResponse('Studioet finnes ikke.', 404, req)
    }

    // Reuse an existing connected account; only create one when none exists.
    let accountId = seller.stripe_account_id

    if (!accountId) {
      // Don't prefill business details — Stripe collects and validates them in hosted
      // onboarding. Prefilling a stored org number can fail Stripe's validation (e.g. the
      // 999999999 placeholder); in-app org-number capture is a C7 follow-up.
      const account = await createConnectedAccount({
        sellerId: seller.id,
        email: seller.email ?? undefined,
      })
      accountId = account.id

      const { error: updateError } = await supabase
        .from('sellers')
        .update({
          stripe_account_id: accountId,
          stripe_account_status: 'pending',
        })
        .eq('id', seller.id)

      if (updateError) {
        return errorResponse('Kunne ikke lagre Stripe-kontoen.', 500, req)
      }
    }

    // Hosted Express onboarding link. ?stripe=refresh fires when the link expires
    // (we re-mint it); ?stripe=return when the teacher finishes the hosted flow.
    const accountLink = await createAccountLink({
      accountId,
      refreshUrl: `${siteUrl}/settings/payouts?stripe=refresh`,
      returnUrl: `${siteUrl}/settings/payouts?stripe=return`,
    })

    return successResponse({ url: accountLink.url }, 200, req)
  } catch (err) {
    console.error('create-stripe-connect-account error:', err)
    return errorResponse('Noe gikk galt. Prøv igjen.', 500, req)
  }
})
