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

export type PaymentProvider = 'dintero' | 'stripe' | 'both'

/**
 * Which payment integration checkout + seller onboarding use, from VITE_PAYMENT_PROVIDER.
 * Phase-4 cutover (2026-06-20): defaults to 'stripe' — Stripe Connect is now the live provider.
 * Roll back by setting VITE_PAYMENT_PROVIDER='dintero' (or 'both' for the overlap), no redeploy of
 * code needed. Dintero is removed entirely in Phase 6. See .context/plans/dintero-to-stripe-migration.md.
 */
export function getPaymentProvider(): PaymentProvider {
  const value = import.meta.env.VITE_PAYMENT_PROVIDER
  return value === 'dintero' || value === 'both' ? value : 'stripe'
}
