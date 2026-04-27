import { cn } from '@/lib/utils';
import type { ScheduleEvent } from './types';

export interface ScheduleKpis {
  /** Total events in the displayed week. */
  weekCount: number;
  /** Events on today. */
  todayCount: number;
  /** Events on tomorrow. */
  tomorrowCount: number;
  /** The session that is currently happening, if any. */
  activeEvent: ScheduleEvent | null;
  /** The next upcoming event today (or earliest in the week if none today). */
  nextEvent: { event: ScheduleEvent; whenLabel: string } | null;
  /** Sum of (max - signups) across upcoming sessions in the week. */
  freeSpots: number;
}

interface ScheduleKpiStripProps {
  kpis: ScheduleKpis | null;
  loading: boolean;
}

function KpiCell({
  label,
  value,
  sub,
  loading,
  pulsing,
}: {
  label: string;
  value: string;
  sub?: string;
  loading: boolean;
  pulsing?: boolean;
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
      {sub && <div className="mt-1 text-xs text-muted-foreground truncate">{sub}</div>}
    </div>
  );
}

/**
 * Top-of-page KPI strip on /teacher/schedule. Mirrors the shape used on
 * /teacher/courses and /teacher/signups so the dashboard reads as one
 * system. The `Pågår nå` cell pulses subtly when there's an active session.
 */
export function ScheduleKpiStrip({ kpis, loading }: ScheduleKpiStripProps) {
  const todayTomorrow = kpis
    ? `${kpis.todayCount} i dag · ${kpis.tomorrowCount} i morgen`
    : undefined;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <KpiCell
        label="Timer denne uken"
        value={kpis ? String(kpis.weekCount) : '—'}
        sub={todayTomorrow}
        loading={loading}
      />
      <KpiCell
        label="Pågår nå"
        value={kpis?.activeEvent ? kpis.activeEvent.title : 'Ingen'}
        sub={kpis?.activeEvent ? `slutter kl. ${kpis.activeEvent.endTime.slice(0, 5)}` : undefined}
        loading={loading}
        pulsing={!!kpis?.activeEvent}
      />
      <KpiCell
        label="Neste time"
        value={kpis?.nextEvent ? kpis.nextEvent.whenLabel : '—'}
        sub={kpis?.nextEvent?.event.title}
        loading={loading}
      />
      <KpiCell
        label="Ledige plasser"
        value={kpis ? String(kpis.freeSpots) : '—'}
        sub="i kommende timer"
        loading={loading}
      />
    </div>
  );
}
