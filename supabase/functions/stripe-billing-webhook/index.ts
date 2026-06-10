import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { errorResponse, successResponse, handleCors } from '../_shared/auth.ts'
import {
  verifyStripeSignature,
  type StripeEvent,
  type StripeSubscription,
} from '../_shared/stripe.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''

function stripeStatusToSellerStatus(status: string): 'active' | 'past_due' | 'canceled' | 'none' {
  if (status === 'active' || status === 'trialing') return 'active'
  if (status === 'past_due' || status === 'unpaid' || status === 'incomplete') return 'past_due'
  if (status === 'canceled' || status === 'incomplete_expired' || status === 'paused') return 'canceled'
  return 'none'
}

async function claimEvent(supabase: SupabaseClient, event: StripeEvent): Promise<boolean> {
  const { error } = await supabase
    .from('processed_webhook_events')
    .insert({
      event_id: `stripe:${event.id}`,
      event_type: event.type,
      result: { status: 'processing' },
      processed_at: null,
    })

  if (error) {
    if (error.code === '23505') return false
    console.error('stripe-billing-webhook claimEvent failed:', error)
  }
  return true
}

async function markEventResult(
  supabase: SupabaseClient,
  event: StripeEvent,
  result: Record<string, unknown>,
): Promise<void> {
  await supabase
    .from('processed_webhook_events')
    .update({ result, processed_at: new Date().toISOString() })
    .eq('event_id', `stripe:${event.id}`)
}

async function releaseEventClaim(supabase: SupabaseClient, event: StripeEvent): Promise<void> {
  await supabase
    .from('processed_webhook_events')
    .delete()
    .eq('event_id', `stripe:${event.id}`)
    .is('processed_at', null)
}

async function syncSubscription(
  supabase: SupabaseClient,
  subscription: StripeSubscription,
): Promise<Record<string, unknown>> {
  const sellerId = subscription.metadata?.seller_id ?? null
  const sellerStatus = stripeStatusToSellerStatus(subscription.status)
  const nextPlan = sellerStatus === 'canceled' || sellerStatus === 'none' ? 'free' : 'pro'
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null

  const update = {
    subscription_plan: nextPlan,
    subscription_status: sellerStatus,
    subscription_current_period_end: currentPeriodEnd,
    subscription_provider: 'stripe',
    subscription_customer_id: subscription.customer,
    subscription_external_id: subscription.id,
  }

  const query = supabase.from('sellers').update(update)
  const { error, count } = sellerId
    ? await query.eq('id', sellerId).select('id', { count: 'exact', head: true })
    : await query.eq('subscription_external_id', subscription.id).select('id', { count: 'exact', head: true })

  if (error) throw error

  return {
    status: 'synced',
    sellerId,
    stripeSubscriptionId: subscription.id,
    updatedRows: count ?? null,
    subscriptionStatus: sellerStatus,
  }
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, req)
  }

  const payload = await req.text()
  const signatureHeader = req.headers.get('stripe-signature')
  const verified = await verifyStripeSignature({
    payload,
    signatureHeader,
    webhookSecret,
  })

  if (!verified) {
    return errorResponse('Invalid Stripe signature', 400, req)
  }

  const event = JSON.parse(payload) as StripeEvent
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const shouldProcess = await claimEvent(supabase, event)
  if (!shouldProcess) {
    return successResponse({ received: true, duplicate: true }, 200, req)
  }

  try {
    let result: Record<string, unknown> = { status: 'ignored' }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      result = await syncSubscription(supabase, event.data.object as unknown as StripeSubscription)
    } else if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const sellerId = typeof session.metadata === 'object' && session.metadata
        ? (session.metadata as Record<string, string>).seller_id
        : null
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null
      const customerId = typeof session.customer === 'string' ? session.customer : null

      if (sellerId && subscriptionId && customerId) {
        const { error } = await supabase
          .from('sellers')
          .update({
            subscription_plan: 'pro',
            subscription_status: 'active',
            subscription_provider: 'stripe',
            subscription_customer_id: customerId,
            subscription_external_id: subscriptionId,
          })
          .eq('id', sellerId)

        if (error) throw error
        result = { status: 'checkout_synced', sellerId, stripeSubscriptionId: subscriptionId }
      }
    }

    await markEventResult(supabase, event, result)
    return successResponse({ received: true }, 200, req)
  } catch (error) {
    console.error('stripe-billing-webhook error:', error)
    await releaseEventClaim(supabase, event)
    return errorResponse('Webhook processing failed', 500, req)
  }
})
