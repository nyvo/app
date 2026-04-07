import { useState, useEffect } from 'react';
import { Search, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { SignupRow } from './SignupRow';
import type { ParticipantActionHandlers } from './ParticipantActionMenu';
import type { SignupDisplay } from '@/types/database';

interface SignupListViewProps {
  signups: SignupDisplay[];
  isLoading?: boolean;
  isEmpty?: boolean;
  hasFilters?: boolean;
  onClearFilters?: () => void;
  actionHandlers?: ParticipantActionHandlers;
}

const INITIAL_VISIBLE = 20;
const LOAD_MORE_INCREMENT = 20;
const SHOW_ALL_THRESHOLD = 5;

export function SignupListView({
  signups,
  isLoading = false,
  isEmpty = false,
  hasFilters = false,
  onClearFilters,
  actionHandlers,
}: SignupListViewProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [signups]);

  if (isLoading) {
    return (
      <div className="space-y-1" role="status" aria-live="polite">
        <span className="sr-only">Henter påmeldinger</span>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-start gap-3 px-3 py-3">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-5 w-14 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (isEmpty || signups.length === 0) {
    return (
      <EmptyState
        icon={hasFilters ? Search : Calendar}
        title={hasFilters ? 'Ingen treff' : 'Ingen påmeldinger ennå'}
        description={hasFilters ? 'Prøv å endre filteret.' : 'Publiser et kurs for å se påmeldinger.'}
        action={hasFilters && onClearFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="type-meta underline underline-offset-2"
          >
            Nullstill filter
          </Button>
        ) : undefined}
        className={isEmpty && !hasFilters ? 'pt-[20vh]' : undefined}
      />
    );
  }

  const effectiveVisible = (signups.length - visibleCount) <= SHOW_ALL_THRESHOLD
    ? signups.length
    : visibleCount;
  const visibleSignups = signups.slice(0, effectiveVisible);
  const remainingCount = signups.length - effectiveVisible;
  const isTruncated = remainingCount > 0;

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-border divide-y divide-border">
        {visibleSignups.map(signup => (
          <SignupRow
            key={signup.id}
            signup={signup}
            actionHandlers={actionHandlers}
          />
        ))}
      </div>

      {(isTruncated || visibleCount > INITIAL_VISIBLE) && (
        <div className="flex justify-center gap-3 pt-6 pb-2">
          {isTruncated && (
            <Button
              variant="outline-soft"
              size="sm"
              onClick={() => setVisibleCount(prev => prev + LOAD_MORE_INCREMENT)}
            >
              Vis {Math.min(remainingCount, LOAD_MORE_INCREMENT)} flere
            </Button>
          )}
          {visibleCount > INITIAL_VISIBLE && (
            <Button
              variant="outline-soft"
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
