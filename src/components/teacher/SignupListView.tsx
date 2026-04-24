import { useMemo, useState } from 'react';
import { Search, Calendar, ChevronDown } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SkeletonTableRow } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableHeader, TableBody, TableHead } from '@/components/ui/table';
import { UserAvatar } from '@/components/ui/user-avatar';
import { SignupStatusBadge } from '@/components/ui/signup-status-badge';
import { NotePopover } from '@/components/ui/note-popover';
import { SignupRow } from './SignupRow';
import { ParticipantActionMenu, type ParticipantActionHandlers } from './ParticipantActionMenu';
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
    <TableHeader>
      <tr>
        <TableHead className="min-w-[220px] max-w-[360px] w-[40%]">Navn</TableHead>
        {!hideCourse && (
          <TableHead className="hidden w-40 sm:table-cell">Kurs</TableHead>
        )}
        <TableHead className="w-40">Status</TableHead>
        <TableHead className="hidden w-20 md:table-cell">Kvittering</TableHead>
        <TableHead className="hidden w-36 sm:table-cell">Notater</TableHead>
        <TableHead className="w-12"><span className="sr-only">Handlinger</span></TableHead>
      </tr>
    </TableHeader>
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
      <div role="status" aria-live="polite">
        <span className="sr-only">Henter påmeldinger</span>
        <Table>
          <SignupTableHead />
          <TableBody>
            {[1, 2, 3, 4, 5].map(i => (
              <SkeletonTableRow key={i} columns={COLUMN_COUNT} hasAvatar />
            ))}
          </TableBody>
        </Table>
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

  return (
    <Table>
      <SignupTableHead />
      <TableBody>
        {signups.map(signup => (
          <SignupRow
            key={signup.id}
            signup={signup}
            actionHandlers={actionHandlers}
          />
        ))}
      </TableBody>
    </Table>
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

/**
 * Compact one-line view of a signup, used inside the expanded body of a
 * completed-course card. Drops the per-column table chrome — the surrounding
 * card already provides the course context, so this row only needs identity +
 * status + actions.
 */
function CompactPastSignupItem({
  signup,
  actionHandlers,
}: {
  signup: SignupDisplay;
  actionHandlers?: ParticipantActionHandlers;
}) {
  const isCancelled = signup.status === 'cancelled' || signup.status === 'course_cancelled';
  const hasActions = !!actionHandlers && (
    !isCancelled || !!signup.dinteroTransactionId || !!signup.exceptionType
  );

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 smooth-transition hover:bg-muted/50">
      <UserAvatar name={signup.participantName} email={signup.participantEmail} size="sm" />
      <div className="min-w-0 flex-1">
        <p className={cn(
          'text-sm font-medium truncate',
          isCancelled ? 'text-muted-foreground' : 'text-foreground',
        )}>
          {signup.participantName}
        </p>
        <p className="text-xs font-mono truncate text-muted-foreground">
          {signup.participantEmail}
        </p>
      </div>
      <SignupStatusBadge
        status={signup.status}
        paymentStatus={signup.paymentStatus}
        className="shrink-0"
      />
      <div className="flex items-center gap-1 shrink-0">
        <NotePopover note={signup.note} />
        {hasActions && actionHandlers && (
          <ParticipantActionMenu signup={signup} handlers={actionHandlers} />
        )}
      </div>
    </div>
  );
}

/**
 * Builds a "5 påmeldte · 1 refundert · 2 avbestilt" summary string so teachers
 * can see at-a-glance whether a course had anomalies, without expanding it.
 */
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

  // All groups default to collapsed — keeps initial view scannable.
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
              aria-controls={sectionId}
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
                  <CompactPastSignupItem
                    key={signup.id}
                    signup={signup}
                    actionHandlers={actionHandlers}
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
