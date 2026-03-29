/**
 * Pricing utilities — service fee calculation
 *
 * The service fee is a percentage added on top of the course price,
 * charged to the student. It covers platform costs.
 *
 * This rate must match the backend edge function
 * (supabase/functions/create-payment-intent/index.ts).
 */

const SERVICE_FEE_RATE = 0.05 // 5%

/**
 * Calculate the service fee for a given course price.
 * Returns 0 for free courses.
 */
export function calculateServiceFee(price: number | null): number {
  if (!price || price <= 0) return 0
  return Math.round(price * SERVICE_FEE_RATE)
}

/**
 * Calculate total price including service fee.
 * Returns 0 for free courses.
 */
export function calculateTotalPrice(price: number | null): number {
  if (!price || price <= 0) return 0
  return price + calculateServiceFee(price)
}
