// Stripe Connect webhook — CONNECTED-ACCOUNT events ("Destination 2": Stripe → Webhooks →
// "Events on connected accounts"). Counterpart to stripe-connect-webhook, which handles the
// platform's own "Your account" events (charges/refunds). Verifies the Stripe-Signature header
// against STRIPE_CONNECT_ACCOUNTS_WEBHOOK_SECRET (a SEPARATE secret from the platform endpoint).
//
// Events handled:
//   account.updated → re-derive the seller's stripe_account_status + stripe_onboarding_complete
//       from the LIVE account (identical mapping to check-stripe-connect-status), so a studio's
//       onboarding status auto-syncs without anyone pressing the manual "oppdater status" button.
//   payout.paid     → notify the studio that a payout was sent (payout.sent notification).
//
// Idempotency: processed_webhook_events.event_id = `stripe:${event.id}` (globally unique). Both
// handlers are also naturally idempotent (account.updated re-derives from live state; payout.sent
// dedupes on payout id).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { verifyStripeSignature, retrieveAccount, type StripeConnectedAccount } from '../_shared/stripe.ts'
import { enqueueNotification, type AccountActionReason } from '../_shared/notifications.ts'
import { resolveArrangorIdentity } from '../_shared/booking-notifications.ts'
import { sendEmail } from '../_shared/email.ts'
import { claimEvent, markEventResult, releaseEventClaim } from '../_shared/webhook-claims.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const webhookSecret = Deno.env.get('STRIPE_CONNECT_ACCOUNTS_WEBHOOK_SECRET') || ''
// Absolute base for the email CTA. Stripe calls this webhook with no Origin
// header, so (unlike the interactive account-link functions) we can only use
// the configured SITE_URL, not the caller origin.
const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173'

// Connected-account events carry a top-level `account` (the connected account id) in addition to
// the usual data.object. StripeEvent doesn't model it, so use a local shape.
interface ConnectAccountEvent {
  id: string
  type: string
  account?: string
  data: { object: Record<string, unknown> }
}

type AccountStatus = 'pending' | 'enabled' | 'restricted' | 'rejected'

// Same mapping as check-stripe-connect-status — kept in lockstep so the webhook and the manual
// refresh never disagree. Order matters: not-finished-onboarding → pending; Stripe-rejected →
// rejected; fully usable → enabled; otherwise (verification pending / missing requirements) → restricted.
function mapAccountStatus(account: StripeConnectedAccount): AccountStatus {
  if (account.details_submitted === false) return 'pending'
  if (account.requirements?.disabled_reason?.startsWith('rejected')) return 'rejected'
  if (account.charges_enabled === true) return 'enabled'
  return 'restricted'
}

