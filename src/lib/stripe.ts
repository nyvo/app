import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { logger } from '@/lib/logger'

// Single Stripe.js promise for the app. loadStripe memoizes the script load, and keeping one
// promise avoids re-reading the env on every Elements mount. The publishable key is public
// (pk_test_/pk_live_) — safe to ship in the client bundle.
const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined

// Whether a publishable key is present at all. Checkout gates its UI on this so a
// misconfigured deploy shows a clear error instead of Stripe silently failing to
// mount — loadStripe('') resolves to null and leaves Elements stuck loading forever.
export const isStripeConfigured = Boolean(publishableKey)

let stripePromise: Promise<Stripe | null> | null = null

export function getStripe(): Promise<Stripe | null> {
  if (!publishableKey) {
    // Loud, actionable failure: the deploy is missing VITE_STRIPE_PUBLISHABLE_KEY.
    logger.error('Stripe is not configured: VITE_STRIPE_PUBLISHABLE_KEY is missing')
    return Promise.resolve(null)
  }
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey)
  }
  return stripePromise
}
