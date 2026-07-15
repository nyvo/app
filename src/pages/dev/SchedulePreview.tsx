import { ErrorState } from '@/components/ui/error-state';
import { SessionCard, TimelineDay, type SessionRow } from '@/pages/teacher/SchedulePage';
import { DevPage, PreviewSection } from './_kit';

const noop = () => {};

/**
 * Auth-free preview of the schedule agenda — the sign-off surface for the
 * shared timeline grammar (TimelineEntry rail + agenda cards). Renders the
 * real TimelineDay + SessionCard exports, so what you see here is production.
 */
const SchedulePreview = () => {
  return (
    <DevPage title="Timeplan">
      <PreviewSection label="Med data">
        <div>
          <TimelineDay primary="I dag" secondary="3. juli" next lineBelow>
            {MOCK_SESSIONS.slice(0, 3).map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </TimelineDay>
          <TimelineDay primary="I morgen" secondary="4. juli" lineAbove isLast>
            {MOCK_SESSIONS.slice(3).map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </TimelineDay>
        </div>
      </PreviewSection>

      <PreviewSection label="Feil">
        {/* Mirrors SchedulePage's fetch-failure state (real `error` copy + retry). */}
        <ErrorState title="Noe gikk galt" message="Kunne ikke laste timeplanen." onRetry={noop} />
      </PreviewSection>
    </DevPage>
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
