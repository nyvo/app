import { describe, it, expect } from 'vitest'
import {
  calculateServiceFee,
  calculateTotalPrice,
  calculatePlatformFee,
  calculateDiscountedPrice,
} from './pricing'
import {
  calculatePricing,
  applyHonorDiscount,
  SERVICE_FEE_MIN_NOK,
  SERVICE_FEE_MAX_NOK,
} from '../../supabase/functions/_shared/pricing.ts'

describe('calculateServiceFee', () => {
  it('returns 0 for free courses', () => {
    expect(calculateServiceFee(null)).toBe(0)
    expect(calculateServiceFee(0)).toBe(0)
    expect(calculateServiceFee(-100)).toBe(0)
  })

  it('is 5% rounded UP to a whole krone', () => {
    expect(calculateServiceFee(500)).toBe(25) // 25.0
    expect(calculateServiceFee(150)).toBe(8) // 7.5 → 8
    expect(calculateServiceFee(100)).toBe(5) // 5.0
    expect(calculateServiceFee(1290)).toBe(65) // 64.5 → 65
  })

  it('applies the 4 kr floor on cheap drop-ins', () => {
    expect(SERVICE_FEE_MIN_NOK).toBe(4)
    expect(calculateServiceFee(10)).toBe(4) // 0.5 → floored
    expect(calculateServiceFee(50)).toBe(4) // 2.5 → floored
    expect(calculateServiceFee(80)).toBe(4) // exactly 4.0, still floor
  })

  it('crosses off the floor exactly at 81 kr (5% = 4.05 → 5)', () => {
    expect(calculateServiceFee(80)).toBe(4)
    expect(calculateServiceFee(81)).toBe(5)
  })

  it('applies the 149 kr cap on expensive course series', () => {
    expect(SERVICE_FEE_MAX_NOK).toBe(149)
    expect(calculateServiceFee(2980)).toBe(149) // 5% = 149, exactly at cap
    expect(calculateServiceFee(3000)).toBe(149) // 150 → capped
    expect(calculateServiceFee(6000)).toBe(149)
    expect(calculateServiceFee(20000)).toBe(149)
  })
})

describe('calculateTotalPrice', () => {
  it('returns 0 for free courses', () => {
    expect(calculateTotalPrice(null)).toBe(0)
    expect(calculateTotalPrice(0)).toBe(0)
  })

  it('is base + clamped fee (whole kroner)', () => {
    expect(calculateTotalPrice(10)).toBe(14) // 10 + 4
    expect(calculateTotalPrice(100)).toBe(105) // 100 + 5
    expect(calculateTotalPrice(500)).toBe(525) // 500 + 25
    expect(calculateTotalPrice(6000)).toBe(6149) // 6000 + 149
  })
})

describe('calculatePlatformFee (free-tier take, whole krone half-up)', () => {
  it('returns 0 for free courses', () => {
    expect(calculatePlatformFee(null)).toBe(0)
    expect(calculatePlatformFee(0)).toBe(0)
  })

  it('is 5% rounded half-up to a whole krone', () => {
    expect(calculatePlatformFee(10)).toBe(1) // 0.5 → 1
    expect(calculatePlatformFee(50)).toBe(3) // 2.5 → 3
    expect(calculatePlatformFee(100)).toBe(5) // 5.0
    expect(calculatePlatformFee(150)).toBe(8) // 7.5 → 8
    expect(calculatePlatformFee(500)).toBe(25) // 25.0
  })

  it('rounds halves up and everything else to nearest', () => {
    expect(calculatePlatformFee(90)).toBe(5) // 4.5 → 5 (half up)
    expect(calculatePlatformFee(110)).toBe(6) // 5.5 → 6 (half up)
    expect(calculatePlatformFee(44)).toBe(2) // 2.2 → 2 (down)
    expect(calculatePlatformFee(70)).toBe(4) // 3.5 → 4 (half up)
  })
})

