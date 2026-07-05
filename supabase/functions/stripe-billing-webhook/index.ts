import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { errorResponse, successResponse, handleCors } from '../_shared/auth.ts'
import {
  verifyStripeSignature,
  retrieveSubscription,
  type StripeEvent,
  type StripeSubscription,
} from '../_shared/stripe.ts'
import { claimEvent, markEventResult, releaseEventClaim } from '../_shared/webhook-claims.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''

function stripeStatusToSellerStatus(status: string): 'active' | 'past_due' | 'canceled' | 'none' {
  if (status === 'active' || status === 'trialing') return 'active'
  // NOT 'incomplete': past_due is treated as full Pro across the app (0% platform
  // take, "already has Pro" guard) — a subscription whose FIRST invoice was never
  // paid must map to 'none' so the seller stays on the free plan.
  if (status === 'past_due' || status === 'unpaid') return 'past_due'
  if (status === 'canceled' || status === 'incomplete_expired' || status === 'paused') return 'canceled'
  return 'none'
}

async function syncSubscription(
  supabase: SupabaseClient,
  subscription: StripeSubscription,
): Promise<Record<string, unknown>> {
  const sellerId = subscription.metadata?.seller_id ?? null
  const sellerStatus = stripeStatusToSellerStatus(subscription.status)
  const nextPlan = sellerStatus === 'canceled' || sellerStatus === 'none' ? 'free' : 'pro'
  // Recent Stripe API versions moved current_period_end onto the subscription
  // item; fall back to the subscription-level field for older versions.
  const periodEndUnix =
    subscription.items?.data?.[0]?.current_period_end ?? subscription.current_period_end ?? null
  const currentPeriodEnd = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null

  const update = {
    subscription_plan: nextPlan,
    subscription_status: sellerStatus,
    subscription_current_period_end: currentPeriodEnd,
    subscription_cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    subscription_provider: 'stripe',
    subscription_customer_id: subscription.customer,
    subscription_external_id: subscription.id,
  }

  // A downgrade (canceled/none) must never clobber a row that already points at
  // a DIFFERENT subscription. Otherwise a late-retried subscription.deleted for
  // an OLD subscription — after the seller cancelled and re-subscribed — would
  // overwrite the newer active Pro row with free/canceled (Stripe redelivers
  // for up to 3 days). Scope the downgrade to this subscription (or a seller
  // with no subscription yet). Grants/active syncs are keyed on seller_id and
  // overwrite unconditionally, which is correct — live state is authoritative.
  const isDowngrade = sellerStatus === 'canceled' || sellerStatus === 'none'

  let query = supabase.from('sellers').update(update)
  if (sellerId) {
    query = query.eq('id', sellerId)
    if (isDowngrade) {
      query = query.or(
        `subscription_external_id.eq.${subscription.id},subscription_external_id.is.null`,
      )
    }
  } else {
    // No seller_id on the event — key on the subscription id, which is already
    // scoped to exactly this subscription.
    query = query.eq('subscription_external_id', subscription.id)
  }

  const { error, count } = await query.select('id', { count: 'exact', head: true })

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

  const eventKey = `stripe:${event.id}`
  const claim = await claimEvent(supabase, eventKey, event.type)
  if (claim === 'duplicate') {
    return successResponse({ received: true, duplicate: true }, 200, req)
  }
  if (claim === 'in_flight') {
    // Another isolate holds a fresh claim. Non-2xx so Stripe redelivers — a 200
    // here would permanently drop the event if that isolate was hard-killed, and
    // subscription syncs have no other backstop.
    return errorResponse('Event claim in flight', 409, req)
  }

  try {
    let result: Record<string, unknown> = { status: 'ignored' }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      // Stripe does NOT guarantee event ordering — a delayed 'updated' can carry
      // stale state (e.g. re-granting Pro after a 'deleted'). Sync from the LIVE
      // subscription instead of the event payload; a retrieve failure throws so
      // the claim is released and Stripe retries.
      const eventSub = event.data.object as unknown as StripeSubscription
      const live = await retrieveSubscription(eventSub.id)
      result = await syncSubscription(supabase, {
        ...live,
        metadata: { ...eventSub.metadata, ...live.metadata },
      })
    } else if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const sellerId = typeof session.metadata === 'object' && session.metadata
        ? (session.metadata as Record<string, string>).seller_id
        : null
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null
      const customerId = typeof session.customer === 'string' ? session.customer : null

      if (sellerId && subscriptionId && customerId) {
        // The session object carries neither subscription status nor period end —
        // sync from the live subscription so the seller row is complete from the
        // first event (metadata.seller_id is forced from the session, which is
        // authoritative for who checked out).
        const live = await retrieveSubscription(subscriptionId)
        const synced = await syncSubscription(supabase, {
          ...live,
          customer: customerId,
          metadata: { ...live.metadata, seller_id: sellerId },
        })
        result = { ...synced, status: 'checkout_synced' }
      }
    }

    await markEventResult(supabase, eventKey, result)
    return successResponse({ received: true }, 200, req)
  } catch (error) {
    console.error('stripe-billing-webhook error:', error)
    await releaseEventClaim(supabase, eventKey)
    return errorResponse('Webhook processing failed', 500, req)
  }
})
