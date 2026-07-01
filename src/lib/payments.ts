import type { Seller } from '@/types/database'

/**
 * Payments predicates — the single client-side source of truth for tier and
 * payout-readiness checks.
 *
 * Integrated Stripe payments are open to every tier: publishing a PAID course
 * requires completed Stripe onboarding regardless of plan, while 0 kr courses
 * never do. Tier only decides fees (free pays the platform take, Pro doesn't)
 * and feature access. Mirrors the DB triggers
 * enforce_course_publish_requires_payment / enforce_package_price_requires_payment.
 */
export function isProSeller(
  seller: Pick<Seller, 'subscription_plan'> | null | undefined,
): boolean {
  return seller?.subscription_plan === 'pro'
}

/**
 * True when publishing this course is blocked until Stripe onboarding
 * completes. The DB trigger is the authoritative gate; this keeps sellers out
 * of a guaranteed-to-fail request.
 */
export function publishNeedsPaymentSetup(
  seller: Pick<Seller, 'stripe_onboarding_complete'> | null | undefined,
  courseHasPaidTier: boolean,
): boolean {
  return courseHasPaidTier && !seller?.stripe_onboarding_complete
}
