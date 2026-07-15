import { describe, it, expect } from 'vitest'
import {
  isProSeller,
  publishNeedsPaymentSetup,
  shouldShowPlatformFeeUpsell,
  PRO_MONTHLY_PRICE_NOK,
} from './payments'

const onboarded = { stripe_onboarding_complete: true }
const notOnboarded = { stripe_onboarding_complete: false }

describe('publishNeedsPaymentSetup', () => {
  it('blocks a paid course until Stripe onboarding completes — on every tier', () => {
    expect(publishNeedsPaymentSetup(notOnboarded, true)).toBe(true)
    expect(publishNeedsPaymentSetup(onboarded, true)).toBe(false)
  })

  it('never blocks a free (0 kr) course', () => {
    expect(publishNeedsPaymentSetup(notOnboarded, false)).toBe(false)
    expect(publishNeedsPaymentSetup(onboarded, false)).toBe(false)
  })

  it('treats a missing seller as not onboarded', () => {
    expect(publishNeedsPaymentSetup(null, true)).toBe(true)
    expect(publishNeedsPaymentSetup(undefined, true)).toBe(true)
    expect(publishNeedsPaymentSetup(null, false)).toBe(false)
  })
})

describe('isProSeller', () => {
  it('is a plan check only — payments are not gated on it', () => {
    expect(isProSeller({ subscription_plan: 'pro' })).toBe(true)
    expect(isProSeller({ subscription_plan: 'free' })).toBe(false)
    expect(isProSeller(null)).toBe(false)
  })
})

describe('shouldShowPlatformFeeUpsell', () => {
  it('never shows for Pro sellers, regardless of measured fees', () => {
    expect(shouldShowPlatformFeeUpsell(0, true)).toBe(false)
    expect(shouldShowPlatformFeeUpsell(PRO_MONTHLY_PRICE_NOK, true)).toBe(false)
    expect(shouldShowPlatformFeeUpsell(10_000, true)).toBe(false)
  })

  it('hides below the Pro price so it never implies false savings', () => {
    expect(shouldShowPlatformFeeUpsell(0, false)).toBe(false)
    expect(shouldShowPlatformFeeUpsell(1, false)).toBe(false)
    expect(shouldShowPlatformFeeUpsell(PRO_MONTHLY_PRICE_NOK - 1, false)).toBe(false)
  })

  it('shows at or above the Pro price for Start sellers', () => {
    expect(PRO_MONTHLY_PRICE_NOK).toBe(499)
    expect(shouldShowPlatformFeeUpsell(PRO_MONTHLY_PRICE_NOK, false)).toBe(true)
    expect(shouldShowPlatformFeeUpsell(PRO_MONTHLY_PRICE_NOK + 100, false)).toBe(true)
  })
})
