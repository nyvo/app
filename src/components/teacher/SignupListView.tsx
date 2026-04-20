import { useState, useEffect, useMemo } from 'react';
import { Search, Calendar, ChevronDown } from '@/lib/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SkeletonTableRow } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { SignupRow } from './SignupRow';
import type { ParticipantActionHandlers } from './ParticipantActionMenu';
import type { SignupDisplay } from '@/types/database';

export type SignupsViewTab = 'active' | 'followup' | 'past';

interface SignupListViewProps {
  signups: SignupDisplay[];
  isLoading?: boolean;
  isEmpty?: boolean;
  hasFilters?: boolean;
  onClearFilters?: () => void;
  actionHandlers?: ParticipantActionHandlers;
  viewTab?: SignupsViewTab;
}

const INITIAL_VISIBLE = 20;
const LOAD_MORE_INCREMENT = 20;
const SHOW_ALL_THRESHOLD = 5;
const COLUMN_COUNT = 6;

function emptyCopy(viewTab: SignupsViewTab | undefined, hasFilters: boolean, isEmptyOrg: boolean) {
  if (isEmptyOrg && !hasFilters) {
    return { title: 'Ingen påmeldinger ennå', description: 'Publiser et kurs for å se påmeldinger.' };
  }
  if (hasFilters) {
    return { title: 'Ingen treff', description: 'Prøv et annet søkeord eller bytt fane.' };
  }
  if (viewTab === 'followup') return { title: 'Alt er under kontroll', description: 'Ingen påmeldinger trenger oppfølging akkurat nå.' };
  if (viewTab === 'past')     return { title: 'Ingen fullførte påmeldinger', description: 'Påmeldinger dukker opp her når kurs er ferdige.' };
  return { title: 'Ingen aktive påmeldinger', description: 'Nye påmeldinger dukker opp her.' };
}

function SignupTableHead({ hideCourse = false }: { hideCourse?: boolean }) {
  return (
    <thead>
      <tr className="border-b border-border bg-background/50">
        <th scope="col" className="text-xs font-medium tracking-wide w-auto px-4 py-3 text-muted-foreground sm:px-6">Navn</th>
        {!hideCourse && (
          <th scope="col" className="text-xs font-medium tracking-wide hidden w-40 px-4 py-3 text-muted-foreground sm:table-cell sm:px-6">Kurs</th>
        )}
        <th scope="col" className="text-xs font-medium tracking-wide w-40 px-4 py-3 text-muted-foreground sm:px-6">Status</th>
        <th scope="col" className="text-xs font-medium tracking-wide hidden w-20 px-4 py-3 text-muted-foreground sm:px-6 md:table-cell">Kvittering</th>
        <th scope="col" className="text-xs font-medium tracking-wide hidden w-20 px-4 py-3 text-right text-muted-foreground sm:table-cell sm:px-6">Notater</th>
        <th scope="col" className="text-xs font-medium tracking-wide w-12 px-4 py-3 text-muted-foreground sm:px-6"><span className="sr-only">Handlinger</span></th>
      </tr>
    </thead>
  );
}

