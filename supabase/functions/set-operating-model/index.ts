import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  handleCors,
  errorResponse,
  successResponse,
  verifyAuthAndOrgMembership,
} from '../_shared/auth.ts'
import { retrieveSubscription, updateSubscriptionItemPrice } from '../_shared/stripe.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface RequestBody {
  sellerId: string
  operatingModel: 'solo' | 'studio'
}

interface SetOperatingModelResult {
  operating_model: 'solo' | 'studio'
  changed: boolean
  repricing_needed: boolean
  subscription_external_id: string | null
}

function priceIdForOperatingModel(operatingModel: string, interval: 'month' | 'year'): string {
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
    if (!body.sellerId || (body.operatingModel !== 'solo' && body.operatingModel !== 'studio')) {
      return errorResponse('Ugyldig forespørsel.', 400, req)
    }

    const authz = await verifyAuthAndOrgMembership(req, body.sellerId, ['owner'])
    if (!authz.authenticated) {
      return errorResponse('Du må være innlogget.', 401, req)
    }
    if (!authz.authorized || !authz.userId) {
      return errorResponse('Du har ikke tilgang til dette studioet.', 403, req)
    }

    // Call the RPC as the calling user (not service role) so auth.uid() resolves inside it —
    // the RPC's owner-only check is enforced by the DB, not just by verifyAuthAndOrgMembership above.
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    })

    const { data: rpcData, error: rpcError } = await supabase.rpc('set_operating_model', {
      p_seller_id: body.sellerId,
      p_operating_model: body.operatingModel,
    })

    if (rpcError) {
      if (rpcError.message?.includes('has_active_affiliates')) {
        return errorResponse('has_active_affiliates', 409, req)
      }
      console.error('set-operating-model rpc error:', rpcError)
      return errorResponse('Kunne ikke endre driftsform. Prøv igjen.', 500, req)
    }

    const result = rpcData as SetOperatingModelResult

    let repriced = false
    // Stripe is on the correct price for the new model (either we swapped it or
    // it was already right). Only then do we clear the durable pending-reprice
    // flag the RPC set — a swallowed failure must leave the flag set so the
    // obligation isn't silently lost (and ops_health_check can surface it).
    let repriceSettled = false
    if (result.repricing_needed && result.subscription_external_id) {
      try {
        const subscription = await retrieveSubscription(result.subscription_external_id)
        const item = subscription.items?.data?.[0]
        const interval = item?.price?.recurring?.interval === 'year' ? 'year' : 'month'
        const targetPrice = priceIdForOperatingModel(result.operating_model, interval)
        if (item && targetPrice && item.price?.id !== targetPrice) {
          await updateSubscriptionItemPrice({
            subscriptionId: result.subscription_external_id,
            itemId: item.id,
            priceId: targetPrice,
          })
          repriced = true
        }
        repriceSettled = true
      } catch (repriceError) {
        // Non-fatal for the request: the model change is already committed. The
        // pending-reprice flag stays set so the swap isn't forgotten.
        console.error('set-operating-model reprice failed:', repriceError)
      }
    }

    // Clear the durable obligation once Stripe matches (needs service role — the
    // column is server-controlled and not client-writable).
    if (!result.repricing_needed || repriceSettled) {
      if (supabaseServiceKey) {
        const admin = createClient(supabaseUrl, supabaseServiceKey)
        const { error: clearError } = await admin
          .from('sellers')
          .update({ subscription_pending_reprice: false })
          .eq('id', body.sellerId)
        if (clearError) console.error('set-operating-model clear-flag failed:', clearError)
      }
    }

    return successResponse({ operatingModel: result.operating_model, repriced }, 200, req)
  } catch (error) {
    console.error('set-operating-model error:', error)
    return errorResponse('Kunne ikke endre driftsform. Prøv igjen.', 500, req)
  }
})
