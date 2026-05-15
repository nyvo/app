import { useState } from 'react';
import { IncomeChart } from '@/components/teacher/dashboard/IncomeChart';
import { ChartTooltipContent } from '@/components/ui/chart';
import { SegmentedTabs } from '@/components/teacher/SegmentedTabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { IncomePoint, IncomeRange, IncomeSeries } from '@/services/income';

const RANGE_LABEL: Record<IncomeRange, string> = {
  week: 'Uke',
  month: 'Måned',
  year: 'År',
};

const MONTH_ABBR_NB = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const;
const DAY_ABBR_NB = ['søn', 'man', 'tir', 'ons', 'tor', 'fre', 'lør'] as const;

function monthLabel(d: Date): string {
  const m = MONTH_ABBR_NB[d.getMonth()];
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${String(d.getFullYear()).slice(2)}`;
}
function dayLabel(d: Date): string {
  return `${DAY_ABBR_NB[d.getDay()]} ${d.getDate()}. ${MONTH_ABBR_NB[d.getMonth()]}`;
}

function buildMockPoints(range: IncomeRange): IncomePoint[] {
  const now = new Date();
  if (range === 'year') {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const prev = new Date(d.getFullYear() - 1, d.getMonth(), 1);
      const base = 2_000 + i * 1_400 + Math.round(Math.sin(i * 1.3) * 900);
      const prevBase = Math.round(base * 0.7) + Math.round(Math.cos(i * 1.1) * 400);
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: monthLabel(d),
        amount: Math.max(0, base),
        previousLabel: monthLabel(prev),
        previousAmount: Math.max(0, prevBase),
      };
    });
  }
  const span = range === 'week' ? 7 : 30;
  return Array.from({ length: span }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (span - 1 - i));
    const prev = new Date(d.getFullYear(), d.getMonth(), d.getDate() - span);
    const weekend = d.getDay() === 0 || d.getDay() === 6 ? 1800 : 0;
    const base = 400 + Math.round(Math.sin(i * 0.7) * 600) + weekend + i * 30;
    const prevBase = Math.round(base * 0.72) + Math.round(Math.cos(i * 0.5) * 250);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      label: dayLabel(d),
      amount: Math.max(0, base),
      previousLabel: dayLabel(prev),
      previousAmount: Math.max(0, prevBase),
    };
  });
}

function buildMockSeries(range: IncomeRange): IncomeSeries {
  const points = buildMockPoints(range);
  const total = points.reduce((sum, p) => sum + p.amount, 0);
  return { range, points, total, previousTotal: Math.round(total * 0.84) };
}

function buildEmptySeries(range: IncomeRange): IncomeSeries {
  const points = buildMockPoints(range).map((p) => ({ ...p, amount: 0, previousAmount: 0 }));
  return { range, points, total: 0, previousTotal: 0 };
}

const SHADCN_TOOLTIP_CONFIG = {
  amount: { label: 'Inntekt', color: '#2563EB' },
} as const;

export default function IncomeChartPreview() {
  const [range, setRange] = useState<IncomeRange>('month');
  const populated = buildMockSeries(range);
  const empty = buildEmptySeries(range);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <header className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            IncomeChart preview
          </h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Per-bucket line with faint previous-period overlay, hidden Y-axis,
            and X-axis edge labels — Time2Book pattern.
          </p>
        </header>

        <div className="space-y-12">
          <Section title="Range toggle — SegmentedTabs (was: too loud)">
            <SegmentedTabs
              value={range}
              onChange={setRange}
              tabs={[
                { key: 'week', label: 'Uke' },
                { key: 'month', label: 'Måned' },
                { key: 'year', label: 'År' },
              ]}
              ariaLabel="Velg tidsrom"
            />
          </Section>

          <Section title="Range toggle — quiet small tabs (now shipped in IncomeChart)">
            <QuietRangeToggle value={range} onChange={setRange} />
          </Section>

          <Section title="Range toggle — dropdown (alternative)">
            <RangeDropdown value={range} onChange={setRange} />
          </Section>

          <Section title="Chart — with data (default tooltip)">
            <IncomeChart
              series={populated}
              isLoading={false}
              range={range}
              onRangeChange={setRange}
            />
          </Section>

          <Section title="Chart — with data (shadcn ChartTooltipContent)">
            <IncomeChart
              series={populated}
              isLoading={false}
              range={range}
              onRangeChange={setRange}
              tooltipContent={
                <ChartTooltipContent
                  labelKey="label"
                  formatter={(value, _name, item) => {
                    const point = item.payload as IncomePoint | undefined;
                    return (
                      <div className="flex w-full items-center justify-between gap-3">
                        <span className="text-foreground-muted">
                          {SHADCN_TOOLTIP_CONFIG.amount.label}
                        </span>
                        <span className="font-medium text-foreground tabular-nums">
                          {Number(point?.amount ?? value).toLocaleString('nb-NO')} kr
                        </span>
                      </div>
                    );
                  }}
                />
              }
            />
          </Section>

          <Section title="Empty state — flat line at 0">
            <IncomeChart
              series={empty}
              isLoading={false}
              range={range}
              onRangeChange={setRange}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}

function QuietRangeToggle({
  value,
  onChange,
}: {
  value: IncomeRange;
  onChange: (range: IncomeRange) => void;
}) {
  const options: { key: IncomeRange; label: string }[] = [
    { key: 'week', label: 'Uke' },
    { key: 'month', label: 'Måned' },
    { key: 'year', label: 'År' },
  ];
  return (
    <div role="tablist" aria-label="Velg tidsrom" className="inline-flex items-center gap-1">
      {options.map((opt) => {
        const isActive = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.key)}
            className={cn(
              'rounded-md px-2 py-1 text-xs font-medium outline-none transition-colors duration-150',
              'focus-visible:ring-2 focus-visible:ring-foreground/15',
              isActive
                ? 'bg-muted text-foreground'
                : 'text-foreground-muted hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function RangeDropdown({
  value,
  onChange,
}: {
  value: IncomeRange;
  onChange: (range: IncomeRange) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium outline-none transition-colors',
          'text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground/15',
        )}
      >
        {RANGE_LABEL[value]}
        <ChevronDown className="size-3.5 text-foreground-muted" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(['week', 'month', 'year'] as IncomeRange[]).map((r) => (
          <DropdownMenuItem key={r} onSelect={() => onChange(r)}>
            {RANGE_LABEL[r]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-foreground-muted">
        {title}
      </h2>
      {children}
    </div>
  );
}
