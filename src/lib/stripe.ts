import { loadStripe, type Stripe } from '@stripe/stripe-js'

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
      console.warn('Stripe publishable key not configured')
      return Promise.resolve(null)
    }

    stripePromise = loadStripe(publishableKey)
  }

  return stripePromise
}

/**
 * Redirect to Stripe Checkout using URL (modern approach).
 * @param checkoutUrl - The Checkout URL from the backend
 */
export function redirectToCheckout(checkoutUrl: string): void {
  window.location.href = checkoutUrl
}

/**
 * Format amount for display (øre to kroner).
 * @param amountInOre - Amount in øre (cents)
 * @returns Formatted string like "250 kr"
 */
export function formatPrice(amountInOre: number): string {
  const kroner = amountInOre / 100
  return `${kroner.toLocaleString('nb-NO')} kr`
}

/**
 * Convert kroner to øre for Stripe.
 * @param kroner - Amount in kroner
 * @returns Amount in øre (cents)
 */
export function kronerToOre(kroner: number): number {
  return Math.round(kroner * 100)
}
