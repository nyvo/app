import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatDateLong, formatMessageTimestamp, formatCourseStartTime } from './dateFormatting'

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

describe('formatCourseStartTime', () => {
  let dateSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Fix "now" to 2026-03-15 for predictable relative dates
    dateSpy = vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T12:00:00'))
  })

  afterEach(() => {
    dateSpy.useRealTimers()
  })

  it('returns empty for cancelled status', () => {
    expect(formatCourseStartTime('2026-03-20', 'cancelled')).toBe('')
  })

  it('shows "Pågår" for active non-series course', () => {
    expect(formatCourseStartTime('2026-03-10', 'active')).toBe('Pågår')
  })

  it('shows "Fullført" for completed course', () => {
    expect(formatCourseStartTime('2026-02-01', 'completed')).toBe('Fullført')
  })

  it('shows "I dag" when course starts today', () => {
    expect(formatCourseStartTime('2026-03-15', 'upcoming')).toBe('I dag')
  })

  it('shows "I morgen" when course starts tomorrow', () => {
    expect(formatCourseStartTime('2026-03-16', 'upcoming')).toBe('I morgen')
  })

  it('shows relative days for upcoming courses within 14 days', () => {
    expect(formatCourseStartTime('2026-03-20', 'upcoming')).toBe('Om 5 dager')
  })

  it('shows "Om 1 uke" for exactly 7 days', () => {
    expect(formatCourseStartTime('2026-03-22', 'upcoming')).toBe('Om 1 uke')
  })

  it('shows week progress for active series', () => {
    expect(formatCourseStartTime('2026-03-01', 'active', 'kursrekke', 3, 8)).toBe('Uke 3/8')
  })
})
