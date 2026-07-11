import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarDays, Clock, MoreHorizontal } from '@/lib/icons';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { StatusBadge, type CourseStatus } from '@/components/ui/status-badge';
import { ShareCoursePopover } from '@/components/ui/share-course-popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PublishCourseDialog } from '@/components/teacher/PublishCourseDialog';
import { formatCourseDate, formatSessionDate, buildTimeRange } from '@/components/teacher/CourseMetaRow';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useCourseDetail } from '@/hooks/use-course-detail';
import { publishCourse, unpublishCourse } from '@/services/courses';
import { friendlyError } from '@/lib/error-messages';
import { runWithRevert } from '@/lib/undo';
import { publishNeedsPaymentSetup } from '@/lib/payments';
import { routes } from '@/lib/routes';

/**
 * Count shown next to the "Påmeldte" heading. `–` while the roster is loading
 * or after a failed fetch, so a fabricated 0 never appears.
 */
function ParticipantCount({
  loading,
  error,
  count,
  capacity,
}: {
  loading: boolean;
  error: boolean;
  count: number;
  capacity: number;
}) {
  const value = loading || error ? '–' : String(count);
  return (
    <span className="text-base tabular-nums text-foreground-muted">
      {value}
      {capacity > 0 ? ` / ${capacity}` : ''}
    </span>
  );
}

/**
 * Body of the "Påmeldte" section shared by both drawer views: skeleton rows
 * while loading, a one-line error on failure, the true-empty sentence only
 * when the roster is genuinely empty, otherwise the confirmed list.
 */
