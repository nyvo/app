import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { logger } from '@/lib/logger'

// Singleton promise for Stripe instance
let stripePromise: Promise<Stripe | null> | null = null

/**
 * Get or create the Stripe instance.
 * Uses singleton pattern to avoid multiple loads.
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

    if (!publishableKey) {
      logger.warn('Stripe publishable key not configured')
      return Promise.resolve(null)
    }

    stripePromise = loadStripe(publishableKey)
  }

  return stripePromise
}

