import { formatKroner } from '@/lib/utils';

export interface SignupsKpis {
  /** Confirmed signups created since the start of this week. */
  newThisWeek: number;
  /** Signups needing teacher action: pending or failed payment, course-cancelled awaiting refund. */
  followupCount: number;
  /** Cancellations made since the 1st of the current month. */
  cancellationsThisMonth: number;
  /** Sum of amount_paid for confirmed signups created since the 1st of the month. */
  monthRevenue: number;
}

interface SignupsKpiStripProps {
  kpis: SignupsKpis | null;
  loading: boolean;
}

function KpiCell({ label, value, sub, loading }: { label: string; value: string; sub?: string; loading: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-[22px] font-semibold tracking-tight text-foreground tabular-nums leading-tight">
        {loading ? '—' : value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

/**
 * Top-of-page KPI strip on /teacher/signups. Four boxes that lift the
 * page-level summary up to a glance, paired with the SegmentedTabs below.
 */
export function SignupsKpiStrip({ kpis, loading }: SignupsKpiStripProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <KpiCell
        label="Nye denne uken"
        value={kpis ? String(kpis.newThisWeek) : '—'}
        loading={loading}
      />
      <KpiCell
        label="Til oppfølging"
        value={kpis ? String(kpis.followupCount) : '—'}
        sub="betaling feilet eller venter"
        loading={loading}
      />
      <KpiCell
        label="Avbestilt (mnd)"
        value={kpis ? String(kpis.cancellationsThisMonth) : '—'}
        loading={loading}
      />
      <KpiCell
        label="Inntekt (mnd)"
        value={kpis ? formatKroner(kpis.monthRevenue) : '—'}
        sub="påmeldinger denne måneden"
        loading={loading}
      />
    </div>
  );
}
