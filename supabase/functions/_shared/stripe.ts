import Stripe from 'npm:stripe@17.3.1'

export const STRIPE_API_VERSION = '2024-12-18.acacia' as const

/**
 * Create a Stripe client with consistent configuration.
 * All edge functions should use this instead of creating their own instance.
 */
export function createStripeClient(): Stripe {
  const key = Deno.env.get('STRIPE_SECRET_KEY')
  if (!key) {
    console.error('STRIPE_SECRET_KEY not configured')
  }
  return new Stripe(key || '', {
    apiVersion: STRIPE_API_VERSION,
  })
}
