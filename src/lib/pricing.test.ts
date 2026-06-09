import { describe, it, expect } from 'vitest'
import { calculateServiceFee, calculateTotalPrice } from './pricing'
import {
  calculatePricing,
  SERVICE_FEE_RATE,
  SERVICE_FEE_MIN_NOK,
  SERVICE_FEE_MAX_NOK,
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

  it('keeps the Dintero order total equal to the sum of item lines', () => {
    for (const base of [50, 100, 180, 200, 350, 500, 1290, 2980, 3000, 6000]) {
      const p = calculatePricing(base)
      expect(p.basePriceInOre + p.serviceFeeInOre).toBe(p.priceInOre)
      expect(p.totalPrice).toBe(base + p.serviceFeeNok)
    }
  })

  it('keeps the platform commission term at 5% of base, independent of the fee clamp', () => {
    for (const base of [50, 500, 6000]) {
      const p = calculatePricing(base)
      expect(p.platformFee - p.serviceFeeInOre).toBe(Math.round(p.basePriceInOre * SERVICE_FEE_RATE))
    }
  })
})

describe('frontend/backend parity', () => {
  it('frontend fee matches backend fee for all price points', () => {
    for (let base = 1; base <= 8000; base += 7) {
      expect(calculateServiceFee(base)).toBe(calculatePricing(base).serviceFeeNok)
    }
  })
})
