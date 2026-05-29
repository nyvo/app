import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MoreHorizontal, Calendar, Clock, MapPin } from '@/lib/icons';
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
import { StatusBadge } from '@/components/ui/status-badge';
import { ShareCoursePopover } from '@/components/ui/share-course-popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PublishCourseDialog } from '@/components/teacher/PublishCourseDialog';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useCourseDetail } from '@/hooks/use-course-detail';
import { deriveCourseDisplayStatus } from '@/lib/course-status';
import { publishCourse, unpublishCourse } from '@/services/courses';
import { friendlyError } from '@/lib/error-messages';
import { routes } from '@/lib/routes';
import type { CourseSession } from '@/types/database';

const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const;
const WEEKDAY_SHORT = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'] as const;

function formatSessionDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`;
}

function formatSessionDateLabel(session: CourseSession): string {
  const d = new Date(session.session_date + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  const weekday = WEEKDAY_SHORT[d.getDay()];
  return `${weekday} ${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`;
}

function buildTimeRange(startTime: string, durationMinutes: number): string {
  const start = startTime.slice(0, 5);
  if (!durationMinutes || durationMinutes <= 0) return start;
  const [h, m] = start.split(':').map(Number);
  const total = h * 60 + m + durationMinutes;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${start}–${pad(endH)}:${pad(endM)}`;
}

type CourseStatus = 'draft' | 'active' | 'upcoming' | 'completed';

