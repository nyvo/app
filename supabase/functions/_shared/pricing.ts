/**
 * Shared pricing constants for all payment edge functions.
 * Change these values here to update all payment flows at once.
 */

/** Service fee rate charged to the student on top of the course price */
export const SERVICE_FEE_RATE = 0.05 // 5%

/** Platform fee rate taken from the teacher's revenue (percentage of base price) */
export const PLATFORM_FEE_RATE = 0.05 // 5%

/**
 * Calculate pricing breakdown for a given base price.
 * Returns all values in both NOK and øre (Stripe's smallest unit).
 */
export function calculatePricing(basePrice: number) {
  const serviceFeeNok = Math.round(basePrice * SERVICE_FEE_RATE)
  const totalPrice = basePrice + serviceFeeNok
  const priceInOre = Math.round(totalPrice * 100)
  const basePriceInOre = Math.round(basePrice * 100)
  const serviceFeeInOre = Math.round(serviceFeeNok * 100)
  const platformFee = Math.round(basePriceInOre * PLATFORM_FEE_RATE) + serviceFeeInOre

  return {
    serviceFeeNok,
    totalPrice,
    priceInOre,
    basePriceInOre,
    serviceFeeInOre,
    platformFee,
  }
}