export function SignupListView({
  signups,
  isLoading = false,
  isEmpty = false,
  hasFilters = false,
  onClearFilters,
  actionHandlers,
  viewTab,
}: SignupListViewProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [signups]);

  if (isLoading) {
    return (
      <div className="overflow-x-auto" role="status" aria-live="polite">
        <span className="sr-only">Henter påmeldinger</span>
        <table className="w-full text-left border-collapse">
          <SignupTableHead />
          <tbody className="divide-y divide-border">
            {[1, 2, 3, 4, 5].map(i => (
              <SkeletonTableRow key={i} columns={COLUMN_COUNT} hasAvatar />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (isEmpty || signups.length === 0) {
    const { title, description } = emptyCopy(viewTab, hasFilters, isEmpty);
    return (
      <EmptyState
        icon={hasFilters ? Search : Calendar}
        title={title}
        description={description}
        action={hasFilters && onClearFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-xs font-medium tracking-wide underline underline-offset-2"
          >
            Nullstill filter
          </Button>
        ) : undefined}
        className="py-16"
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
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <SignupTableHead />
          <tbody className="divide-y divide-border">
            {visibleSignups.map(signup => (
              <SignupRow
                key={signup.id}
                signup={signup}
                actionHandlers={actionHandlers}
              />
            ))}
          </tbody>
        </table>
      </div>

      {(isTruncated || visibleCount > INITIAL_VISIBLE) && (
        <div className="flex justify-center gap-3 p-4">
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
    </>
  );
}

type CourseGroup = {
  courseId: string;
  className: string;
  endDate: string | null;
  signups: SignupDisplay[];
};

type GroupState = { expanded: boolean; visibleCount: number };

const PAST_GROUP_PAGE_SIZE = 10;

function formatEndDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function PastSignupsList({
  signups,
  actionHandlers,
}: {
  signups: SignupDisplay[];
  actionHandlers?: ParticipantActionHandlers;
}) {
  const groups = useMemo<CourseGroup[]>(() => {
    const map = new Map<string, CourseGroup>();
    for (const s of signups) {
      const existing = map.get(s.courseId);
      if (existing) {
        existing.signups.push(s);
      } else {
        map.set(s.courseId, {
          courseId: s.courseId,
          className: s.className,
          endDate: s.courseEndDate ?? null,
          signups: [s],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => (b.endDate || '').localeCompare(a.endDate || ''));
  }, [signups]);

  const [state, setState] = useState<Record<string, GroupState>>({});

  useEffect(() => {
    setState(prev => {
      const next: Record<string, GroupState> = {};
      groups.forEach((g, i) => {
        next[g.courseId] = prev[g.courseId] ?? { expanded: i === 0, visibleCount: PAST_GROUP_PAGE_SIZE };
      });
      return next;
    });
  }, [groups]);

  if (groups.length === 0) return null;

  return (
    <div className="divide-y divide-border">
      {groups.map(g => {
        const s = state[g.courseId] ?? { expanded: false, visibleCount: PAST_GROUP_PAGE_SIZE };
        const visible = s.expanded ? g.signups.slice(0, s.visibleCount) : [];
        const hasMore = s.expanded && s.visibleCount < g.signups.length;
        const sectionId = `past-signups-${g.courseId}`;
        const endLabel = formatEndDate(g.endDate);

        return (
          <div key={g.courseId}>
            <button
              type="button"
              onClick={() =>
                setState(prev => ({
                  ...prev,
                  [g.courseId]: {
                    expanded: !(prev[g.courseId]?.expanded ?? false),
                    visibleCount: prev[g.courseId]?.visibleCount ?? PAST_GROUP_PAGE_SIZE,
                  },
                }))
              }
              aria-expanded={s.expanded}
              aria-controls={sectionId}
              className="w-full flex items-center justify-between gap-3 px-3 py-3 text-left smooth-transition hover:bg-muted/40 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
            >
              <span className="flex items-center gap-2 min-w-0">
                <ChevronDown
                  className={`size-4 shrink-0 text-muted-foreground transition-transform ${s.expanded ? '' : '-rotate-90'}`}
                />
                <span className="min-w-0 truncate">
                  <span className="text-sm font-medium text-foreground">{g.className}</span>
                  {endLabel && (
                    <span className="ml-2 text-xs font-medium tracking-wide text-muted-foreground">
                      Sluttet {endLabel}
                    </span>
                  )}
                </span>
              </span>
              <Badge variant="secondary" className="text-muted-foreground tracking-wide shrink-0">
                {g.signups.length} {g.signups.length === 1 ? 'påmeldt' : 'påmeldte'}
              </Badge>
            </button>

            {s.expanded && (
              <div id={sectionId} className="border-t border-border">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <SignupTableHead hideCourse />
                    <tbody className="divide-y divide-border">
                      {visible.map(signup => (
                        <SignupRow
                          key={signup.id}
                          signup={signup}
                          actionHandlers={actionHandlers}
                          hideCourse
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                {hasMore && (
                  <div className="flex justify-center p-4 border-t border-border">
                    <Button
                      variant="outline-soft"
                      size="sm"
                      onClick={() =>
                        setState(prev => ({
                          ...prev,
                          [g.courseId]: {
                            expanded: true,
                            visibleCount: (prev[g.courseId]?.visibleCount ?? PAST_GROUP_PAGE_SIZE) + PAST_GROUP_PAGE_SIZE,
                          },
                        }))
                      }
                    >
                      Vis flere
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
