import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { createStripeClient } from '../_shared/stripe.ts'
import { verifyAuthAndOrgMembership, handleCors, errorResponse, successResponse } from '../_shared/auth.ts'

const stripe = createStripeClient()

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface BalanceRequest {
  organizationId: string
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const { organizationId } = await req.json() as BalanceRequest

    if (!organizationId) {
      return errorResponse('organizationId is required', 400)
    }

    // Verify auth + org membership (owner/admin only)
    const auth = await verifyAuthAndOrgMembership(req, organizationId, ['owner', 'admin'])
    if (!auth.authenticated) {
      return errorResponse(auth.error || 'Not authenticated', 401)
    }
    if (!auth.authorized) {
      return errorResponse(auth.error || 'Not authorized', 403)
    }

    // Fetch organization
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, stripe_account_id, stripe_onboarding_complete')
      .eq('id', organizationId)
      .single()

    if (orgError || !org) {
      return errorResponse('Organization not found', 404)
    }

    if (!org.stripe_account_id) {
      return errorResponse('Stripe account not set up', 400)
    }

    if (!org.stripe_onboarding_complete) {
      return errorResponse('Stripe onboarding not complete', 400)
    }

    // Fetch balance, payouts, and account status in parallel
    const [balance, payouts, account] = await Promise.all([
      stripe.balance.retrieve({ stripeAccount: org.stripe_account_id }),
      stripe.payouts.list({ limit: 10 }, { stripeAccount: org.stripe_account_id }),
      stripe.accounts.retrieve(org.stripe_account_id),
    ])

    return successResponse({
      balance: {
        available: balance.available.map(b => ({ amount: b.amount, currency: b.currency })),
        pending: balance.pending.map(b => ({ amount: b.amount, currency: b.currency })),
      },
      payouts: payouts.data.map(p => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        arrival_date: p.arrival_date,
        destination_last4: typeof p.destination === 'object' && p.destination && 'last4' in p.destination
          ? (p.destination as { last4?: string }).last4 || null
          : null,
      })),
      account: {
        charges_enabled: !!account.charges_enabled,
        payouts_enabled: !!account.payouts_enabled,
        requirements_due: account.requirements?.currently_due || [],
      },
    })
  } catch (err) {
    console.error('get-stripe-balance error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(message, 500)
  }
})
