import type { Seller } from '@/types/database'

/**
 * Payments-tier predicates — the single client-side source of truth for
 * "does this seller sell through integrated Stripe payments".
 *
 * Free-tier sellers handle payment off-platform ("betaling avtales med
 * instruktør") and never touch Stripe Connect; only Pro sellers are required
 * to complete Stripe onboarding before publishing. Mirrors the DB trigger
 * enforce_course_publish_requires_payment and the sellers
 * uses_integrated_payments generated column.
 */
export function isProSeller(
  seller: Pick<Seller, 'subscription_plan'> | null | undefined,
): boolean {
  return seller?.subscription_plan === 'pro'
}

/** True when publishing is blocked until Stripe onboarding completes (Pro only). */
export function sellerNeedsPaymentSetup(
  seller: Pick<Seller, 'subscription_plan' | 'stripe_onboarding_complete'> | null | undefined,
): boolean {
  return isProSeller(seller) && !seller?.stripe_onboarding_complete
}
