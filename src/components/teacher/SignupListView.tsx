import { useMemo, useState } from 'react';
import { Search, Calendar, ChevronDown } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { SignupRow } from './SignupRow';
import { type ParticipantActionHandlers } from './ParticipantActionMenu';
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

export const SIGNUPS_INITIAL_VISIBLE = 20;
export const SIGNUPS_LOAD_MORE_INCREMENT = 20;
export const SIGNUPS_SHOW_ALL_THRESHOLD = 5;

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

function SignupRowSkeleton() {
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)_32px] md:grid-cols-[32px_minmax(0,1fr)_160px_32px] items-center gap-4 px-4 py-3.5">
      <Skeleton className="size-8 rounded-full" />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-4 w-40 max-w-full" />
        <Skeleton className="h-3 w-56 max-w-full" />
        <Skeleton className="h-3 w-32 max-w-full" />
      </div>
      <div className="hidden md:flex flex-col items-end gap-1.5">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="size-8 rounded-md" />
    </div>
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
  if (isLoading) {
    return (
      <div role="status" aria-live="polite" className="divide-y divide-border">
        <span className="sr-only">Henter påmeldinger</span>
        {[1, 2, 3, 4, 5].map(i => <SignupRowSkeleton key={i} />)}
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
          >
            Nullstill filter
          </Button>
        ) : undefined}
        className="py-16"
      />
    );
  }

  return (
    <div className="divide-y divide-border">
      {signups.map(signup => (
        <SignupRow
          key={signup.id}
          signup={signup}
          actionHandlers={actionHandlers}
        />
      ))}
    </div>
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

function summarizeGroup(signups: SignupDisplay[]): string {
  const total = signups.length;
  const refunded = signups.filter(s => s.paymentStatus === 'refunded').length;
  const cancelled = signups.filter(s => s.status === 'cancelled' || s.status === 'course_cancelled').length;
  const parts = [`${total} ${total === 1 ? 'påmeldt' : 'påmeldte'}`];
  if (refunded > 0) parts.push(`${refunded} refundert`);
  if (cancelled > 0) parts.push(`${cancelled} avbestilt`);
  return parts.join(' · ');
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

  if (groups.length === 0) return null;

  return (
    <div className="space-y-3">
      {groups.map(g => {
        const s = state[g.courseId] ?? { expanded: false, visibleCount: PAST_GROUP_PAGE_SIZE };
        const visible = s.expanded ? g.signups.slice(0, s.visibleCount) : [];
        const hasMore = s.expanded && s.visibleCount < g.signups.length;
        const sectionId = `past-signups-${g.courseId}`;
        const endLabel = formatEndDate(g.endDate);
        const summary = summarizeGroup(g.signups);

        return (
          <Card key={g.courseId} className="gap-0 overflow-hidden p-0">
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
              aria-controls={s.expanded ? sectionId : undefined}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left smooth-transition hover:bg-muted/50 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
            >
              <div className="flex items-center gap-2 min-w-0">
                <ChevronDown
                  className={cn(
                    'size-4 shrink-0 text-muted-foreground transition-transform',
                    !s.expanded && '-rotate-90',
                  )}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {g.className}
                  </p>
                  {endLabel && (
                    <p className="text-xs text-tertiary-foreground">
                      Sluttet {endLabel}
                    </p>
                  )}
                </div>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                {summary}
              </span>
            </button>

            {s.expanded && (
              <div id={sectionId} className="border-t border-border divide-y divide-border">
                {visible.map(signup => (
                  <SignupRow
                    key={signup.id}
                    signup={signup}
                    actionHandlers={actionHandlers}
                    hideCourse
                  />
                ))}
                {hasMore && (
                  <div className="flex justify-center p-3">
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
          </Card>
        );
      })}
    </div>
  );
}
