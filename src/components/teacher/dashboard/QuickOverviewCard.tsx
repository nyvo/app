import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { formatKroner } from '@/lib/utils'
import { parseLocalDate } from '@/utils/dateUtils'
import type { MonthStats } from '@/services/dashboardStats'
import { DeltaChip } from './DeltaChip'

interface QuickOverviewCardProps {
  stats: MonthStats | null
}

const chartConfig = {
  revenue: { label: '', color: 'var(--chart-2)' },
} satisfies ChartConfig

function formatTooltipDate(dateKey: string): string {
  const parsed = parseLocalDate(dateKey)
  if (!parsed) return dateKey
  const date = new Date(parsed.year, parsed.month - 1, parsed.day)
  return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }).replace('.', '')
}

function formatRevenueTooltip(value: number): string {
  return value === 0 ? 'Ingen inntekter' : formatKroner(value)
}

export function QuickOverviewCard({ stats }: QuickOverviewCardProps) {
  const hasActivity = stats ? (stats.revenue > 0 || stats.newCustomers > 0 || stats.totalSignups > 0) : true

  return (
    <Card>
      <CardHeader>
        <CardTitle>Oversikt</CardTitle>
        <CardAction>
          {hasActivity && <Badge variant="secondary" className="text-muted-foreground tracking-wide">Denne måneden</Badge>}
        </CardAction>
      </CardHeader>
      <CardContent>
        {stats ? <QuickOverviewBody stats={stats} /> : <QuickOverviewSkeleton />}
      </CardContent>
    </Card>
  )
}

const PLACEHOLDER_SERIES = [
  { date: '1', revenue: 120 },
  { date: '2', revenue: 180 },
  { date: '3', revenue: 150 },
  { date: '4', revenue: 280 },
  { date: '5', revenue: 220 },
  { date: '6', revenue: 350 },
  { date: '7', revenue: 310 },
  { date: '8', revenue: 420 },
  { date: '9', revenue: 380 },
  { date: '10', revenue: 500 },
  { date: '11', revenue: 460 },
  { date: '12', revenue: 580 },
]

function QuickOverviewBody({ stats }: { stats: MonthStats }) {
  const hasActivity = stats.revenue > 0 || stats.newCustomers > 0 || stats.totalSignups > 0

  if (!hasActivity) {
    return (
      <div className="relative">
        <div className="blur-[3px] opacity-30 pointer-events-none select-none">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:gap-5">
            <div className="sm:order-1">
              <div className="mb-1">
                <p className="text-xs font-medium tracking-wide text-muted-foreground">Inntekter</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="text-2xl font-semibold tracking-tight text-foreground">12 400 kr</p>
                </div>
              </div>
              <ChartContainer config={chartConfig} className="aspect-auto h-40 w-full">
                <AreaChart data={PLACEHOLDER_SERIES} margin={{ top: 8, right: 4, left: 4, bottom: 2 }}>
                  <defs>
                    <linearGradient id="quick-overview-placeholder-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area dataKey="revenue" type="monotone" stroke="var(--color-chart-2)" strokeWidth={2} fill="url(#quick-overview-placeholder-fill)" isAnimationActive={false} />
                </AreaChart>
              </ChartContainer>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 self-center sm:order-2 sm:grid-cols-1 sm:gap-4 sm:min-w-36">
              <Kpi label="Nye elever" value="8" delta={null} />
              <Kpi label="Påmeldinger" value="14" delta={null} />
              <Kpi label="Førstegangsbesøk" value="3" delta={null} />
            </div>
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm font-medium text-foreground text-center max-w-48">
            Oversikten fylles når du mottar påmeldinger
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:gap-5">
      <div className="sm:order-1">
        <div className="mb-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">Inntekter</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-2xl font-semibold tracking-tight text-foreground">{formatKroner(stats.revenue)}</p>
            <DeltaChip delta={stats.deltas.revenue} />
          </div>
        </div>

        <ChartContainer config={chartConfig} className="aspect-auto h-40 w-full">
          <AreaChart data={stats.series} margin={{ top: 8, right: 4, left: 4, bottom: 2 }}>
            <defs>
              <linearGradient id="quick-overview-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" strokeOpacity={0.5} />
            <XAxis dataKey="date" hide />
            <YAxis hide domain={[0, 'dataMax + 1']} />
            <ChartTooltip
              cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '3 3' }}
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => formatTooltipDate(String(label))}
                  formatter={(value) => formatRevenueTooltip(Number(value))}
                  hideIndicator
                />
              }
            />
            <Area
              dataKey="revenue"
              type="monotone"
              stroke="var(--color-chart-2)"
              strokeWidth={2}
              fill="url(#quick-overview-fill)"
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--background)', fill: 'var(--color-chart-2)' }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-5 self-center sm:order-2 sm:grid-cols-1 sm:gap-4 sm:min-w-36">
        <Kpi label="Nye elever" value={stats.newCustomers.toString()} delta={<DeltaChip delta={stats.deltas.newCustomers} />} />
        <Kpi label="Påmeldinger" value={stats.totalSignups.toString()} delta={<DeltaChip delta={stats.deltas.totalSignups} />} />
        <Kpi label="Førstegangsbesøk" value="—" delta={null} />
      </div>
    </div>
  )
}

function QuickOverviewSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:gap-5">
      <div>
        <Skeleton className="h-7 w-28" />
        <Skeleton className="mt-1 h-3 w-16" />
        <Skeleton className="mt-3 h-40 w-full" />
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 self-center sm:grid-cols-1 sm:gap-4 sm:min-w-36">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-7 w-24" />
          </div>
        ))}
      </div>
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
