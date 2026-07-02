import { describe, it, expect } from 'vitest'
import { calculateServiceFee, calculateTotalPrice, calculatePlatformFee } from './pricing'
import {
  calculatePricing,
  SERVICE_FEE_MIN_NOK,
  SERVICE_FEE_MAX_NOK,
  PLATFORM_TAKE_RATE,
} from '../../supabase/functions/_shared/pricing.ts'

describe('calculateServiceFee', () => {
  it('returns 0 for free courses', () => {
    expect(calculateServiceFee(null)).toBe(0)
    expect(calculateServiceFee(0)).toBe(0)
    expect(calculateServiceFee(-100)).toBe(0)
  })

  it('charges 5% in the normal range', () => {
    expect(calculateServiceFee(200)).toBe(10)
    expect(calculateServiceFee(500)).toBe(25)
    expect(calculateServiceFee(1000)).toBe(50)
  })

  it('applies the 9 kr floor on cheap drop-ins', () => {
    expect(calculateServiceFee(50)).toBe(9)
    expect(calculateServiceFee(100)).toBe(9)
    expect(calculateServiceFee(150)).toBe(9) // 5% = 7.5 → floored
    expect(calculateServiceFee(180)).toBe(9) // 5% = 9, exactly at floor
  })

  it('applies the 149 kr cap on expensive course series', () => {
    expect(calculateServiceFee(2980)).toBe(149) // 5% = 149, exactly at cap
    expect(calculateServiceFee(3000)).toBe(149)
    expect(calculateServiceFee(6000)).toBe(149)
    expect(calculateServiceFee(20000)).toBe(149)
  })
})

describe('calculateTotalPrice', () => {
  it('returns 0 for free courses', () => {
    expect(calculateTotalPrice(null)).toBe(0)
    expect(calculateTotalPrice(0)).toBe(0)
  })

  it('is base + clamped fee', () => {
    expect(calculateTotalPrice(500)).toBe(525)
    expect(calculateTotalPrice(100)).toBe(109)
    expect(calculateTotalPrice(6000)).toBe(6149)
  })
})

describe('backend calculatePricing (shared edge-function math)', () => {
  it('clamps the service fee between floor and cap', () => {
    expect(calculatePricing(100).serviceFeeNok).toBe(SERVICE_FEE_MIN_NOK)
    expect(calculatePricing(500).serviceFeeNok).toBe(25)
    expect(calculatePricing(6000).serviceFeeNok).toBe(SERVICE_FEE_MAX_NOK)
  })

  it('returns 0 fee for a non-positive base price', () => {
    expect(calculatePricing(0).serviceFeeNok).toBe(0)
    expect(calculatePricing(0).totalPrice).toBe(0)
  })

  it('keeps the order total equal to the sum of item lines', () => {
    for (const base of [50, 100, 180, 200, 350, 500, 1290, 2980, 3000, 6000]) {
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

  it('takes a flat 5% of the base price on the free tier — no floor, no cap', () => {
    expect(calculatePricing(500, { platformTake: true }).platformFeeInOre).toBe(2_500)
    // Below the service-fee floor: the take has no floor.
    expect(calculatePricing(50, { platformTake: true }).platformFeeInOre).toBe(250)
    // Above the service-fee cap: the take has no cap.
    expect(calculatePricing(20_000, { platformTake: true }).platformFeeInOre).toBe(100_000)
    // Never on a free course.
    expect(calculatePricing(0, { platformTake: true }).platformFeeInOre).toBe(0)
  })

  it('never changes what the student pays — the take only grows the application fee', () => {
    for (const base of [50, 200, 500, 2980, 6000]) {
      const pro = calculatePricing(base)
      const free = calculatePricing(base, { platformTake: true })
      expect(free.priceInOre).toBe(pro.priceInOre)
      expect(free.serviceFeeInOre).toBe(pro.serviceFeeInOre)
      expect(free.platformFeeInOre).toBe(Math.round(free.basePriceInOre * PLATFORM_TAKE_RATE))
    }
  })
})

describe('frontend/backend parity', () => {
  it('frontend fee matches backend fee for all price points', () => {
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