function DrawerHeader({
  title,
  status,
  description,
}: {
  title: string;
  status: string;
  description?: ReactNode;
}) {
  return (
    <SheetHeader className="px-6 py-4 border-b border-border">
      <div className="flex items-start gap-3 flex-wrap">
        <SheetTitle className="leading-tight">
          {title}
        </SheetTitle>
        {status === 'cancelled' ? (
          <span className="inline-flex items-center px-2 h-6 rounded-md text-sm font-medium bg-muted text-foreground-muted line-through shrink-0">
            Avlyst
          </span>
        ) : (
          <StatusBadge status={status as CourseStatus} className="shrink-0" />
        )}
      </div>
      {description && (
        <SheetDescription asChild>
          <div className="mt-1">{description}</div>
        </SheetDescription>
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
 *     session date/time/location, top-5 påmeldte, single "Åpne kursside"
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
  const { currentSeller, currentTeam } = useAuth();
  const {
    course: courseData,
    sessions,
    participants,
    loading: isLoading,
    error,
    setCourse,
  } = useCourseDetail(courseId);

  // Filter out cancelled/refunded — they shouldn't inflate the X / capacity
  // ratio or appear in the top-5 preview (was reading e.g. "16 / 10" because
  // cancellations weren't filtered out).
  const confirmedParticipants = participants.filter((p) => p.status === 'confirmed');
  const confirmedCount = confirmedParticipants.length;

  const [isPublishing, setIsPublishing] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  const handlePublish = async () => {
    if (!courseId) return;
    if (!currentSeller?.dintero_onboarding_complete) {
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
    setCourse({ ...courseData, status: 'draft' });
    const { error: unpubError } = await unpublishCourse(courseId);
    if (unpubError) {
      setCourse({ ...courseData, status: previousStatus });
      toast.error(friendlyError(unpubError, 'Kunne ikke avpublisere kurset'));
      return;
    }
    toast.success('Kurset er lagret som utkast', {
      duration: 8000,
      action: {
        label: 'Angre',
        onClick: async () => {
          setCourse({ ...courseData, status: previousStatus });
          const { error: revertError } = await publishCourse(courseId);
          if (revertError) {
            setCourse({ ...courseData, status: 'draft' });
            toast.error(friendlyError(revertError, 'Kunne ikke gjenopprette publisering'));
          }
        },
      },
    });
  };

  if (isLoading) {
    return (
      <>
        <SheetHeader className="px-6 py-4 border-b border-border">
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
            <Skeleton className="h-5 w-32 mb-4" />
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
        <SheetHeader className="px-6 py-4 border-b border-border">
          <SheetTitle>Kurs ikke funnet</SheetTitle>
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
    currentTeam?.slug && courseData.slug
      ? `${window.location.origin}/${currentTeam.slug}/${courseData.slug}`
      : '';
  const isMultiDay = sessions.length > 1;
  const displayStatus = deriveCourseDisplayStatus({
    status: courseData.status,
    startDate: courseData.startDate,
    endDate: courseData.endDate,
    sessions,
  });

  const whenLine = courseData.timeSchedule
    ? courseData.durationMinutes
      ? `${courseData.timeSchedule} (${courseData.durationMinutes} min)`
      : courseData.timeSchedule
    : null;

  const headerDescription =
    whenLine || courseData.location ? (
      <>
        {whenLine}
        {whenLine && courseData.location && (
          <span className="text-foreground-disabled mx-2">·</span>
        )}
        {courseData.location}
      </>
    ) : undefined;

  return (
    <>
      <DrawerHeader
        title={courseData.title}
        status={displayStatus}
        description={headerDescription}
      />

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* Payment alert — page-scoped inline */}
        {!currentSeller?.dintero_onboarding_complete && (
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
                    : 'Du kan ikke motta kortbetalinger før Dintero-oppsettet er fullført.'}
                </AlertDescription>
                <div className="mt-3">
                  <Button
                    variant="secondary"
                    onClick={() => navigate(routes.settingsPayouts)}
                  >
                    Fullfør oppsettet
                  </Button>
                </div>
              </div>
            </Alert>
          </div>
        )}

        {/* Action cluster — quick operations only */}
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
                onClick={() => courseUrl && window.open(courseUrl, '_blank')}
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

        {/* Påmeldte — the operational concern */}
        <section className="px-6 py-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium tracking-tight text-foreground">
              Påmeldte ({confirmedCount}
              {courseData.capacity > 0 ? ` / ${courseData.capacity}` : ''})
            </h3>
          </div>
          {confirmedCount === 0 ? (
            <p className="text-base text-foreground-muted">
              Ingen påmeldinger ennå.
            </p>
          ) : (
            <div className="space-y-1">
              {confirmedParticipants.slice(0, 5).map((p) => {
                const name = p.participant_name || p.profile?.name || 'Ukjent';
                const email = p.participant_email || p.profile?.email || '';
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 py-2"
                  >
                    <UserAvatar name={name} email={email} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-medium truncate text-foreground">
                        {name}
                      </p>
                      <p className="text-sm truncate text-foreground-muted">
                        {email}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Sessions — only when multi-day. Read-only here; editing on /courses/:id. */}
        {isMultiDay && (
          <section className="px-6 py-6">
            <h3 className="text-base font-medium tracking-tight text-foreground mb-4">
              Økter ({sessions.length})
            </h3>
            <div className="space-y-1">
              {sessions.map((s, i) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 py-2 text-base"
                >
                  <span className="text-foreground-muted tabular-nums">
                    Uke {String(i + 1).padStart(2, '0')}
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
    loading: isLoading,
    error,
  } = useCourseDetail(courseId);

  if (isLoading) {
    return (
      <>
        <SheetHeader className="px-6 py-4 border-b border-border">
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
        <SheetHeader className="px-6 py-4 border-b border-border">
          <SheetTitle>Kurs ikke funnet</SheetTitle>
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

  const sessionDateLabel = currentSession
    ? formatSessionDateLabel(currentSession)
    : null;
  const sessionTimeRange = currentSession?.start_time
    ? buildTimeRange(currentSession.start_time, courseData.durationMinutes)
    : null;

  const headerDescription =
    sessionDateLabel || sessionTimeRange || courseData.location ? (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-foreground-muted">
        {sessionDateLabel && (
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5" strokeWidth={1.75} />
            {sessionDateLabel}
          </span>
        )}
        {sessionTimeRange && (
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Clock className="size-3.5" strokeWidth={1.75} />
            {sessionTimeRange}
          </span>
        )}
        {courseData.location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" strokeWidth={1.75} />
            {courseData.location}
          </span>
        )}
      </div>
    ) : undefined;

  const confirmedParticipants = participants.filter((p) => p.status === 'confirmed');
  const confirmedCount = confirmedParticipants.length;
  const visibleParticipants = confirmedParticipants.slice(0, 5);
  const extraCount = Math.max(0, confirmedCount - visibleParticipants.length);
  const displayStatus = deriveCourseDisplayStatus({
    status: courseData.status,
    startDate: courseData.startDate,
    endDate: courseData.endDate,
    sessions,
  });

  return (
    <>
      <DrawerHeader
        title={courseData.title}
        status={displayStatus}
        description={headerDescription}
      />

      <div className="flex-1 overflow-y-auto">
        <section className="px-6 py-6">
          <h3 className="text-base font-medium tracking-tight text-foreground mb-4">
            Påmeldte ({confirmedCount}
            {courseData.capacity > 0 ? ` / ${courseData.capacity}` : ''})
          </h3>
          {confirmedCount === 0 ? (
            <p className="text-base text-foreground-muted">Ingen påmeldinger ennå.</p>
          ) : (
            <div className="space-y-1">
              {visibleParticipants.map((p) => {
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
              {extraCount > 0 && (
                <p className="pt-2 text-sm text-foreground-muted">+ {extraCount} flere</p>
              )}
            </div>
          )}
        </section>
      </div>

      <div className="border-t border-border px-6 py-4 bg-background">
        <Button asChild className="w-full">
          <Link to={routes.course(courseId)} onClick={onClose}>
            Åpne kursside
          </Link>
        </Button>
      </div>
    </>
  );
}
