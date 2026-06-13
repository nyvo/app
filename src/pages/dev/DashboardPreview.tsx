import { useState } from 'react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { IncomeChart } from '@/components/teacher/dashboard/IncomeChart';
import {
  ManualPaymentsPanel,
  RecentSignupsSection,
  UpcomingCoursesSection,
} from '@/pages/teacher/TeacherDashboard';
import type { SignupWithDetails } from '@/services/signups';
import type { Course as DashboardCourse } from '@/types/dashboard';
import type { IncomePoint, IncomeRange, IncomeSeries } from '@/services/income';

/**
 * Dev preview for the dashboard overview states — renders the REAL section
 * components from TeacherDashboard (not a mock copy, which drifted) for the
 * Pro, Start, empty and loading states. Same pattern as BillingPreview.
 */

// ─── Mock data ────────────────────────────────────────────────────────────

const MONTH_ABBR_NB = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const;
const DAY_ABBR_NB = ['søn', 'man', 'tir', 'ons', 'tor', 'fre', 'lør'] as const;

function dayLabel(d: Date): string {
  return `${DAY_ABBR_NB[d.getDay()]} ${d.getDate()}. ${MONTH_ABBR_NB[d.getMonth()]}`;
}

function buildMockIncome(range: IncomeRange): IncomeSeries {
  const now = new Date();
  const span = range === 'year' ? 12 : range === 'week' ? 7 : 30;
  const points: IncomePoint[] = Array.from({ length: span }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (span - 1 - i));
    const prev = new Date(d.getFullYear(), d.getMonth(), d.getDate() - span);
    const base = 500 + Math.round(Math.sin(i * 0.6) * 700) + i * 60;
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      label: dayLabel(d),
      amount: Math.max(0, base),
      previousLabel: dayLabel(prev),
      previousAmount: Math.max(0, Math.round(base * 0.72)),
    };
  });
  const total = points.reduce((sum, p) => sum + p.amount, 0);
  return { range, points, total, previousTotal: Math.round(total * 0.84) };
}

function isoDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const NEXT_COURSES: DashboardCourse[] = [
  {
    id: 'morning-flow',
    title: 'Morning Flow',
    subtitle: 'Enkeltkurs',
    time: '09:00',
    type: 'event',
    date: isoDateOffset(0),
    signups: 8,
    capacity: 10,
  },
  {
    id: 'vinyasa',
    title: 'Vinyasa Flow — vårsemester',
    subtitle: 'Kursrekke',
    time: '18:00',
    type: 'course-series',
    date: isoDateOffset(1),
    signups: 12,
    capacity: 14,
  },
  {
    id: 'yin',
    title: 'Yin Yoga',
    subtitle: 'Enkeltkurs',
    time: '20:00',
    type: 'event',
    date: isoDateOffset(3),
    signups: 4,
    capacity: 12,
  },
];

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

// Only the fields the SignupRow + drawer-less preview reads; the full
// SignupWithDetails row shape comes from the DB and is irrelevant here.
function mockSignup(
  id: string,
  name: string,
  courseTitle: string,
  createdHoursAgo: number,
  paymentStatus = 'paid',
): SignupWithDetails {
  return {
    id,
    participant_name: name,
    created_at: hoursAgo(createdHoursAgo),
    payment_status: paymentStatus,
    profile: { id, name, email: '' },
    course: { title: courseTitle },
    course_session: null,
  } as unknown as SignupWithDetails;
}

const RECENT_SIGNUPS: SignupWithDetails[] = [
  mockSignup('1', 'Olav Hansen', 'Morning Flow', 2),
  // Pending payment — exercises the exception-only PaymentBadge in the row.
  mockSignup('2', 'Mari Eriksen', 'Vinyasa Flow — vårsemester', 5, 'pending'),
  mockSignup('3', 'Anne Sørensen', 'Yin Yoga', 26),
];

/** All-zero series — exercises the chart's "Ingen inntekt" in-plot message. */
function buildZeroIncome(range: IncomeRange): IncomeSeries {
  const base = buildMockIncome(range);
  return {
    ...base,
    points: base.points.map((p) => ({ ...p, amount: 0, previousAmount: 0 })),
    total: 0,
    previousTotal: 0,
  };
}

// ─── Preview ──────────────────────────────────────────────────────────────

export default function DashboardPreview() {
  const [range, setRange] = useState<IncomeRange>('month');
  const incomeSeries = buildMockIncome(range);
  const noop = () => {};

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl space-y-16 px-4 py-10 sm:px-6 lg:px-8">
        <PreviewState label="Pro – med data">
          <div className="space-y-8">
            <IncomeChart
              series={incomeSeries}
              isLoading={false}
              range={range}
              onRangeChange={setRange}
            />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <UpcomingCoursesSection courses={NEXT_COURSES} isLoading={false} />
              <RecentSignupsSection signups={RECENT_SIGNUPS} isLoading={false} onSelect={noop} />
            </div>
          </div>
        </PreviewState>

        <PreviewState label="Start (gratis)">
          <div className="space-y-8">
            <ManualPaymentsPanel />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <UpcomingCoursesSection courses={NEXT_COURSES} isLoading={false} />
              <RecentSignupsSection signups={RECENT_SIGNUPS} isLoading={false} onSelect={noop} />
            </div>
          </div>
        </PreviewState>

        <PreviewState label="Tomt – ingen inntekt, kurs eller påmeldinger">
          <div className="space-y-8">
            <IncomeChart
              series={buildZeroIncome(range)}
              isLoading={false}
              range={range}
              onRangeChange={setRange}
            />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <UpcomingCoursesSection courses={[]} isLoading={false} />
              <RecentSignupsSection signups={[]} isLoading={false} onSelect={noop} />
            </div>
          </div>
        </PreviewState>

        <PreviewState label="Laster">
          <div className="space-y-8">
            <IncomeChart
              series={null}
              isLoading
              range={range}
              onRangeChange={setRange}
            />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <UpcomingCoursesSection courses={null} isLoading />
              <RecentSignupsSection signups={null} isLoading onSelect={noop} />
            </div>
          </div>
        </PreviewState>
      </div>
    </div>
  );
}

function PreviewState({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <Badge variant="neutral" size="sm" className="mb-6">
        {label}
      </Badge>
      {children}
    </section>
  );
}
