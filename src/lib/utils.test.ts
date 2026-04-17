import { describe, it, expect } from 'vitest'
import { formatKroner } from './utils'

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
