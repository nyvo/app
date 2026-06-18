import { loadStripe, type Stripe } from '@stripe/stripe-js'

// Single Stripe.js promise for the app. loadStripe memoizes the script load, and keeping one
// promise avoids re-reading the env on every Elements mount. The publishable key is public
// (pk_test_/pk_live_) — safe to ship in the client bundle.
const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined

let stripePromise: Promise<Stripe | null> | null = null

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey ?? '')
  }
  return stripePromise
}
