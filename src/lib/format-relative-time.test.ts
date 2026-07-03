import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { formatRelativeTime } from './format-relative-time'

// Anchor "now" to a fixed local instant so every bucket is deterministic.
const NOW = new Date(2026, 4, 15, 12, 0, 0) // 15 May 2026, 12:00 local

function agoSeconds(s: number): Date {
  return new Date(NOW.getTime() - s * 1000)
}

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('< 60 s → "nå"', () => {
    expect(formatRelativeTime(agoSeconds(0))).toBe('nå')
    expect(formatRelativeTime(agoSeconds(59))).toBe('nå')
  })

  it('< 60 min → "X min"', () => {
    expect(formatRelativeTime(agoSeconds(60))).toBe('1 min')
    expect(formatRelativeTime(agoSeconds(5 * 60))).toBe('5 min')
    expect(formatRelativeTime(agoSeconds(59 * 60))).toBe('59 min')
  })

  it('< 24 t → "X t"', () => {
    expect(formatRelativeTime(agoSeconds(60 * 60))).toBe('1 t')
    expect(formatRelativeTime(agoSeconds(2 * 60 * 60))).toBe('2 t')
    expect(formatRelativeTime(agoSeconds(23 * 60 * 60))).toBe('23 t')
  })

  it('calendar day before today → "i går"', () => {
    // 14 May 2026, 08:00 — yesterday relative to NOW, but > 24 t buckets away.
    expect(formatRelativeTime(new Date(2026, 4, 14, 8, 0, 0))).toBe('i går')
  })

  it('< 7 d → "X d"', () => {
    // 3 full days back lands on 12 May — neither yesterday nor ≥ 7 d.
    expect(formatRelativeTime(new Date(2026, 4, 12, 12, 0, 0))).toBe('3 d')
    expect(formatRelativeTime(new Date(2026, 4, 9, 12, 0, 0))).toBe('6 d')
  })

  it('≥ 7 d this year → "15. mai"', () => {
    expect(formatRelativeTime(new Date(2026, 4, 1, 12, 0, 0))).toBe('1. mai')
  })

  it('≥ 7 d prior year → "15. mai 2025"', () => {
    expect(formatRelativeTime(new Date(2025, 4, 15, 12, 0, 0))).toBe('15. mai 2025')
  })

  it('never leaks the date-fns "omtrent"/"for … siden" envelope', () => {
    const samples = [0, 90, 45 * 60, 2 * 60 * 60, 23 * 60 * 60, 3 * 24 * 60 * 60]
    for (const s of samples) {
      const out = formatRelativeTime(agoSeconds(s))
      expect(out).not.toMatch(/omtrent/i)
      expect(out).not.toMatch(/\bfor\b/i)
      expect(out).not.toMatch(/siden/i)
    }
  })
})
