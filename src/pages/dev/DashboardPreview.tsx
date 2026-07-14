import { useState } from 'react';
import { IncomeChart } from '@/components/teacher/dashboard/IncomeChart';
import {
  PlatformFeeHint,
  RecentSignupsSection,
  UpcomingCoursesSection,
} from '@/pages/teacher/TeacherDashboard';
import { PageState } from '@/components/page-state/page-state';
import { DevPage, PreviewSection } from './_kit';
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
  const total = points.reduce((sum, p) => sum + (p.amount ?? 0), 0);
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
  // Pending payment — the card shows NO marker for it (removed 2026-07-14;
  // payment state lives in the participant drawer). Kept in the mock so a
  // regression that re-adds a row marker is visible here.
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
    <DevPage title="Oversikt (dashboard)">
      <PreviewSection label="Pro – med data">
        <div className="space-y-8">
          <IncomeChart
            series={incomeSeries}
            isLoading={false}
            range={range}
            onRangeChange={setRange}
          />
          <div className="grid grid-cols-1 gap-y-6 lg:grid-cols-2 lg:gap-y-0">
            <UpcomingCoursesSection courses={NEXT_COURSES} isLoading={false} />
            <RecentSignupsSection signups={RECENT_SIGNUPS} isLoading={false} onSelect={noop} />
          </div>
        </div>
      </PreviewSection>

      <PreviewSection label="Start (gratis) – med plattformgebyr-linje">
        <div className="space-y-8">
          <div className="space-y-3">
            <IncomeChart
              series={incomeSeries}
              isLoading={false}
              range={range}
              onRangeChange={setRange}
            />
            <PlatformFeeHint feeNok={312} />
          </div>
          <div className="grid grid-cols-1 gap-y-6 lg:grid-cols-2 lg:gap-y-0">
            <UpcomingCoursesSection courses={NEXT_COURSES} isLoading={false} />
            <RecentSignupsSection signups={RECENT_SIGNUPS} isLoading={false} onSelect={noop} />
          </div>
        </div>
      </PreviewSection>

      <PreviewSection label="Tomt – ingen inntekt, kurs eller påmeldinger">
        <div className="space-y-8">
          <IncomeChart
            series={buildZeroIncome(range)}
            isLoading={false}
            range={range}
            onRangeChange={setRange}
          />
          <div className="grid grid-cols-1 gap-y-6 lg:grid-cols-2 lg:gap-y-0">
            <UpcomingCoursesSection courses={[]} isLoading={false} />
            <RecentSignupsSection signups={[]} isLoading={false} onSelect={noop} />
          </div>
        </div>
      </PreviewSection>

      <PreviewSection label="Laster">
        <div className="space-y-8">
          <IncomeChart
            series={null}
            isLoading
            range={range}
            onRangeChange={setRange}
          />
          <div className="grid grid-cols-1 gap-y-6 lg:grid-cols-2 lg:gap-y-0">
            <UpcomingCoursesSection courses={null} isLoading />
            <RecentSignupsSection signups={null} isLoading onSelect={noop} />
          </div>
        </div>
      </PreviewSection>

      <PreviewSection label="Feil">
        {/* Mirrors DashboardRouter: a failed seller-membership fetch shows this
            page-level server-error instead of guessing buyer vs. seller. */}
        <PageState variant="server-error" as="div" />
      </PreviewSection>
    </DevPage>
  );
}
