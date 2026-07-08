import { describe, it, expect } from 'vitest';
import { computeDesiredSessions } from './CoursePage';
import { newSessionDay, type SessionDay } from '@/components/teacher/SessionDaysEditor';
import type { CourseSession } from '@/types/database';

function session(overrides: Partial<CourseSession>): CourseSession {
  return {
    id: 'sess-1',
    course_id: 'course-1',
    session_number: 1,
    session_date: '2026-08-01',
    start_time: '18:00:00',
    end_time: '19:00:00',
    status: 'upcoming',
    notes: null,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...overrides,
  } as CourseSession;
}

function day(overrides: Partial<SessionDay>): SessionDay {
  return {
    id: 'sess-1',
    date: new Date(2026, 7, 1), // 1 Aug 2026, local
    startTime: '18:00',
    endTime: '19:00',
    ...overrides,
  };
}

describe('computeDesiredSessions — 🔴 data-loss guard', () => {
  const base = {
    format: 'single' as const,
    status: 'draft',
    sessions: [] as CourseSession[],
    sessionsLoading: false,
    sessionsError: false,
    settingsTime: '18:00',
    settingsDuration: 60,
  };

  it('returns null (never []) for a single course with an empty editor', () => {
    // [] would delete every session row on a draft — must be null.
    expect(computeDesiredSessions({ ...base, sessionDays: [] })).toBeNull();
  });

  it('returns null while sessions are still loading, even with editor rows', () => {
    expect(
      computeDesiredSessions({ ...base, sessionsLoading: true, sessionDays: [day({})] }),
    ).toBeNull();
  });

  it('returns null when the sessions fetch failed, even with editor rows', () => {
    expect(
      computeDesiredSessions({ ...base, sessionsError: true, sessionDays: [day({})] }),
    ).toBeNull();
  });
});

describe('computeDesiredSessions — single format', () => {
  const base = {
    format: 'single' as const,
    status: 'draft',
    sessions: [] as CourseSession[],
    sessionsLoading: false,
    sessionsError: false,
    settingsTime: '18:00',
    settingsDuration: 60,
  };

  it('maps a populated editor to the desired payload (existing id kept)', () => {
    const result = computeDesiredSessions({
      ...base,
      sessionDays: [day({ id: 'sess-1', startTime: '18:00', endTime: '19:30' })],
    });
    expect(result).toEqual([
      { id: 'sess-1', session_date: '2026-08-01', start_time: '18:00', end_time: '19:30' },
    ]);
  });

  it('sends id:null for a new (new-*) editor row', () => {
    const result = computeDesiredSessions({
      ...base,
      sessionDays: [day({ id: 'new-abc' })],
    });
    expect(result?.[0]).toMatchObject({ id: null, session_date: '2026-08-01', start_time: '18:00' });
  });

  it('sends id:null for a day built by the real newSessionDay() (regression guard: an unprefixed uuid gets misread as an existing row)', () => {
    const addedDay = newSessionDay();
    expect(addedDay.id.startsWith('new-')).toBe(true);
    const result = computeDesiredSessions({
      ...base,
      sessionDays: [{ ...addedDay, date: new Date(2026, 7, 1), startTime: '18:00', endTime: '19:30' }],
    });
    expect(result).toEqual([
      { id: null, session_date: '2026-08-01', start_time: '18:00', end_time: '19:30' },
    ]);
  });

  it('keeps an existing row untouched when it has no date/time yet', () => {
    const result = computeDesiredSessions({
      ...base,
      sessionDays: [day({ id: 'sess-9', date: undefined, startTime: '' })],
    });
    expect(result).toEqual([{ id: 'sess-9', keep: true }]);
  });

  it('drops an incomplete new row (nothing to create)', () => {
    const result = computeDesiredSessions({
      ...base,
      sessionDays: [day({ id: 'new-x', date: undefined, startTime: '' })],
    });
    expect(result).toEqual([]);
  });
});

describe('computeDesiredSessions — series format', () => {
  const sessions = [
    session({ id: 's1', session_number: 1, session_date: '2026-08-03', start_time: '18:00:00' }),
    session({ id: 's2', session_number: 2, session_date: '2026-08-10', start_time: '18:00:00' }),
  ];

  it('regenerates weekly dates AND carries end_time (start + duration) for a draft series', () => {
    const result = computeDesiredSessions({
      format: 'series',
      status: 'draft',
      sessionDays: [],
      sessions,
      sessionsLoading: false,
      sessionsError: false,
      settingsDate: new Date(2026, 7, 3), // Mon 3 Aug
      settingsTime: '17:30',
      settingsDuration: 90,
    });
    expect(result).toEqual([
      { id: 's1', session_date: '2026-08-03', start_time: '17:30', end_time: '19:00' },
      { id: 's2', session_date: '2026-08-10', start_time: '17:30', end_time: '19:00' },
    ]);
  });

  it('bulk-applies start time and preserves dates for a published series', () => {
    const result = computeDesiredSessions({
      format: 'series',
      status: 'upcoming',
      sessionDays: [],
      sessions,
      sessionsLoading: false,
      sessionsError: false,
      settingsTime: '19:15',
      settingsDuration: 60,
    });
    expect(result).toEqual([
      { id: 's1', session_date: '2026-08-03', start_time: '19:15' },
      { id: 's2', session_date: '2026-08-10', start_time: '19:15' },
    ]);
  });
});
