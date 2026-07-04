import { SessionCard, TimelineDay, type SessionRow } from '@/pages/teacher/SchedulePage';

/**
 * Auth-free preview of the schedule agenda — the sign-off surface for the
 * ported Luma-style timeline (date rail + agenda cards). Renders the real
 * TimelineDay + SessionCard exports, so what you see here is production.
 */
const SchedulePreview = () => {
  return (
    <div className="min-h-screen bg-canvas text-foreground py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-8">
        <header>
          <h1 className="text-2xl font-medium">Timeplan — kortpreview</h1>
        </header>

        <div>
          <TimelineDay primary="I dag" secondary="3. juli" first>
            {MOCK_SESSIONS.slice(0, 3).map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </TimelineDay>
          <TimelineDay primary="I morgen" secondary="4. juli">
            {MOCK_SESSIONS.slice(3).map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </TimelineDay>
        </div>
      </div>
    </div>
  );
};

const base = {
  courseId: 'mock',
  courseFormat: 'series' as const,
};

const MOCK_SESSIONS: SessionRow[] = [
  {
    ...base,
    id: '1',
    sessionDate: '2026-07-03',
    startTime: '09:00',
    endTime: '10:00',
    courseTitle: 'Morning Flow',
    courseLocation: 'Studio Sentrum, Oslo',
    deliveryMode: 'in_person',
    signupCount: 8,
    maxParticipants: 10,
  },
  {
    ...base,
    id: '2',
    sessionDate: '2026-07-03',
    startTime: '12:00',
    endTime: '13:00',
    courseTitle: 'Lunsj-yoga — Open Flow',
    courseLocation: 'Studio Sentrum, Oslo',
    deliveryMode: 'in_person',
    signupCount: 14,
    maxParticipants: 14,
  },
  {
    ...base,
    id: '3',
    sessionDate: '2026-07-03',
    startTime: '20:00',
    endTime: '20:30',
    courseTitle: 'Kveldsmeditasjon online',
    courseLocation: null,
    deliveryMode: 'online',
    signupCount: 23,
    maxParticipants: null,
  },
  {
    ...base,
    id: '4',
    sessionDate: '2026-07-04',
    startTime: '18:00',
    endTime: '19:15',
    courseTitle: 'Vinyasa Flow — vårsemester',
    courseLocation: 'Friluftshuset, Frognerparken',
    deliveryMode: 'in_person',
    signupCount: 12,
    maxParticipants: 14,
  },
  {
    ...base,
    id: '5',
    sessionDate: '2026-07-04',
    startTime: '19:30',
    endTime: '20:45',
    courseTitle: 'Yin & Meditasjon',
    courseLocation: 'Studio Sentrum, Oslo',
    deliveryMode: 'in_person',
    signupCount: 4,
    maxParticipants: 12,
  },
];

export default SchedulePreview;
