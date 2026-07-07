import { describe, it, expect } from 'vitest'
import { buildIcs, escapeIcsText, resolveEventEnd } from './ics'

describe('escapeIcsText', () => {
  it('escapes backslashes, semicolons, commas and newlines', () => {
    expect(escapeIcsText('a;b,c\\d\ne')).toBe('a\\;b\\,c\\\\d\\ne')
  })

  it('leaves plain text untouched', () => {
    expect(escapeIcsText('Yoga med Kari')).toBe('Yoga med Kari')
  })
})

describe('buildIcs', () => {
  const start = new Date(2026, 6, 15, 18, 0, 0) // 2026-07-15 18:00 local
  const end = new Date(2026, 6, 15, 19, 0, 0)

  it('includes the required VEVENT fields with floating local start/end', () => {
    const ics = buildIcs({
      uid: 'signup-123',
      summary: 'Yoga, Studio A',
      start,
      end,
      location: 'Storgata 1, Oslo',
    })

    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('VERSION:2.0')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('UID:signup-123')
    expect(ics).toContain('DTSTART:20260715T180000')
    expect(ics).toContain('DTEND:20260715T190000')
    expect(ics).toContain('SUMMARY:Yoga\\, Studio A')
    expect(ics).toContain('LOCATION:Storgata 1\\, Oslo')
    expect(ics).toContain('END:VEVENT')
    expect(ics).toContain('END:VCALENDAR')
    // DTSTART/DTEND are floating local time — no trailing Z, no TZID param.
    expect(ics).not.toMatch(/DTSTART:\d{8}T\d{6}Z/)
  })

  it('omits DTEND and LOCATION when not provided', () => {
    const ics = buildIcs({ uid: 'signup-456', summary: 'Pilates', start })
    expect(ics).not.toContain('DTEND')
    expect(ics).not.toContain('LOCATION')
  })

  it('uses CRLF line endings per RFC 5545', () => {
    const ics = buildIcs({ uid: 'x', summary: 'Test', start })
    expect(ics).toContain('\r\n')
    expect(ics.split('\r\n').length).toBeGreaterThan(5)
  })
})

describe('resolveEventEnd', () => {
  const start = new Date(2026, 6, 15, 18, 0, 0) // 2026-07-15 18:00 local

  it('parses the end from an HH:MM–HH:MM range in time_schedule', () => {
    const end = resolveEventEnd(start, 'Mandager, 18:00–19:30', null)
    expect(end).toEqual(new Date(2026, 6, 15, 19, 30, 0))
  })

  it('accepts a plain hyphen range too', () => {
    const end = resolveEventEnd(start, '18:00-19:30', 45)
    // Range wins over duration.
    expect(end).toEqual(new Date(2026, 6, 15, 19, 30, 0))
  })

  it('rolls a midnight-crossing range to the next day', () => {
    const lateStart = new Date(2026, 6, 15, 23, 0, 0)
    const end = resolveEventEnd(lateStart, '23:00–00:30', null)
    expect(end).toEqual(new Date(2026, 6, 16, 0, 30, 0))
  })

  it('falls back to course duration when no range exists', () => {
    const end = resolveEventEnd(start, 'Mandager, 18:00', 90)
    expect(end).toEqual(new Date(2026, 6, 15, 19, 30, 0))
  })

  it('defaults to 60 minutes when neither range nor duration exists', () => {
    const end = resolveEventEnd(start, 'Mandager, 18:00', null)
    expect(end).toEqual(new Date(2026, 6, 15, 19, 0, 0))
  })
})
