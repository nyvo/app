/**
 * Pricing utilities — display mirrors of the fee math.
 *
 * The service fee is a percentage added on top of the course price, charged
 * to the student — identical on every tier. The platform take is the
 * free-tier payout deduction (Pro pays 0%). Both must match the backend
 * source of truth (supabase/functions/_shared/pricing.ts).
 */

const SERVICE_FEE_RATE = 0.05 // 5%

// Bounds for the service fee (NOK) — must match the backend.
const SERVICE_FEE_MIN_NOK = 9
const SERVICE_FEE_MAX_NOK = 149

/** Free-tier platform take on the seller's payout — flat, no floor/cap. */
export const PLATFORM_TAKE_RATE = 0.05 // 5%

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

/**
 * The free-tier platform take deducted from the seller's payout for a given
 * course price. Display mirror of the backend's platformFee — the student's
 * price is unaffected. Returns 0 for free courses.
 */
export function calculatePlatformFee(price: number | null): number {
  if (!price || price <= 0) return 0
  return Math.round(price * 100 * PLATFORM_TAKE_RATE) / 100
}
