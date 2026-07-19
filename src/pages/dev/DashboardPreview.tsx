import { useState } from 'react';
import { IncomeChart } from '@/components/teacher/dashboard/IncomeChart';
import { WelcomeBandCard } from '@/components/teacher/dashboard/WelcomeBand';
import {
  DashboardActivityGrid,
  PlatformFeeHint,
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

export function buildMockIncome(range: IncomeRange): IncomeSeries {
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

export function isoDateOffset(days: number): string {
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
export function mockSignup(
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
        <div className="space-y-12">
          <IncomeChart
            series={incomeSeries}
            isLoading={false}
            range={range}
            onRangeChange={setRange}
          />
          <DashboardActivityGrid
            courses={NEXT_COURSES.slice(0, 2)}
            signups={RECENT_SIGNUPS}
            isLoading={false}
            onSelectSignup={noop}
          />
        </div>
      </PreviewSection>

      <PreviewSection label="Start (gratis) – med plattformgebyr-linje">
        <div className="space-y-12">
          <IncomeChart
            series={incomeSeries}
            isLoading={false}
            range={range}
            onRangeChange={setRange}
            footer={<PlatformFeeHint feeNok={312} />}
          />
          <DashboardActivityGrid
            courses={NEXT_COURSES}
            signups={RECENT_SIGNUPS}
            isLoading={false}
            onSelectSignup={noop}
          />
        </div>
      </PreviewSection>

      <PreviewSection label="Første gang (ny selger) – velkomstbånd over tomt dashboard">
        <div className="space-y-12">
          <WelcomeBandCard />
          <IncomeChart
            series={buildZeroIncome(range)}
            isLoading={false}
            range={range}
            onRangeChange={setRange}
          />
          <DashboardActivityGrid
            courses={[]}
            signups={[]}
            isLoading={false}
            onSelectSignup={noop}
          />
        </div>
      </PreviewSection>

      <PreviewSection label="Tomt – ingen inntekt, kurs eller påmeldinger">
        <div className="space-y-12">
          <IncomeChart
            series={buildZeroIncome(range)}
            isLoading={false}
            range={range}
            onRangeChange={setRange}
          />
          <DashboardActivityGrid
            courses={[]}
            signups={[]}
            isLoading={false}
            onSelectSignup={noop}
          />
        </div>
      </PreviewSection>

      <PreviewSection label="Laster">
        <div className="space-y-12">
          <IncomeChart
            series={null}
            isLoading
            range={range}
            onRangeChange={setRange}
          />
          <DashboardActivityGrid
            courses={null}
            signups={null}
            isLoading
            onSelectSignup={noop}
          />
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
