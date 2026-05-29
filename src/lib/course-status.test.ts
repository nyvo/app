import { describe, it, expect } from 'vitest'
import { deriveCourseDisplayStatus } from './course-status'
import type { CourseSession } from '@/types/database'

// Fixed clock so the lifecycle boundaries are deterministic.
const NOW = new Date('2026-03-15T12:00:00')

// Minimal session factory — only the fields the helper reads.
function session(date: string, status: string | null = 'upcoming'): CourseSession {
  return {
    id: `s-${date}`,
    course_id: 'c1',
    session_date: date,
    session_number: 1,
    start_time: '18:00',
    end_time: null,
    status,
    notes: null,
    created_at: null,
    updated_at: null,
  }
}

describe('deriveCourseDisplayStatus', () => {
  it('keeps draft as draft regardless of dates', () => {
    expect(
      deriveCourseDisplayStatus(
        { status: 'draft', startDate: '2026-01-01', endDate: '2026-01-02' },
        NOW,
      ),
    ).toBe('draft')
  })

  it('keeps cancelled as cancelled regardless of dates', () => {
    expect(
      deriveCourseDisplayStatus(
        { status: 'cancelled', startDate: '2026-04-01', endDate: '2026-04-30' },
        NOW,
      ),
    ).toBe('cancelled')
  })

  it('a future published course is upcoming', () => {
    expect(
      deriveCourseDisplayStatus(
        { status: 'upcoming', startDate: '2026-04-01', endDate: '2026-04-30' },
        NOW,
      ),
    ).toBe('upcoming')
  })

  it('a course currently within its date range is active', () => {
    expect(
      deriveCourseDisplayStatus(
        { status: 'upcoming', startDate: '2026-03-01', endDate: '2026-03-31' },
        NOW,
      ),
    ).toBe('active')
  })

  it('a course after its end date is completed', () => {
    expect(
      deriveCourseDisplayStatus(
        { status: 'upcoming', startDate: '2026-01-01', endDate: '2026-02-01' },
        NOW,
      ),
    ).toBe('completed')
  })

  it('treats the first and last day as inclusive (active on boundaries)', () => {
    expect(
      deriveCourseDisplayStatus({ status: 'upcoming', startDate: '2026-03-15', endDate: '2026-03-15' }, NOW),
    ).toBe('active')
    expect(
      deriveCourseDisplayStatus({ status: 'upcoming', startDate: '2026-03-15', endDate: '2026-03-20' }, NOW),
    ).toBe('active')
    expect(
      deriveCourseDisplayStatus({ status: 'upcoming', startDate: '2026-03-10', endDate: '2026-03-15' }, NOW),
    ).toBe('active')
  })

  it('a single-session course with no end date uses the start as the end', () => {
    // Past single day → completed even though end_date is null.
    expect(
      deriveCourseDisplayStatus({ status: 'upcoming', startDate: '2026-03-10', endDate: null }, NOW),
    ).toBe('completed')
    // Future single day → upcoming.
    expect(
      deriveCourseDisplayStatus({ status: 'upcoming', startDate: '2026-03-20', endDate: null }, NOW),
    ).toBe('upcoming')
  })

  it('prefers sessions over coarse date fields when sessions are present', () => {
    // Date fields say "long finished", but the live sessions span the present.
    expect(
      deriveCourseDisplayStatus(
        {
          status: 'upcoming',
          startDate: '2026-01-01',
          endDate: '2026-01-05',
          sessions: [session('2026-03-10'), session('2026-03-22')],
        },
        NOW,
      ),
    ).toBe('active')
  })

  it('ignores cancelled sessions when bounding the active window', () => {
    // The only non-cancelled session is in the past → completed.
    expect(
      deriveCourseDisplayStatus(
        {
          status: 'upcoming',
          startDate: '2026-01-01',
          endDate: '2026-04-30',
          sessions: [session('2026-03-01'), session('2026-04-20', 'cancelled')],
        },
        NOW,
      ),
    ).toBe('completed')
  })

  it('falls back to date fields when the sessions array is empty (not loaded)', () => {
    expect(
      deriveCourseDisplayStatus(
        { status: 'upcoming', startDate: '2026-03-01', endDate: '2026-03-31', sessions: [] },
        NOW,
      ),
    ).toBe('active')
  })

  it('falls back safely to upcoming when no dates or sessions are available', () => {
    expect(
      deriveCourseDisplayStatus({ status: 'upcoming', startDate: null, endDate: null }, NOW),
    ).toBe('upcoming')
  })
})
