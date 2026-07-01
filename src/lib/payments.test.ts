import { describe, it, expect } from 'vitest'
import { isProSeller, publishNeedsPaymentSetup } from './payments'

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
