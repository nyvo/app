import { formatKroner } from '@/lib/utils';

export interface CoursesKpis {
  /** Active+upcoming courses owned by the org (excludes drafts, cancelled, completed). */
  activeCourses: number;
  /** Confirmed signups created since the start of this week (Monday). */
  signupsThisWeek: number;
  /** Sum of (max - confirmed-signups) across active courses with a max set. */
  freeSpots: number;
  /** Sum of amount_paid for confirmed signups created since the start of this month (NOK). */
  monthRevenue: number;
}

interface CoursesKpiStripProps {
  kpis: CoursesKpis | null;
  loading: boolean;
}

function KpiCell({ label, value, sub, loading }: { label: string; value: string; sub?: string; loading: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs text-foreground-muted">{label}</div>
      <div className="mt-1 text-[22px] font-semibold tracking-tight text-foreground tabular-nums leading-tight">
        {loading ? '—' : value}
      </div>
      {sub && <div className="mt-1 text-xs text-foreground-muted">{sub}</div>}
    </div>
  );
}

/**
 * Top-of-page KPI strip on /teacher/courses. Four boxes that give a teacher
 * a quick "this week" glance without leaving the courses list.
 */
export function CoursesKpiStrip({ kpis, loading }: CoursesKpiStripProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <KpiCell
        label="Aktive kurs"
        value={kpis ? String(kpis.activeCourses) : '—'}
        loading={loading}
      />
      <KpiCell
        label="Påmeldte denne uken"
        value={kpis ? String(kpis.signupsThisWeek) : '—'}
        loading={loading}
      />
      <KpiCell
        label="Ledige plasser"
        value={kpis ? String(kpis.freeSpots) : '—'}
        sub="i kommende timer"
        loading={loading}
      />
      <KpiCell
        label="Inntekter denne måneden"
        value={kpis ? formatKroner(kpis.monthRevenue) : '—'}
        loading={loading}
      />
    </div>
  );
}
