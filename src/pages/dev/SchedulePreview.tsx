import { SessionCard, TimelineDay, type SessionRow } from '@/pages/teacher/SchedulePage';

/**
 * Auth-free preview of the schedule agenda — the sign-off surface for the
 * ported Luma-style timeline (date rail + facepile cards). Renders the real
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
    participantNames: ['Olav Hansen', 'Mari Eriksen', 'Anne Sørensen', 'Jonas Berg', 'Ida Moen'],
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
    participantNames: ['Kari Nordmann', 'Ola Vik', 'Nina Holm', 'Jon Dal', 'Mia Strand'],
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
    participantNames: ['Thea Lund', 'Emil Foss', 'Live Bakke', 'Aksel Rud'],
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
    participantNames: ['Hanna Vold', 'Marius Eng', 'Selma Kro', 'Leon Hagen', 'Amalie Torp'],
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
    participantNames: ['Nora Aas', 'Sondre Vik', 'Vilde Holt', 'Jakob Ryen'],
  },
];

export default SchedulePreview;
