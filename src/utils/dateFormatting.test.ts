import { describe, it, expect } from 'vitest'
import { formatDateLong, formatMessageTimestamp } from './dateFormatting'

describe('formatDateLong', () => {
  it('returns empty string for null', () => {
    expect(formatDateLong(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(formatDateLong(undefined)).toBe('')
  })

  it('formats a date in Norwegian long format', () => {
    const result = formatDateLong('2026-01-15')
    expect(result).toContain('15')
    expect(result).toContain('januar')
    expect(result).toContain('2026')
  })
})

describe('formatMessageTimestamp', () => {
  it('returns empty string for null', () => {
    expect(formatMessageTimestamp(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(formatMessageTimestamp(undefined)).toBe('')
  })

  it('shows time for recent timestamp', () => {
    // Create a timestamp from a few minutes ago
    const recent = new Date(Date.now() - 5 * 60 * 1000)
    const result = formatMessageTimestamp(recent.toISOString())
    // Should show relative time like "5 min siden" or time format
    expect(result.length).toBeGreaterThan(0)
  })
})