describe('backend calculatePricing (shared edge-function math)', () => {
  it('clamps the service fee between floor and cap', () => {
    expect(calculatePricing(10).serviceFeeNok).toBe(SERVICE_FEE_MIN_NOK)
    expect(calculatePricing(80).serviceFeeNok).toBe(4)
    expect(calculatePricing(81).serviceFeeNok).toBe(5)
    expect(calculatePricing(500).serviceFeeNok).toBe(25)
    expect(calculatePricing(6000).serviceFeeNok).toBe(SERVICE_FEE_MAX_NOK)
  })

  it('returns 0 fee for a non-positive base price', () => {
    expect(calculatePricing(0).serviceFeeNok).toBe(0)
    expect(calculatePricing(0).totalPrice).toBe(0)
    expect(calculatePricing(0, { platformTake: true }).platformFeeNok).toBe(0)
  })

  it('keeps the order total equal to the sum of item lines', () => {
    for (const base of [10, 50, 80, 81, 100, 180, 200, 350, 500, 1290, 2980, 3000, 6000]) {
      const p = calculatePricing(base)
      expect(p.basePriceInOre + p.serviceFeeInOre).toBe(p.priceInOre)
      expect(p.totalPrice).toBe(base + p.serviceFeeNok)
    }
  })

  it('takes no platform fee by default (Pro / active subscription)', () => {
    const p = calculatePricing(500)
    expect(p.platformFeeInOre).toBe(0)
    expect(p.platformFeeNok).toBe(0)
    expect(p.basePriceInOre).toBe(50_000)
    expect(p.serviceFeeInOre).toBe(2_500)
  })

  it('takes a flat 5% of the base price on the free tier, rounded to whole krone', () => {
    expect(calculatePricing(10, { platformTake: true }).platformFeeNok).toBe(1)
    expect(calculatePricing(50, { platformTake: true }).platformFeeNok).toBe(3)
    expect(calculatePricing(100, { platformTake: true }).platformFeeNok).toBe(5)
    expect(calculatePricing(150, { platformTake: true }).platformFeeNok).toBe(8)
    expect(calculatePricing(500, { platformTake: true }).platformFeeNok).toBe(25)
    // Platform take carries no floor and no cap.
    expect(calculatePricing(20_000, { platformTake: true }).platformFeeNok).toBe(1_000)
    // øre mirror stays consistent with the whole-krone value.
    expect(calculatePricing(50, { platformTake: true }).platformFeeInOre).toBe(300)
  })

  it('composes the Stripe application fee as serviceFee + platformTake (øre)', () => {
    const cheap = calculatePricing(10, { platformTake: true })
    expect(cheap.serviceFeeInOre + cheap.platformFeeInOre).toBe(400 + 100) // 4 + 1 kr
    const mid = calculatePricing(500, { platformTake: true })
    expect(mid.serviceFeeInOre + mid.platformFeeInOre).toBe(2_500 + 2_500) // 25 + 25 kr
    // Pro seller: application fee is the service fee alone.
    const pro = calculatePricing(500)
    expect(pro.serviceFeeInOre + pro.platformFeeInOre).toBe(2_500)
  })

  it('never changes what the student pays — the take only grows the application fee', () => {
    for (const base of [10, 50, 200, 500, 2980, 6000]) {
      const pro = calculatePricing(base)
      const free = calculatePricing(base, { platformTake: true })
      expect(free.priceInOre).toBe(pro.priceInOre)
      expect(free.serviceFeeInOre).toBe(pro.serviceFeeInOre)
    }
  })
})

describe('frontend/backend parity', () => {
  it('frontend service fee matches backend fee for all price points', () => {
    for (let base = 1; base <= 8000; base += 7) {
      expect(calculateServiceFee(base)).toBe(calculatePricing(base).serviceFeeNok)
    }
  })

  it('frontend platform fee matches the backend take for all price points', () => {
    for (let base = 1; base <= 8000; base += 7) {
      expect(calculatePlatformFee(base)).toBe(
        calculatePricing(base, { platformTake: true }).platformFeeNok,
      )
    }
    expect(calculatePlatformFee(null)).toBe(0)
    expect(calculatePlatformFee(0)).toBe(0)
  })
})

describe('student/pensjonist discount', () => {
  it('rounds to whole kroner', () => {
    expect(applyHonorDiscount(500, 20)).toBe(400)
    expect(applyHonorDiscount(333, 15)).toBe(283) // 283.05 → 283
    expect(applyHonorDiscount(999, 10)).toBe(899) // 899.1 → 899
  })

  it('never goes negative and keeps a price for the allowed 5–90 range', () => {
    for (let percent = 5; percent <= 90; percent += 5) {
      expect(applyHonorDiscount(1, percent)).toBeGreaterThanOrEqual(0)
      expect(applyHonorDiscount(100, percent)).toBeGreaterThan(0)
    }
  })

  it('frontend mirror matches the backend charge for all price/percent points', () => {
    for (let base = 1; base <= 4000; base += 13) {
      for (let percent = 5; percent <= 90; percent += 5) {
        expect(calculateDiscountedPrice(base, percent)).toBe(applyHonorDiscount(base, percent))
      }
    }
  })
})
