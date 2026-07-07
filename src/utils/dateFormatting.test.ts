import { describe, it, expect } from 'vitest'
import { formatDateLong, formatMessageTimestamp, formatRelativeTimePast } from './dateFormatting'

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

  it('returns empty string for a malformed date string', () => {
    expect(formatDateLong('not-a-date')).toBe('')
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

  it('returns empty string for a malformed timestamp', () => {
    expect(formatMessageTimestamp('not-a-date')).toBe('')
  })
})

describe('formatRelativeTimePast', () => {
  it('returns empty string for null', () => {
    expect(formatRelativeTimePast(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(formatRelativeTimePast(undefined)).toBe('')
  })

  it('returns empty string for a malformed timestamp', () => {
    expect(formatRelativeTimePast('not-a-date')).toBe('')
  })

  it('formats a recent timestamp as "Nå"', () => {
    expect(formatRelativeTimePast(new Date().toISOString())).toBe('Nå')
  })
})
