/**
 * Pricing utilities — service fee calculation
 *
 * The service fee is a percentage added on top of the course price,
 * charged to the student. It covers platform costs.
 *
 * This rate must match the backend edge function
 * (supabase/functions/create-dintero-session/index.ts).
 */

const SERVICE_FEE_RATE = 0.05 // 5%

// Bounds for the service fee (NOK) — must match the backend.
const SERVICE_FEE_MIN_NOK = 9
const SERVICE_FEE_MAX_NOK = 149

/**
 * Calculate the service fee for a given course price.
 * Clamped to [min, max]; returns 0 for free courses.
 */
export function calculateServiceFee(price: number | null): number {
  if (!price || price <= 0) return 0
  return Math.min(SERVICE_FEE_MAX_NOK, Math.max(SERVICE_FEE_MIN_NOK, Math.round(price * SERVICE_FEE_RATE)))
}

/**
 * Calculate total price including service fee.
 * Returns 0 for free courses.
 */
export function calculateTotalPrice(price: number | null): number {
  if (!price || price <= 0) return 0
  return price + calculateServiceFee(price)
}
