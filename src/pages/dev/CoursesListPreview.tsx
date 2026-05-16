import { Link } from 'react-router-dom';
import { cn, formatKroner } from '@/lib/utils';
import type { SessionScheduleRow } from '@/services/courses';

// ─── Mock data ────────────────────────────────────────────────────────────

const MOCK: SessionScheduleRow[] = [
  {
    sessionId: 'a',
    courseId: 'a',
    courseTitle: 'Vinyasa Flow',
    courseFormat: 'series',
    deliveryMode: 'in_person',
    sessionDate: '2026-05-20',
    startTime: '18:00',
    endTime: '19:15',
    location: 'InSPIRE Yogastudio · Sal 1',
    price: 1990,
    signupsCount: 11,
    maxParticipants: 14,
    courseStatus: 'active',
    courseStartDate: '2026-04-08',
    courseEndDate: '2026-05-27',
    totalWeeks: 8,
    imageUrl: null,
    allowsDropIn: true,
  },
  {
    sessionId: 'b',
    courseId: 'b',
    courseTitle: 'Yin & restitusjon',
    courseFormat: 'series',
    deliveryMode: 'in_person',
    sessionDate: '2026-05-17',
    startTime: '10:00',
    endTime: '11:30',
    location: 'InSPIRE Yogastudio · Sal 2',
    price: 2200,
    signupsCount: 12,
    maxParticipants: 12,
    courseStatus: 'active',
    courseStartDate: '2026-03-22',
    totalWeeks: 10,
    imageUrl: null,
  },
  {
    sessionId: 'c',
    courseId: 'c',
    courseTitle: 'Morgenflyt',
    courseFormat: 'series',
    deliveryMode: 'in_person',
    sessionDate: '2026-05-18',
    startTime: '06:45',
    endTime: '07:30',
    location: 'InSPIRE Yogastudio · Sal 1',
    price: 220,
    signupsCount: 4,
    maxParticipants: 10,
    courseStatus: 'active',
    courseStartDate: '2026-04-27',
    imageUrl: null,
    allowsDropIn: true,
  },
  {
    sessionId: 'd',
    courseId: 'd',
    courseTitle: 'Yoga for nybegynnere',
    courseFormat: 'series',
    deliveryMode: 'in_person',
    sessionDate: '2026-06-01',
    startTime: '18:00',
    endTime: '19:30',
    location: 'InSPIRE Yogastudio · Sal 2',
    price: 1490,
    signupsCount: 0,
    maxParticipants: 10,
    courseStatus: 'upcoming',
    courseStartDate: '2026-06-01',
    totalWeeks: 6,
    imageUrl: null,
  },
  {
    sessionId: 'e',
    courseId: 'e',
    courseTitle: 'Pust og pause',
    courseFormat: 'single',
    deliveryMode: 'in_person',
    sessionDate: '2026-06-06',
    startTime: '10:00',
    endTime: '13:00',
    location: 'InSPIRE Yogastudio · Sal 1',
    price: 1990,
    signupsCount: 4,
    maxParticipants: 12,
    courseStatus: 'upcoming',
    courseStartDate: '2026-06-06',
    imageUrl: null,
  },
  {
    sessionId: 'f',
    courseId: 'f',
    courseTitle: 'Hatha klassisk',
    courseFormat: 'series',
    deliveryMode: 'in_person',
    sessionDate: '',
    startTime: '',
    endTime: '',
    location: 'InSPIRE Yogastudio · Sal 1',
    price: 2200,
    signupsCount: 0,
    maxParticipants: 12,
    courseStatus: 'draft',
    courseStartDate: null,
    totalWeeks: 10,
    imageUrl: null,
  },
];

const MONTHS_NB = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const;
const FORMAT_LABEL_NB = { series: 'Kursrekke', single: 'Enkelttime' } as const;

function nextSessionText(course: SessionScheduleRow): string {
  if (!course.sessionDate) return '—';
  const d = new Date(course.sessionDate);
  if (isNaN(d.getTime())) return '—';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  const time = course.startTime;
  if (diff === 0) return `I dag · ${time}`;
  if (diff === 1) return `I morgen · ${time}`;
  return `${d.getDate()}. ${MONTHS_NB[d.getMonth()]} · ${time}`;
}

type CardStatus = 'active' | 'full' | 'draft' | 'cancelled' | 'upcoming';
function derive(course: SessionScheduleRow): CardStatus {
  if (course.courseStatus === 'draft') return 'draft';
  if (course.courseStatus === 'cancelled') return 'cancelled';
  if (course.courseStatus === 'upcoming') return 'upcoming';
  if (course.maxParticipants !== null && course.signupsCount >= course.maxParticipants) return 'full';
  return 'active';
}
function statusLabel(s: CardStatus): string {
  return { active: 'Aktiv', full: 'Fullt', draft: 'Utkast', cancelled: 'Avlyst', upcoming: 'Kommer' }[s];
}

function StatusPill({ status }: { status: CardStatus }) {
  if (status === 'active') return null;
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-xs font-medium tabular-nums',
        status === 'full' && 'bg-foreground text-background',
        status === 'draft' && 'bg-muted text-foreground-muted',
        status === 'cancelled' && 'bg-muted text-foreground-muted line-through',
        status === 'upcoming' && 'bg-muted text-foreground',
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

// ─── Borderless flat table ───────────────────────────────────────────────
// Time2Book-style: column headers + hairline-divided rows, no card chrome.
// Each metric column has a fixed width so values align LEFT under headers
// (not right-justified against the row edge).

const COLS = 'grid grid-cols-[minmax(0,1fr)_180px_120px_120px] items-center gap-6 px-3';

function CoursesFlatTable({ courses }: { courses: SessionScheduleRow[] }) {
  return (
    <div>
      <div className={cn(COLS, 'pb-3 text-xs font-medium text-foreground-muted')}>
        <span>Navn</span>
        <span>Neste time</span>
        <span>Påmeldte</span>
        <span>Pris</span>
      </div>
      <div className="divide-y divide-border border-t border-border">
        {courses.map((c) => {
          const status = derive(c);
          return (
            <Link
              key={c.sessionId}
              to="#"
              className={cn(COLS, 'py-4 no-underline transition-colors hover:bg-muted/50')}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-medium text-foreground">{c.courseTitle}</h3>
                  <StatusPill status={status} />
                </div>
                <p className="mt-0.5 truncate text-sm text-foreground-muted">
                  {FORMAT_LABEL_NB[c.courseFormat]}
                </p>
              </div>
              <span className="whitespace-nowrap text-sm text-foreground-muted tabular-nums">
                {nextSessionText(c)}
              </span>
              <span className="whitespace-nowrap text-sm text-foreground-muted tabular-nums">
                {c.maxParticipants ? `${c.signupsCount} / ${c.maxParticipants}` : `${c.signupsCount}`}
              </span>
              <span className="whitespace-nowrap text-sm text-foreground-muted tabular-nums">
                {formatKroner(c.price)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function CoursesListPreview() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <header className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Courses — flat table
          </h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Time2Book pattern: column headers, hairline-divided rows, no card chrome.
            Type lives below the title; metric columns have fixed widths so values
            align left under each header.
          </p>
        </header>

        <CoursesFlatTable courses={MOCK} />
      </div>
    </div>
  );
}
