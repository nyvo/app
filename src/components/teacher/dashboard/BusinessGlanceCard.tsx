import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { WeekStats } from '@/services/dashboardStats'
import { DeltaChip } from './DeltaChip'

interface BusinessGlanceCardProps {
  stats: WeekStats | null
}

export function BusinessGlanceCard({ stats }: BusinessGlanceCardProps) {
  const hasActivity = stats ? (stats.sessions > 0 || stats.cancellations > 0 || stats.refunds > 0 || stats.capacityFilled.signups > 0) : true

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nøkkeltall</CardTitle>
        <CardAction>
          {hasActivity && <Badge variant="secondary" className="text-muted-foreground tracking-wide">Siste 7 dager</Badge>}
        </CardAction>
      </CardHeader>
      <CardContent>
        {stats ? <BusinessGlanceBody stats={stats} /> : <BusinessGlanceSkeleton />}
      </CardContent>
    </Card>
  )
}

function BusinessGlanceBody({ stats }: { stats: WeekStats }) {
  const hasActivity = stats.sessions > 0 || stats.cancellations > 0 || stats.refunds > 0 || stats.capacityFilled.signups > 0

  const capacityPercent = stats.capacityFilled.percent
  const formattedCapacity =
    stats.capacityFilled.capacity === 0
      ? '—'
      : `${capacityPercent.toFixed(1).replace('.', ',')} %`

  const kpis = (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
      <Kpi
        label="Kapasitet fylt"
        value={formattedCapacity}
        delta={hasActivity ? <DeltaChip delta={stats.deltas.capacityFilled} /> : null}
      />
      <Kpi
        label="Avbestillinger"
        value={stats.cancellations.toString()}
        delta={hasActivity ? <DeltaChip delta={stats.deltas.cancellations} invert /> : null}
      />
      <Kpi
        label="Økter"
        value={stats.sessions.toString()}
        delta={hasActivity ? <DeltaChip delta={stats.deltas.sessions} /> : null}
      />
      <Kpi label="Ikke møtt" value="—" delta={null} />
      <Kpi label="Avtaler" value="—" delta={null} />
      <Kpi
        label="Refusjoner"
        value={stats.refunds.toString()}
        delta={hasActivity ? <DeltaChip delta={stats.deltas.refunds} invert /> : null}
      />
    </div>
  )

  if (hasActivity) return kpis

  return (
    <div className="relative">
      <div className="blur-[3px] opacity-30 pointer-events-none select-none">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
          <Kpi label="Kapasitet fylt" value="78,4 %" delta={null} />
          <Kpi label="Avbestillinger" value="2" delta={null} />
          <Kpi label="Økter" value="12" delta={null} />
          <Kpi label="Ikke møtt" value="1" delta={null} />
          <Kpi label="Avtaler" value="8" delta={null} />
          <Kpi label="Refusjoner" value="0" delta={null} />
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-sm font-medium text-foreground text-center max-w-48">
          Nøkkeltall oppdateres når kurs har aktivitet
        </p>
      </div>
    </div>
  )
}

function BusinessGlanceSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2 h-7 w-16" />
        </div>
      ))}
    </div>
  )
}

function Kpi({
  label,
  value,
  delta,
}: {
  label: string
  value: string
  delta: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        {delta}
      </div>
    </div>
  )
}
