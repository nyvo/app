import type { Seller } from '@/types/database'

/**
 * Payments-tier predicates — the single client-side source of truth for
 * "does this seller sell through integrated Dintero payments".
 *
 * Free-tier sellers handle payment off-platform ("betaling avtales med
 * instruktør") and never touch Dintero; only Pro sellers are required to
 * complete Dintero onboarding before publishing. Mirrors the DB trigger
 * enforce_course_publish_requires_dintero and the sellers
 * uses_integrated_payments generated column.
 */
export function isProSeller(
  seller: Pick<Seller, 'subscription_plan'> | null | undefined,
): boolean {
  return seller?.subscription_plan === 'pro'
}

/** True when publishing is blocked until Dintero onboarding completes (Pro only). */
export function sellerNeedsDinteroSetup(
  seller: Pick<Seller, 'subscription_plan' | 'dintero_onboarding_complete'> | null | undefined,
): boolean {
  return isProSeller(seller) && !seller?.dintero_onboarding_complete
}
