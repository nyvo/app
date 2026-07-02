/**
 * Shared pricing constants for all payment edge functions.
 * Change these values here to update all payment flows at once.
 */

/** Service fee rate charged to the student on top of the course price */
export const SERVICE_FEE_RATE = 0.05 // 5%

/**
 * Platform take on free-tier ("Start") sellers, deducted from the seller's
 * payout via the Stripe application fee. Pro sellers pay 0%. Flat rate — no
 * floor/cap: 0 kr when the seller earns 0 kr, and the Pro crossover math
 * stays a one-liner (5% × 10 000 kr/mnd ≈ 499 kr).
 */
export const PLATFORM_TAKE_RATE = 0.05 // 5%

/**
 * Bounds for the student service fee (NOK).
 * Floor covers the flat per-payout cost on cheap drop-ins; cap keeps the fee
 * from getting punitive on expensive course series.
 */
export const SERVICE_FEE_MIN_NOK = 9
export const SERVICE_FEE_MAX_NOK = 149

/**
 * Calculate pricing breakdown for a given base price.
 * Returns all values in both NOK and øre (Stripe's smallest unit).
 *
 * `platformTake` adds the free-tier platform fee. It never changes what the
 * student pays (priceInOre) — it only grows the application fee pulled back
 * from the seller's payout.
 */
export function calculatePricing(basePrice: number, opts?: { platformTake?: boolean }) {
  const serviceFeeNok =
    basePrice > 0
      ? Math.min(SERVICE_FEE_MAX_NOK, Math.max(SERVICE_FEE_MIN_NOK, Math.round(basePrice * SERVICE_FEE_RATE)))
      : 0
  const totalPrice = basePrice + serviceFeeNok
  const priceInOre = Math.round(totalPrice * 100)
  const basePriceInOre = Math.round(basePrice * 100)
  const serviceFeeInOre = Math.round(serviceFeeNok * 100)
  const platformFeeInOre =
    opts?.platformTake && basePrice > 0 ? Math.round(basePriceInOre * PLATFORM_TAKE_RATE) : 0
  const platformFeeNok = platformFeeInOre / 100

  return {
    serviceFeeNok,
    totalPrice,
    priceInOre,
    basePriceInOre,
    serviceFeeInOre,
    platformFeeInOre,
    platformFeeNok,
  }
}
