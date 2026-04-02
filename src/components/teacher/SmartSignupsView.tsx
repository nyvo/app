import { useState, useEffect, useMemo } from 'react';
import { Search, Calendar, CheckCircle, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SignupGroup } from './SignupGroup';
import type { ParticipantActionHandlers } from './ParticipantActionMenu';
import type { SignupGroup as SignupGroupType, ModeFilter } from '@/hooks/use-grouped-signups';

interface SmartSignupsViewProps {
  groups: SignupGroupType[];
  stats: {
    exceptions: number;
    confirmed: number;
    cancelled: number;
    groups: number;
    totalExceptions: number; // Total across all data (for badge)
  };
  isLoading?: boolean;
  isEmpty?: boolean;
  hasFilters?: boolean;
  mode?: ModeFilter;
  onClearFilters?: () => void;
  actionHandlers?: ParticipantActionHandlers;
}

// Get contextual empty state content based on mode and filter state
function getEmptyStateContent(mode: ModeFilter, hasFilters: boolean) {
  // If filters are applied, show generic "no results" message
  if (hasFilters) {
    return {
      icon: Search,
      title: 'Ingen treff',
      description: 'Prøv å endre filteret.',
      showClearAction: true,
    };
  }

  // Mode-specific empty states (no filters applied)
  switch (mode) {
    case 'active':
      return {
        icon: Calendar,
        title: 'Ingen nye påmeldinger',
        description: 'Nye påmeldinger vises her.',
        showClearAction: false,
      };
    case 'ended':
      return {
        icon: Archive,
        title: 'Ingen avsluttede påmeldinger',
        description: 'Avsluttede påmeldinger vises her.',
        showClearAction: false,
      };
    case 'needs_attention':
      return {
        icon: CheckCircle,
        title: 'Alt i orden',
        description: 'Ingen åpne saker.',
        showClearAction: false,
      };
    default:
      return {
        icon: Calendar,
        title: 'Ingen påmeldinger ennå',
        description: 'Publiser et kurs for å se påmeldinger.',
        showClearAction: false,
      };
  }
}

// --- Temporal section grouping ---

interface TemporalSection {
  label: string;
  groups: SignupGroupType[];
}

const MONTH_NAMES = [
  'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Desember',
];

function getMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function groupByTemporalSection(groups: SignupGroupType[], mode: ModeFilter): TemporalSection[] {
  if (groups.length === 0) return [];

  const now = new Date();
  const thisMonday = getMonday(now);
  const nextMonday = new Date(thisMonday);
  nextMonday.setDate(nextMonday.getDate() + 7);
  const mondayAfterNext = new Date(nextMonday);
  mondayAfterNext.setDate(mondayAfterNext.getDate() + 7);

  // For ended mode, compute previous week boundary
  const prevMonday = new Date(thisMonday);
  prevMonday.setDate(prevMonday.getDate() - 7);

  const sections = new Map<string, SignupGroupType[]>();
  const sectionOrder: string[] = [];

  for (const group of groups) {
    const d = group.classDate;
    let label: string;

    if (mode === 'ended') {
      // Ended: this week, last week, then month names going backward
      if (d >= thisMonday) {
        label = 'Denne uken';
      } else if (d >= prevMonday && d < thisMonday) {
        label = 'Forrige uke';
      } else {
        label = MONTH_NAMES[d.getMonth()];
        if (d.getFullYear() !== now.getFullYear()) {
          label += ` ${d.getFullYear()}`;
        }
      }
    } else {
      // Active/needs_attention: this week, next week, then month names forward
      if (d >= thisMonday && d < nextMonday) {
        label = 'Denne uken';
      } else if (d >= nextMonday && d < mondayAfterNext) {
        label = 'Neste uke';
      } else {
        label = MONTH_NAMES[d.getMonth()];
        if (d.getFullYear() !== now.getFullYear()) {
          label += ` ${d.getFullYear()}`;
        }
      }
    }

    if (!sections.has(label)) {
      sections.set(label, []);
      sectionOrder.push(label);
    }
    sections.get(label)!.push(group);
  }

  return sectionOrder.map(label => ({ label, groups: sections.get(label)! }));
}

// --- Progressive loading ---

const INITIAL_VISIBLE = 5;
const LOAD_MORE_INCREMENT = 5;
const SHOW_ALL_THRESHOLD = 2;

export function SmartSignupsView({
  groups,
  stats: _stats,
  isLoading = false,
  isEmpty = false,
  hasFilters = false,
  mode = 'active',
  onClearFilters,
  actionHandlers,
}: SmartSignupsViewProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3" role="status" aria-live="polite">
        <span className="sr-only">Henter påmeldinger</span>
        {[1, 2, 3].map(i => (
          <div key={i} className="py-3.5 border-b border-border">
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state — minimal, no card wrapper
  if (isEmpty || groups.length === 0) {
    const emptyState = getEmptyStateContent(mode, hasFilters);
    const IconComponent = emptyState.icon;

    return (
      <div className="flex flex-col items-center pt-[20vh] text-center">
        <div className="size-10 rounded-lg border border-border bg-background flex items-center justify-center mb-4">
          <IconComponent className="size-4 text-muted-foreground" />
        </div>
        <h3 className="font-geist text-sm font-medium text-foreground">
          {emptyState.title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          {emptyState.description}
        </p>
        {emptyState.showClearAction && onClearFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="mt-4 text-xs underline underline-offset-2"
          >
            Nullstill filter
          </Button>
        )}
      </div>
    );
  }

  // Progressive loading state
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  // Reset when underlying result set changes
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [groups]);

  const effectiveVisible = (groups.length - visibleCount) <= SHOW_ALL_THRESHOLD ? groups.length : visibleCount;
  const visibleGroups = groups.slice(0, effectiveVisible);
  const remainingCount = groups.length - effectiveVisible;
  const isTruncated = remainingCount > 0;

  // Temporal section grouping
  const sections = useMemo(
    () => groupByTemporalSection(visibleGroups, mode),
    [visibleGroups, mode]
  );

  return (
    <div>

      {/* Temporal sections with groups */}
      <div className="space-y-10">
        {sections.map(section => (
          <div key={section.label}>
            <h3 className="text-sm font-medium text-foreground pb-3">
              {section.label}
            </h3>
            <div className="border-t border-border">
              {section.groups.map(group => (
                <SignupGroup
                  key={group.key}
                  group={group}
                  defaultExpanded={false}
                  actionHandlers={actionHandlers}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Load more / show less */}
      {(isTruncated || visibleCount > INITIAL_VISIBLE) && (
        <div className="flex justify-center gap-3 pt-6 pb-2">
          {isTruncated && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibleCount(prev => prev + LOAD_MORE_INCREMENT)}
            >
              Vis {Math.min(remainingCount, LOAD_MORE_INCREMENT)} flere
            </Button>
          )}
          {visibleCount > INITIAL_VISIBLE && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibleCount(INITIAL_VISIBLE)}
            >
              Vis færre
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default SmartSignupsView;
