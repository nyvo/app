import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IncomeChart } from '@/components/teacher/dashboard/IncomeChart';
import { UserAvatar } from '@/components/ui/user-avatar';
import { DateBadge } from '@/components/ui/date-badge';
import type { IncomePoint, IncomeRange, IncomeSeries } from '@/services/income';

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

const NEXT_COURSES = [
  {
    id: 'morning-flow',
    title: 'Morning Flow',
    dateStr: '2026-05-22',
    when: 'kl. 09:00',
    capacity: '8 / 10',
  },
  {
    id: 'vinyasa',
    title: 'Vinyasa Flow — vårsemester',
    dateStr: '2026-05-23',
    when: 'kl. 18:00',
    capacity: '12 / 14',
  },
];

const RECENT_SIGNUPS = [
  { id: '1', name: 'Olav Hansen', course: 'Morning Flow', when: '2 t' },
  { id: '2', name: 'Mari Eriksen', course: 'Vinyasa Flow', when: '5 t' },
  { id: '3', name: 'Anne Sørensen', course: 'Yin Yoga', when: 'i går' },
];

// ─── Preview ──────────────────────────────────────────────────────────────

export default function DashboardPreview() {
  const [range, setRange] = useState<IncomeRange>('month');
  const incomeSeries = buildMockIncome(range);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <header className="mb-12">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Oversikt</h1>
        </header>

        <div className="space-y-12">
          <IncomeChart
            series={incomeSeries}
            isLoading={false}
            range={range}
            onRangeChange={setRange}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="flex flex-col">
              <h2 className="mb-3 text-xl font-medium tracking-tight text-foreground">
                Neste kurs
              </h2>
              <div className="flex min-h-56 flex-1 flex-col rounded-xl border border-border bg-background p-3">
                <div className="space-y-1">
                  {NEXT_COURSES.map((course) => (
                    <Link
                      key={course.id}
                      to={`/courses/${course.id}`}
                      className="flex items-center gap-3 rounded-lg p-3 no-underline outline-none transition-colors duration-150 hover:bg-muted focus-visible:bg-muted"
                    >
                      <DateBadge dateStr={course.dateStr} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-medium text-foreground">{course.title}</p>
                        <p className="truncate text-base text-foreground-muted">{course.when}</p>
                      </div>
                      <span className="shrink-0 text-base tabular-nums text-foreground-muted">
                        {course.capacity}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </section>

            <section className="flex flex-col">
              <h2 className="mb-3 text-xl font-medium tracking-tight text-foreground">
                Siste påmeldinger
              </h2>
              <div className="flex min-h-56 flex-1 flex-col rounded-xl border border-border bg-background p-3">
                <div className="space-y-1">
                  {RECENT_SIGNUPS.map((signup) => (
                    <div
                      key={signup.id}
                      className="flex items-center gap-3 rounded-lg p-3 transition-colors duration-150 hover:bg-muted"
                    >
                      <UserAvatar name={signup.name} size="lg" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-medium text-foreground">{signup.name}</p>
                        <p className="truncate text-base text-foreground-muted">
                          Meldte seg på {signup.course}
                        </p>
                      </div>
                      <span className="shrink-0 text-base tabular-nums text-foreground-muted">
                        {signup.when}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
