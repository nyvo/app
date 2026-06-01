import { describe, it, expect } from 'vitest'
import { formatKroner, isValidPhone } from './utils'

describe('formatKroner', () => {
  it('returns "0 kr" for 0', () => {
    expect(formatKroner(0)).toBe('0 kr')
  })

  it('returns "0 kr" for null', () => {
    expect(formatKroner(null)).toBe('0 kr')
  })

  it('returns "0 kr" for undefined', () => {
    expect(formatKroner(undefined)).toBe('0 kr')
  })

  it('formats small amounts without separator', () => {
    expect(formatKroner(500)).toBe('500 kr')
  })

  it('formats thousands with space separator', () => {
    const result = formatKroner(2200)
    // nb-NO uses non-breaking space (U+00A0) as thousands separator
    expect(result).toMatch(/2\s?200 kr/)
  })

  it('formats large amounts correctly', () => {
    const result = formatKroner(42500)
    expect(result).toMatch(/42\s?500 kr/)
  })

  it('formats decimal amounts', () => {
    const result = formatKroner(1299.5)
    expect(result).toContain('kr')
    expect(result).toMatch(/1\s?299/)
  })
})

describe('isValidPhone', () => {
  it('accepts a plain Norwegian 8-digit number', () => {
    expect(isValidPhone('99887766')).toBe(true)
  })

  it('accepts a Norwegian number with spaces', () => {
    expect(isValidPhone('998 87 766')).toBe(true)
  })

  it('accepts a number with +47 country code', () => {
    expect(isValidPhone('+47 998 87 766')).toBe(true)
  })

  it('accepts a longer international number with dashes', () => {
    expect(isValidPhone('+44 20-7946-0958')).toBe(true)
  })

  it('rejects letters / junk', () => {
    expect(isValidPhone('not a phone')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isValidPhone('')).toBe(false)
  })

  it('rejects too few digits', () => {
    expect(isValidPhone('1234567')).toBe(false)
  })

  it('rejects too many digits', () => {
    expect(isValidPhone('1234567890123456')).toBe(false)
  })

  it('rejects a + with no digits', () => {
    expect(isValidPhone('+')).toBe(false)
  })
})
