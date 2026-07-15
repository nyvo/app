/**
 * Shared pricing constants for all payment edge functions.
 * Change these values here to update all payment flows at once.
 */

/** Service fee rate charged to the student on top of the course price. */
export const SERVICE_FEE_RATE = 0.05 // 5%

/**
 * Platform take on free-tier ("Start") sellers, deducted from the seller's
 * payout via the Stripe application fee. Pro sellers pay 0%. Rounded to a whole
 * krone (half-up) so the payout never carries øre.
 */
export const PLATFORM_TAKE_RATE = 0.05 // 5%

/**
 * Bounds for the student service fee (NOK). The 5% is rounded UP to a whole
 * krone, then clamped: the floor covers the flat per-payout cost on cheap
 * drop-ins, the cap keeps the fee from getting punitive on expensive series.
 */
export const SERVICE_FEE_MIN_NOK = 4
export const SERVICE_FEE_MAX_NOK = 149

/**
 * Integer-øre division helpers — all fee math avoids floating-point rates so
 * amounts land on whole kroner exactly. Both take non-negative integer operands.
 * `ceilDivInt` rounds up; `roundHalfUpDivInt` rounds to nearest, halves up.
 */
function ceilDivInt(numerator: number, denominator: number): number {
  return Math.floor((numerator + denominator - 1) / denominator)
}
function roundHalfUpDivInt(numerator: number, denominator: number): number {
  return Math.floor((numerator + Math.floor(denominator / 2)) / denominator)
}

/**
 * Ticket price after the honor-system student/pensjonist discount (whole-krone
 * rounding). Source of truth for the charge; src/lib/pricing.ts
 * calculateDiscountedPrice is the display mirror — keep them identical.
 */
export function applyHonorDiscount(price: number, percent: number): number {
  return Math.max(0, Math.round((price * (100 - percent)) / 100))
}

/**
 * Calculate pricing breakdown for a given base price.
 * Returns all values in both NOK and øre (Stripe's smallest unit).
 *
 * `platformTake` adds the free-tier platform fee. It never changes what the
 * student pays (priceInOre) — it only grows the application fee pulled back
 * from the seller's payout.
 */
export function calculatePricing(basePrice: number, opts?: { platformTake?: boolean }) {
  const basePriceInOre = Math.round(basePrice * 100)
  // 5% of the price in whole kroner = basePriceInOre * 5 / 10000 (÷100 for the
  // rate, ÷100 for øre→krone). Numerator stays an integer; the div helpers round.
  const fivePercentNumerator = basePriceInOre * 5

  // Buyer service fee: 5% rounded UP to a whole krone, clamped to [min, max].
  const serviceFeeNok =
    basePrice > 0
      ? Math.min(SERVICE_FEE_MAX_NOK, Math.max(SERVICE_FEE_MIN_NOK, ceilDivInt(fivePercentNumerator, 10000)))
      : 0

  // Seller platform take: 5% rounded half-up to a whole krone; free tier only.
  const platformFeeNok =
    opts?.platformTake && basePrice > 0 ? roundHalfUpDivInt(fivePercentNumerator, 10000) : 0

  const serviceFeeInOre = serviceFeeNok * 100
  const platformFeeInOre = platformFeeNok * 100
  const priceInOre = basePriceInOre + serviceFeeInOre
  const totalPrice = basePrice + serviceFeeNok

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
