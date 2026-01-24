import { Search, Calendar, Users, CheckCircle, Archive } from 'lucide-react';
import { SignupGroup } from './SignupGroup';
import type { SignupGroup as SignupGroupType, ModeFilter } from '@/hooks/use-grouped-signups';

interface SmartSignupsViewProps {
  groups: SignupGroupType[];
  stats: {
    exceptions: number;
    confirmed: number;
    waitlist: number;
    cancelled: number;
    groups: number;
    totalExceptions: number; // Total across all data (for badge)
  };
  isLoading?: boolean;
  isEmpty?: boolean;
  hasFilters?: boolean;
  mode?: ModeFilter;
  onClearFilters?: () => void;
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
        title: 'Ingen kommende påmeldinger',
        description: 'Kommende påmeldinger vises her.',
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

export function SmartSignupsView({
  groups,
  stats,
  isLoading = false,
  isEmpty = false,
  hasFilters = false,
  mode = 'active',
  onClearFilters,
}: SmartSignupsViewProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4" role="status" aria-live="polite">
        <span className="sr-only">Henter påmeldinger</span>
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="rounded-3xl bg-white border border-gray-200 p-6 animate-pulse"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="h-4 w-48 bg-surface-elevated rounded" />
              <div className="h-5 w-16 bg-surface-elevated rounded-full" />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-3 w-32 bg-surface-elevated rounded" />
              <div className="h-3 w-24 bg-surface-elevated rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state - contextual based on mode and filters
  if (isEmpty || groups.length === 0) {
    const emptyState = getEmptyStateContent(mode, hasFilters);
    const IconComponent = emptyState.icon;

    return (
      <div className="rounded-3xl bg-white border border-gray-200 flex flex-col items-center justify-center p-12 text-center">
        <div className="mb-4 rounded-full bg-surface p-4 border border-surface-elevated">
          <IconComponent className="h-8 w-8 text-text-tertiary stroke-[1.5]" />
        </div>
        <h3 className="font-geist text-sm font-medium text-text-primary">
          {emptyState.title}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm">
          {emptyState.description}
        </p>
        {emptyState.showClearAction && onClearFilters && (
          <button
            onClick={onClearFilters}
            className="mt-4 text-xs text-muted-foreground hover:text-text-primary underline underline-offset-2 transition-colors"
          >
            Nullstill filtre
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats bar */}
      <div className="flex items-center gap-6 px-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
          {stats.groups} {stats.groups === 1 ? 'økt' : 'økter'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-text-tertiary" />
          {stats.confirmed} påmeldt
        </span>
        {stats.waitlist > 0 && (
          <span className="text-status-waitlist-text">
            {stats.waitlist} på venteliste
          </span>
        )}
        {stats.cancelled > 0 && (
          <span className="text-muted-foreground">
            {stats.cancelled} avbestilt
          </span>
        )}
        {stats.exceptions > 0 && (
          <span className="text-status-error-text font-medium">
            {stats.exceptions} krever handling
          </span>
        )}
      </div>

      {/* Groups list */}
      <div className="space-y-4">
        {groups.map(group => (
          <SignupGroup
            key={group.key}
            group={group}
            defaultExpanded={group.hasExceptions}
          />
        ))}
      </div>
    </div>
  );
}

export default SmartSignupsView;