function ParticipantsBody({
  loading,
  error,
  participants,
}: {
  loading: boolean;
  error: boolean;
  participants: { id: string; participant_name?: string | null; participant_email?: string | null; profile?: { name?: string | null; email?: string | null } | null }[];
}) {
  if (loading) {
    return (
      <div className="space-y-1" role="status" aria-label="Laster deltakere">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="size-8 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-48 max-w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        variant="inline"
        title="Kunne ikke laste deltakerne"
        message="Sjekk nettet og prøv igjen."
      />
    );
  }

  if (participants.length === 0) {
    return <EmptyState variant="compact" title="Ingen påmeldinger ennå" />;
  }

  return (
    <div className="space-y-1">
      {participants.map((p) => {
        const name = p.participant_name || p.profile?.name || 'Ukjent';
        const email = p.participant_email || p.profile?.email || '';
        return (
          <div key={p.id} className="flex items-center gap-3 py-2">
            <UserAvatar name={name} email={email} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-base font-medium truncate text-foreground">{name}</p>
              <p className="text-sm truncate text-foreground-muted">{email}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DrawerHeader({
  title,
  status,
  description,
  hideHealthyBadge = false,
}: {
  title: string;
  status: string;
  description?: ReactNode;
  /** Suppress the badge for healthy statuses (active/upcoming) — the schedule
   * quick view only surfaces state when it carries information (draft,
   * cancelled, completed). */
  hideHealthyBadge?: boolean;
}) {
  const badgeIsInformative =
    status === 'draft' || status === 'completed' || status === 'cancelled';
  const showBadge = hideHealthyBadge ? badgeIsInformative : true;

  return (
    <SheetHeader>
      {/* Title owns its row (Cron/Notion Calendar event-panel model); state
          moves to its own row below the meta so nothing competes with it.
          StatusBadge centralizes all status treatments incl. Avlyst. */}
      <SheetTitle className="leading-tight">{title}</SheetTitle>
      {description && (
        <SheetDescription asChild>
          <div className="mt-1.5">{description}</div>
        </SheetDescription>
      )}
      {showBadge && (
        <div className="mt-2.5">
          <StatusBadge status={status as CourseStatus} />
        </div>
      )}
    </SheetHeader>
  );
}

interface CourseDrawerProps {
  /** When undefined, drawer is closed. */
  courseId: string | undefined;
  /** Origin of the open action — controls which body the drawer renders. */
  origin?: 'schedule';
  /** Specific session the user tapped (only meaningful when origin === 'schedule'). */
  sessionId?: string;
  onClose: () => void;
}

/**
 * CourseDrawer — quick-glance read-only drawer for a course.
 *
 * Studio rule (patterns.md § 15): drawers are supplementary, pages are
 * primary. The body splits by `origin`:
 *   - `schedule` → minimal session-framed quick view: title + status,
 *     session date/time/location, full påmeldte list, single "Åpne kursside"
 *     footer link. No course-management chrome.
 *   - default (courses list) → full course-management quick view with
 *     publish/share/unpublish, multi-day session list, etc.
 * Anything that requires editing or configuration lives on /courses/:id.
 */
export function CourseDrawer({ courseId, origin, sessionId, onClose }: CourseDrawerProps) {
  const isOpen = !!courseId;

  return (
    <Sheet open={isOpen} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 sm:max-w-[480px] w-full p-0"
      >
        {courseId &&
          (origin === 'schedule' ? (
            <ScheduleQuickView
              courseId={courseId}
              sessionId={sessionId}
              onClose={onClose}
            />
          ) : (
            <ViewMode courseId={courseId} onClose={onClose} />
          ))}
      </SheetContent>
    </Sheet>
  );
}

function ViewMode({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const navigate = useNavigate();
  const { currentSeller } = useAuth();
  const {
    course: courseData,
    sessions,
    participants,
    participantsLoading,
    participantsError,
    loading: isLoading,
    error,
    setCourse,
  } = useCourseDetail(courseId);

  // Filter out cancelled/refunded — they shouldn't inflate the X / capacity
  // ratio or appear in the list (was reading e.g. "16 / 10" because
  // cancellations weren't filtered out).
  const confirmedParticipants = participants.filter((p) => p.status === 'confirmed');
  const confirmedCount = confirmedParticipants.length;

  const [isPublishing, setIsPublishing] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  // Only paid courses need Stripe onboarding to publish — 0 kr courses go
  // live on every tier without payment setup.
  const courseHasPaidTier =
    (courseData?.price ?? 0) > 0 ||
    ((courseData?.allowsDropIn ?? false) && (courseData?.dropInPrice ?? 0) > 0);

  const handlePublish = async () => {
    if (!courseId) return;
    if (publishNeedsPaymentSetup(currentSeller, courseHasPaidTier)) {
      setShowPublishDialog(true);
      return;
    }
    setIsPublishing(true);
    const { error: pubError } = await publishCourse(courseId);
    if (pubError) {
      toast.error(friendlyError(pubError, 'Kunne ikke publisere kurset'));
      setIsPublishing(false);
      return;
    }
    if (courseData) setCourse({ ...courseData, status: 'upcoming' });
    toast.success('Kurset er publisert');
    setIsPublishing(false);
  };

  // Tier 1 — toast+undo. Status flip is reversible (draft ↔ upcoming) and
  // existing signups are not affected, so no confirm dialog is needed.
  const handleUnpublish = async () => {
    if (!courseId || !courseData) return;
    const previousStatus = courseData.status;
    await runWithRevert({
      message: 'Kurset er lagret som utkast',
      apply: () => setCourse({ ...courseData, status: 'draft' }),
      revert: () => setCourse({ ...courseData, status: previousStatus }),
      commit: () => unpublishCourse(courseId),
      undo: () => publishCourse(courseId),
      commitErrorMessage: (e) => friendlyError(e, 'Kunne ikke avpublisere kurset'),
      undoErrorMessage: (e) => friendlyError(e, 'Kunne ikke gjenopprette publisering'),
    });
  };

  if (isLoading) {
    return (
      <>
        <SheetHeader>
          <SheetTitle className="sr-only">Laster kurs</SheetTitle>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-32" />
        </SheetHeader>
        <div
          className="flex-1 overflow-y-auto"
          role="status"
          aria-live="polite"
        >
          <span className="sr-only">Laster…</span>
          {/* Action cluster — primary button + 1-2 outline buttons */}
          <section className="px-6 py-6 flex items-center gap-2 border-b border-border">
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </section>
          {/* Påmeldte — heading + 3 participant rows */}
          <section className="px-6 py-6 border-b border-border">
            <Skeleton className="h-5 w-32 mb-3" />
            <div className="space-y-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-48 max-w-full" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </>
    );
  }

  if (error || !courseData) {
    return (
      <>
        <SheetHeader>
          <SheetTitle>Fant ikke kurset</SheetTitle>
        </SheetHeader>
        <div className="flex-1 px-6 py-6">
          <p className="text-base text-foreground-muted">
            {error || 'Kurset finnes ikke eller er slettet.'}
          </p>
        </div>
      </>
    );
  }

  const courseUrl =
    currentSeller?.slug && courseData.slug
      ? `${window.location.origin}/${currentSeller.slug}/${courseData.slug}`
      : '';
  const isMultiDay = sessions.length > 1;

  const whenLine = courseData.timeSchedule
    ? courseData.durationMinutes
      ? `${courseData.timeSchedule} (${courseData.durationMinutes} min)`
      : courseData.timeSchedule
    : null;

  // When-line and location as stacked lines — no "·" metadata separators
  // (ui-patterns §2.1: separation via layout, not interpuncts).
  const headerDescription =
    whenLine || courseData.location ? (
      <>
        {whenLine && <span className="block">{whenLine}</span>}
        {courseData.location && <span className="block">{courseData.location}</span>}
      </>
    ) : undefined;

  return (
    <>
      <DrawerHeader
        title={courseData.title}
        status={courseData.status}
        description={headerDescription}
      />

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* Payment alert — page-scoped inline. Only paid courses need the
            payout account; 0 kr courses publish without Stripe onboarding. */}
        {publishNeedsPaymentSetup(currentSeller, courseHasPaidTier) && (
          <div className="px-6 pt-6">
            <Alert variant="warning">
              <div>
                <AlertTitle variant="warning">
                  {courseData.status === 'draft'
                    ? 'Kurset er ikke publisert'
                    : 'Sett opp utbetalinger'}
                </AlertTitle>
                <AlertDescription variant="warning">
                  {courseData.status === 'draft'
                    ? 'Sett opp betalinger for å publisere kurset.'
                    : 'Du kan ikke motta kortbetalinger før betalingsoppsettet er fullført.'}
                </AlertDescription>
                <div className="mt-3">
                  <Button
                    variant="default"
                    onClick={() => navigate(routes.settingsPayouts)}
                  >
                    Fullfør oppsettet
                  </Button>
                </div>
              </div>
            </Alert>
          </div>
        )}

        {/* Action cluster — quick operations only. Draft gets Publish; live
            (upcoming/active) gets share + view + unpublish. A finished or
            cancelled course is archival, so the cluster is hidden entirely. */}
        {(courseData.status === 'draft' ||
          courseData.status === 'upcoming' ||
          courseData.status === 'active') && (
          <section className="px-6 py-6 flex flex-wrap items-center gap-2 border-b border-border">
            {courseData.status === 'draft' ? (
              <Button
                onClick={handlePublish}
                loading={isPublishing}
                loadingText="Publiserer"
              >
                Publiser kurs
              </Button>
            ) : (
              <>
                <ShareCoursePopover
                  courseUrl={courseUrl}
                  courseTitle={courseData.title}
                />
                <Button
                  variant="secondary"
                  onClick={() => courseUrl && window.open(courseUrl, '_blank', 'noopener')}
                  disabled={!courseUrl}
                >
                  Vis side
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="soft" size="icon" aria-label="Mer">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleUnpublish}>
                      Gjør til utkast
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </section>
        )}

        {/* Påmeldte — the operational concern */}
        <section className="px-6 py-6 border-b border-border">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h3 className="text-base font-medium text-foreground">Påmeldte</h3>
            <ParticipantCount
              loading={participantsLoading}
              error={participantsError}
              count={confirmedCount}
              capacity={courseData.capacity}
            />
          </div>
          <ParticipantsBody
            loading={participantsLoading}
            error={participantsError}
            participants={confirmedParticipants}
          />
        </section>

        {/* Sessions — only when multi-day. Read-only here; editing on /courses/:id. */}
        {isMultiDay && (
          <section className="px-6 py-6">
            <h3 className="text-base font-medium text-foreground mb-3">
              Økter ({sessions.length})
            </h3>
            <div className="space-y-1">
              {sessions.map((s, i) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 py-2 text-base"
                >
                  <span className="text-foreground-muted tabular-nums">
                    Uke {i + 1}
                  </span>
                  <span className="text-foreground tabular-nums">
                    {formatSessionDate(s.session_date)}
                    {s.start_time && (
                      <span className="text-foreground-muted ml-2">
                        kl. {s.start_time.slice(0, 5)}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Sticky footer — single escape link to the full page */}
      <div className="border-t border-border px-6 py-4 bg-background">
        <Button
          variant="ghost"
          asChild
          className="-ml-2 text-foreground-muted hover:text-foreground"
        >
          <Link to={routes.course(courseId)} onClick={onClose}>
            Åpne kursside
          </Link>
        </Button>
      </div>

      {/* Dialogs */}
      {currentSeller?.id && (
        <PublishCourseDialog
          open={showPublishDialog}
          onOpenChange={setShowPublishDialog}
          courseTitle={courseData.title}
        />
      )}
    </>
  );
}

/**
 * ScheduleQuickView — opened from /schedule. Session-framed peek with the
 * fewest possible elements: course title + status, this session's
 * date/time/location, who's coming, single deep-link to the full page.
 * Course-management actions (publish, share, unpublish) intentionally
 * absent — they belong on /courses/:id.
 */
function ScheduleQuickView({
  courseId,
  sessionId,
  onClose,
}: {
  courseId: string;
  sessionId: string | undefined;
  onClose: () => void;
}) {
  const {
    course: courseData,
    sessions,
    participants,
    participantsLoading,
    participantsError,
    loading: isLoading,
    error,
  } = useCourseDetail(courseId);

  if (isLoading) {
    return (
      <>
        <SheetHeader>
          <SheetTitle className="sr-only">Laster kurs</SheetTitle>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-32" />
        </SheetHeader>
        <div className="flex-1 px-6 py-6 space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </>
    );
  }

  if (error || !courseData) {
    return (
      <>
        <SheetHeader>
          <SheetTitle>Fant ikke kurset</SheetTitle>
        </SheetHeader>
        <div className="flex-1 px-6 py-6">
          <p className="text-base text-foreground-muted">
            {error || 'Kurset finnes ikke eller er slettet.'}
          </p>
        </div>
      </>
    );
  }

  const currentSession = sessionId ? sessions.find((s) => s.id === sessionId) : undefined;

  // Long-form date ("Fredag 4. juli") — the short "Fre 4. jul" read as
  // terse/boring in the header. Sentence-cased; Norwegian keeps the month
  // lowercase.
  const rawDate = currentSession ? formatCourseDate(currentSession.session_date) : '';
  const sessionDateLabel = rawDate
    ? rawDate.charAt(0).toUpperCase() + rawDate.slice(1)
    : null;
  const sessionTimeRange = currentSession?.start_time
    ? buildTimeRange(currentSession.start_time, courseData.durationMinutes)
    : null;
  // Duration appended only when known — the "·" separator is approved here.
  const sessionTimeLine =
    sessionTimeRange && courseData.durationMinutes > 0
      ? `${sessionTimeRange} · ${courseData.durationMinutes} min`
      : sessionTimeRange;

  // Single metadata row (list-row meta grammar): calendar icon + long date,
  // clock icon + time+duration — all secondary text, no boxed date chip.
  const headerDescription =
    sessionDateLabel || sessionTimeLine ? (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground-muted">
        {sessionDateLabel && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4 shrink-0" strokeWidth={1.75} />
            {sessionDateLabel}
          </span>
        )}
        {sessionTimeLine && (
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Clock className="size-4 shrink-0" strokeWidth={1.75} />
            {sessionTimeLine}
          </span>
        )}
      </div>
    ) : undefined;

  const confirmedParticipants = participants.filter((p) => p.status === 'confirmed');
  const confirmedCount = confirmedParticipants.length;

  return (
    <>
      <DrawerHeader
        title={courseData.title}
        status={courseData.status}
        description={headerDescription}
        hideHealthyBadge
      />

      <div className="flex-1 overflow-y-auto">
        <section className="px-6 py-6">
          {/* Heading + count as an aligned pair (schedule-card grammar):
              the word carries hierarchy, the number reads as a datum. */}
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h3 className="text-base font-medium text-foreground">Påmeldte</h3>
            <ParticipantCount
              loading={participantsLoading}
              error={participantsError}
              count={confirmedCount}
              capacity={courseData.capacity}
            />
          </div>
          {/* Every confirmed signup — the body scrolls, so there is no reason to
              cap the list behind a "+x flere". */}
          <ParticipantsBody
            loading={participantsLoading}
            error={participantsError}
            participants={confirmedParticipants}
          />
        </section>
      </div>

      <div className="border-t border-border px-6 py-4 bg-background">
        {/* The drawer's only action — primary, not secondary. */}
        <Button asChild className="w-full">
          <Link to={routes.course(courseId)} onClick={onClose}>
            Åpne kursside
          </Link>
        </Button>
      </div>
    </>
  );
}
