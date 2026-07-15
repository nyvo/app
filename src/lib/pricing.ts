/**
 * Pricing utilities — display mirrors of the fee math.
 *
 * The service fee is a percentage added on top of the course price, charged
 * to the student — identical on every tier. The platform take is the
 * free-tier payout deduction (Pro pays 0%). Both must match the backend
 * source of truth (supabase/functions/_shared/pricing.ts).
 */

// Bounds for the service fee (NOK) — must match the backend.
const SERVICE_FEE_MIN_NOK = 4
const SERVICE_FEE_MAX_NOK = 149

/** Free-tier platform take on the seller's payout — 5%, whole-krone (half-up). */
export const PLATFORM_TAKE_RATE = 0.05 // 5%

// Integer-øre division helpers — mirror supabase/functions/_shared/pricing.ts
// so fee amounts land on whole kroner without floating-point rates.
function ceilDivInt(numerator: number, denominator: number): number {
  return Math.floor((numerator + denominator - 1) / denominator)
}
function roundHalfUpDivInt(numerator: number, denominator: number): number {
  return Math.floor((numerator + Math.floor(denominator / 2)) / denominator)
}

/**
 * Calculate the service fee for a given course price: 5% rounded UP to a whole
 * krone, clamped to [min, max]. Returns 0 for free courses.
 */
export function calculateServiceFee(price: number | null): number {
  if (!price || price <= 0) return 0
  const fivePercentNumerator = Math.round(price * 100) * 5
  return Math.min(SERVICE_FEE_MAX_NOK, Math.max(SERVICE_FEE_MIN_NOK, ceilDivInt(fivePercentNumerator, 10000)))
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
  const fivePercentNumerator = Math.round(price * 100) * 5
  return roundHalfUpDivInt(fivePercentNumerator, 10000)
}

/**
 * Ticket price after the honor-system student/pensjonist discount — display
 * mirror of applyHonorDiscount in supabase/functions/_shared/pricing.ts
 * (whole-krone rounding; both sides MUST agree or the pay button shows a
 * different amount than the PaymentIntent charges).
 */
export function calculateDiscountedPrice(price: number, percent: number): number {
  return Math.max(0, Math.round((price * (100 - percent)) / 100))
}

/**
 * Parse the honor-discount claim off a charge-time ticket label snapshot,
 * e.g. "Drop-in – student (−20 %)". The mark format is written by
 * create-stripe-connect-session — keep the pattern in sync with it.
 * Returns null for full-price labels (and legacy rows without a snapshot).
 */
export interface DiscountClaim {
  audience: 'student' | 'pensjonist'
  /** The full mark as stamped on the label, e.g. "– student (−20 %)" */
  mark: string
}

export function parseDiscountClaim(labelSnapshot: string | null | undefined): DiscountClaim | null {
  const match = labelSnapshot?.match(/– (student|pensjonist) \(−\d+ %\)/)
  if (!match) return null
  return { audience: match[1] as DiscountClaim['audience'], mark: match[0] }
}