// Which action-needed state a seller is in (null = healthy). Mirrors the
// frontend AccountStatusBanner: rejected/restricted = charges paused; a still-
// enabled account with payouts off = payouts paused (money accrues, can't
// settle). Severity order matches the notification copy map.
function actionNeededReason(
  status: AccountStatus,
  onboardingComplete: boolean,
  payoutsEnabled: boolean,
): AccountActionReason | null {
  if (status === 'rejected') return 'rejected'
  if (status === 'restricted') return 'restricted'
  if (onboardingComplete && !payoutsEnabled) return 'payouts_paused'
  return null
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Verify the signature against the RAW body (Stripe signs the exact bytes).
  const rawBody = await req.text()
  const signatureHeader = req.headers.get('stripe-signature') || req.headers.get('Stripe-Signature')
  if (!signatureHeader) {
    return new Response('Missing Stripe-Signature header', { status: 400 })
  }
  const valid = await verifyStripeSignature({ payload: rawBody, signatureHeader, webhookSecret })
  if (!valid) {
    return new Response('Invalid signature', { status: 401 })
  }

  let event: ConnectAccountEvent
  try {
    event = JSON.parse(rawBody) as ConnectAccountEvent
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }
  if (!event.id || !event.type) {
    return new Response('Malformed event', { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const eventKey = `stripe:${event.id}`
  const claim = await claimEvent(supabase, eventKey, event.type)
  if (claim === 'duplicate') {
    return new Response(JSON.stringify({ status: 'already_processed' }), { status: 200 })
  }
  if (claim === 'in_flight') {
    // Another isolate holds a fresh claim. Non-2xx so Stripe redelivers — a 200
    // here would permanently drop the event if that isolate was hard-killed, and
    // account-status syncs have no other backstop.
    return new Response('Event claim in flight', { status: 409 })
  }

  try {
    switch (event.type) {
      case 'account.updated': {
        const accountId = (event.data.object as { id?: string }).id || event.account
        if (!accountId) {
          await markEventResult(supabase, eventKey, { type: 'account_updated', error: 'missing_account_id' })
          return new Response('OK', { status: 200 })
        }

        // Snapshot the PRIOR status before writing the new one — the transition
        // (healthy → action-needed, or recovery) is what drives the notification.
        // Read from the same row we're about to update.
        const { data: prevSeller } = await supabase
          .from('sellers')
          .select('id, stripe_account_status, stripe_onboarding_complete, stripe_payouts_enabled')
          .eq('stripe_account_id', accountId)
          .maybeSingle()

        // Re-derive from the LIVE account (order-safe: out-of-order account.updated events can't
        // write a stale status) using the same mapping as the manual refresh. The stripe_* columns
        // are write-protected — this MUST be the service-role client (the trigger exempts it).
        const account = await retrieveAccount(accountId)
        const status = mapAccountStatus(account)
        const onboardingComplete = account.charges_enabled === true
        const payoutsEnabled = account.payouts_enabled === true

        const { error } = await supabase
          .from('sellers')
          .update({
            stripe_account_status: status,
            stripe_onboarding_complete: onboardingComplete,
            stripe_payouts_enabled: payoutsEnabled,
          })
          .eq('stripe_account_id', accountId)
        // Throw on write failure so Stripe retries rather than leaving the status stale.
        if (error) {
          throw new Error(`account.updated seller write failed: ${error.message}`)
        }

        // Notify the studio when a previously-LIVE account newly needs attention.
        // Gating on `wasLive` (prior status 'enabled') filters out the normal
        // pending → restricted churn during initial onboarding: Stripe only
        // disables a live account's charges/payouts when a requirement actually
        // came due, so this transition is genuinely actionable. Best-effort —
        // the dashboard banner (driven by the row we just wrote) is the
        // authoritative surface, so a failed nudge never blocks the status sync.
        if (prevSeller?.id) {
          const prevReason = actionNeededReason(
            (prevSeller.stripe_account_status as AccountStatus) ?? 'pending',
            prevSeller.stripe_onboarding_complete === true,
            prevSeller.stripe_payouts_enabled === true,
          )
          const nextReason = actionNeededReason(status, onboardingComplete, payoutsEnabled)
          const wasLive = prevSeller.stripe_account_status === 'enabled'

          try {
            if (wasLive && prevReason === null && nextReason !== null) {
              await enqueueNotification(supabase, {
                type: 'account.action_required',
                sellerId: prevSeller.id,
                reason: nextReason,
                eventId: event.id,
              })

              const identity = await resolveArrangorIdentity(supabase, prevSeller.id)
              if (identity?.contactEmail) {
                await sendEmail({
                  template: 'account-action-required',
                  to: identity.contactEmail,
                  props: {
                    studioName: identity.name,
                    reason: nextReason,
                    actionUrl: `${siteUrl}/settings/payouts`,
                  },
                })
              }
            } else if (prevReason !== null && nextReason === null) {
              // Recovered — clear the amber bell dot on any outstanding rows.
              await supabase
                .from('notifications')
                .update({ resolved_at: new Date().toISOString() })
                .eq('seller_id', prevSeller.id)
                .eq('type', 'account.action_required')
                .is('resolved_at', null)
            }
          } catch (notifyErr) {
            console.error('[account.updated] action-required notify failed', {
              account: accountId,
              error: notifyErr instanceof Error ? notifyErr.message : 'unknown',
            })
          }
        }

        await markEventResult(supabase, eventKey, {
          type: 'account_updated', account: accountId, status,
          onboarding_complete: onboardingComplete, payouts_enabled: payoutsEnabled,
        })
        return new Response('OK', { status: 200 })
      }

      case 'payout.paid': {
        const accountId = event.account
        const payout = event.data.object as { id?: string; amount?: number }
        if (!accountId || !payout.id) {
          await markEventResult(supabase, eventKey, { type: 'payout_paid', error: 'missing_account_or_payout' })
          return new Response('OK', { status: 200 })
        }

        const { data: seller } = await supabase
          .from('sellers')
          .select('id')
          .eq('stripe_account_id', accountId)
          .maybeSingle()

        if (seller) {
          // payout.amount is in øre; the notification formats kroner (dedupes on the payout id).
          await enqueueNotification(supabase, {
            type: 'payout.sent',
            sellerId: seller.id,
            settlementId: payout.id,
            amount: (payout.amount ?? 0) / 100,
          })
        }

        await markEventResult(supabase, eventKey, { type: 'payout_paid', account: accountId, payout: payout.id })
        return new Response('OK', { status: 200 })
      }

      default: {
        await markEventResult(supabase, eventKey, { type: 'unhandled', event_type: event.type })
        return new Response('OK', { status: 200 })
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown'
    // Release the claim if work never reached a terminal result, so Stripe's retry re-runs instead
    // of hitting the already_processed fast-path. If this release itself fails, the stale-claim
    // reclaim in claimEvent recovers the event on a later retry.
    try {
      await releaseEventClaim(supabase, eventKey)
    } catch (_releaseErr) {
      // Non-fatal — surfacing the original error to Stripe (→ retry) is what matters.
    }
    return new Response(`Webhook Error: ${message}`, { status: 500 })
  }
})
