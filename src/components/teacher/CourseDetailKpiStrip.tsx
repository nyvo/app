import { cn } from '@/lib/utils';
import { formatKroner } from '@/lib/utils';

export interface CourseDetailKpis {
  /** Confirmed signups for this course. */
  enrolled: number;
  /** Course capacity (null = unlimited). */
  capacity: number | null;
  /** Sum of amount_paid for confirmed signups. */
  revenue: number;
  /** Number of pending payments. */
  pending: number;
  /** Number of paid signups. */
  paid: number;
  /**
   * "Pågår nå" — when the course has a session running RIGHT NOW.
   * Pre-formatted: "Yin Yoga (3/13)" + sub "slutter kl. 18:45".
   */
  active: { label: string; sub: string } | null;
  /** Next upcoming session — pre-formatted "3. mai · 17:30" + sub "om 6 dager". */
  next: { label: string; sub: string } | null;
}

interface Props {
  kpis: CourseDetailKpis | null;
  loading: boolean;
}

function KpiCell({
  label,
  value,
  sub,
  loading,
  pulsing,
  bar,
}: {
  label: string;
  value: string;
  sub?: string;
  loading: boolean;
  pulsing?: boolean;
  bar?: { pct: number };
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn(
        'mt-1 text-[22px] font-semibold tracking-tight text-foreground tabular-nums leading-tight truncate',
      )}>
        {pulsing && !loading && value !== '—' && (
          <span
            aria-hidden
            className="inline-block size-[7px] rounded-full bg-foreground mr-2 align-middle animate-pulse"
            style={{ animationDuration: '1.6s' }}
          />
        )}
        {loading ? '—' : value}
      </div>
      {bar && !loading && (
        <div className="mt-1.5 h-[3px] rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-muted-foreground" style={{ width: `${bar.pct}%` }} />
        </div>
      )}
      {sub && <div className={cn('text-xs text-muted-foreground truncate', bar ? 'mt-2' : 'mt-1')}>{sub}</div>}
    </div>
  );
}

/**
 * Top-of-page KPI strip for /teacher/courses/:id. Mirrors the shape used on
 * /teacher/courses, /signups, /schedule.
 */
export function CourseDetailKpiStrip({ kpis, loading }: Props) {
  // Capacity readouts
  const capPct = kpis && kpis.capacity && kpis.capacity > 0
    ? Math.min(100, Math.round((kpis.enrolled / kpis.capacity) * 100))
    : 0;
  const capValue = kpis
    ? (kpis.capacity != null ? `${kpis.enrolled}/${kpis.capacity}` : `${kpis.enrolled}`)
    : '—';

  // Revenue sub
  const revenueSub = kpis
    ? `${kpis.paid} betalt${kpis.pending > 0 ? ` · ${kpis.pending} venter` : ''}`
    : undefined;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <KpiCell
        label="Påmeldte"
        value={capValue}
        loading={loading}
        bar={kpis?.capacity ? { pct: capPct } : undefined}
      />
      <KpiCell
        label="Inntekter"
        value={kpis ? formatKroner(kpis.revenue) : '—'}
        sub={revenueSub}
        loading={loading}
      />
      {kpis?.active ? (
        <KpiCell
          label="Pågår nå"
          value={kpis.active.label}
          sub={kpis.active.sub}
          loading={loading}
          pulsing
        />
      ) : (
        <KpiCell
          label="Neste økt"
          value={kpis?.next ? kpis.next.label : '—'}
          sub={kpis?.next?.sub}
          loading={loading}
        />
      )}
      <KpiCell
        label="Status"
        value={kpis ? statusLabel(kpis) : '—'}
        loading={loading}
      />
    </div>
  );
}

function statusLabel(kpis: CourseDetailKpis): string {
  if (kpis.active) return 'Pågår';
  if (kpis.capacity != null && kpis.enrolled >= kpis.capacity) return 'Fullt';
  if (kpis.next) return 'Aktiv';
  return 'Avsluttet';
}
