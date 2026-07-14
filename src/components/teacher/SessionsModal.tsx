import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, ChevronRight } from '@/lib/icons';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SessionRescheduleForm } from '@/components/teacher/SessionRescheduleForm';
import { cn } from '@/lib/utils';
import { stepVariants } from '@/lib/motion';
import { friendlyError } from '@/lib/error-messages';
import { rescheduleCourseSession } from '@/services/courses';
import { osloTodayKey } from '@/utils/dateUtils';
import { WEEKDAYS_LONG, MONTHS_LONG } from '@/lib/calendar-nb';
import type { CourseSession } from '@/types/database';

interface SessionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: CourseSession[];
  /** Default session duration in minutes — used to suggest an end time
   * when the user adjusts the start time without touching the end. */
  defaultDurationMinutes: number;
  /** Called after a successful reschedule so the parent can refetch. */
  onSessionUpdated: () => void;
  /** When set as the modal opens, jump straight into reschedule for this
   *  session (the Timeplan pencil). Null/undefined opens the list. */
  initialEditSessionId?: string | null;
}

type View = 'list' | 'reschedule';

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Parse a YYYY-MM-DD key as a *local* date (avoids the UTC off-by-one).
function parseYMD(s: string | null | undefined): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function weekdayLabel(date: string): string {
  const d = parseYMD(date);
  return d ? WEEKDAYS_LONG[d.getDay()] : '';
}

function shortTime(time: string | null | undefined): string {
  return time ? time.slice(0, 5) : '';
}

function dayMonth(date: string): string {
  const d = parseYMD(date);
  return d ? `${d.getDate()}. ${MONTHS_LONG[d.getMonth()]}` : date;
}

/** Time range with a no-space en-dash (Norwegian convention): 06:00–07:00. */
function timeRange(s: CourseSession): string {
  const start = shortTime(s.start_time);
  if (!start) return '';
  const end = shortTime(s.end_time);
  return end ? `${start}–${end}` : start;
}

export function SessionsModal({
  open,
  onOpenChange,
  sessions,
  defaultDurationMinutes,
  onSessionUpdated,
  initialEditSessionId,
}: SessionsModalProps) {
  const [view, setView] = useState<View>('list');
  // Step direction for the list ↔ reschedule transition (stepVariants):
  // +1 going list→reschedule, -1 coming back. Set right before the view
  // state changes so AnimatePresence picks it up for that swap.
  const [direction, setDirection] = useState(1);
  const [editing, setEditing] = useState<CourseSession | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Reschedule failure — shown inline in the dialog (like the drawers'
  // submit errors), not as a toast behind the overlay.
  const [submitError, setSubmitError] = useState<string | null>(null);

  // On open: jump straight into reschedule if a session was targeted (the
  // Timeplan pencil), otherwise show the list.
  useEffect(() => {
    if (!open) return;
    const target = initialEditSessionId
      ? sessions.find((s) => s.id === initialEditSessionId)
      : undefined;
    if (target) {
      setEditing(target);
      setView('reschedule');
    } else {
      setView('list');
      setEditing(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialEditSessionId]);

  const today = useMemo(() => osloTodayKey(), [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const ordered = useMemo(
    () => sessions.slice().sort((a, b) => a.session_date.localeCompare(b.session_date)),
    [sessions],
  );

  function startReschedule(session: CourseSession) {
    setEditing(session);
    setSubmitError(null);
    setDirection(1);
    setView('reschedule');
  }

  function backToList() {
    setDirection(-1);
    setView('list');
    setEditing(null);
    setSubmitError(null);
  }

  async function submitReschedule(args: {
    newDate: string;
    newStartTime: string;
    newEndTime?: string;
  }) {
    if (!editing) return;
    setSubmitting(true);
    setSubmitError(null);
    const { data, error } = await rescheduleCourseSession({
      sessionId: editing.id,
      ...args,
    });
    setSubmitting(false);
    if (error) {
      setSubmitError(friendlyError(error, 'Kunne ikke lagre den nye tiden.'));
      return;
    }
    const notified = data?.notified ?? 0;
    toast.success(
      notified > 0
        ? `Ny tid lagret – varslet ${notified} ${notified === 1 ? 'deltaker' : 'deltakere'}`
        : 'Ny tid lagret',
    );
    onSessionUpdated();
    backToList();
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-lg" showCloseButton={view === 'list'}>
        <ResponsiveDialogHeader
          className={cn(
            // Step 2 reads as a proper header bar: back + title on one line,
            // divider underneath, spanning the full dialog width.
            view === 'reschedule' && '-mx-6 border-b border-border-subtle px-6 pb-4',
          )}
        >
          {view === 'reschedule' ? (
            <div className="flex items-center gap-3">
              <Button
                variant="soft"
                size="icon"
                onClick={backToList}
                aria-label="Tilbake"
                className="-ml-2 shrink-0"
              >
                <ArrowLeft className="size-4" />
              </Button>
              <ResponsiveDialogTitle>
                {editing ? `Endre time – ${dayMonth(editing.session_date)}` : 'Endre time'}
              </ResponsiveDialogTitle>
            </div>
          ) : (
            <ResponsiveDialogTitle>Alle timer</ResponsiveDialogTitle>
          )}
          <ResponsiveDialogDescription className="sr-only">
            {view === 'reschedule'
              ? 'Endre dato og tid for denne timen.'
              : 'Oversikt over kursets timer. Velg en time for å endre dato eller tid.'}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={view}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {view === 'list' && (
              <ul className="max-h-[60vh] space-y-2 overflow-y-auto p-1">
                {ordered.map((s) => {
                  const isPast = s.session_date < today;
                  const isCancelled = s.status === 'cancelled';
                  const dim = isPast || isCancelled;
                  const editDisabled = isPast || isCancelled;
                  const label = `${cap(weekdayLabel(s.session_date))} ${dayMonth(s.session_date)}`;
                  // Title/time dim together (row-level opacity), but the "Avlyst"
                  // badge sits outside that wrapper so it stays full-opacity and
                  // reads clearly (the pattern SessionRow gets right on Oversikt).
                  const cell = (
                    <>
                      <div className={cn('min-w-0', dim && 'opacity-60')}>
                        <p
                          className={cn(
                            'truncate text-base font-medium text-foreground',
                            isCancelled && 'line-through',
                          )}
                        >
                          {label}
                        </p>
                        {s.start_time && (
                          <p
                            className={cn(
                              'mt-0.5 text-sm text-foreground tabular-nums',
                              isCancelled && 'line-through',
                            )}
                          >
                            {timeRange(s)}
                          </p>
                        )}
                      </div>
                      {isCancelled && (
                        <Badge variant="warning" shape="pill" size="sm" className="shrink-0">
                          Avlyst
                        </Badge>
                      )}
                      {!editDisabled && (
                        <ChevronRight className="size-5 shrink-0 self-center text-foreground-subtle transition-transform group-hover:translate-x-0.5" />
                      )}
                    </>
                  );
                  return (
                    <li key={s.id}>
                      {editDisabled ? (
                        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3">
                          {cell}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startReschedule(s)}
                          aria-label={`Endre ${label}`}
                          className="group flex w-full items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3 text-left transition-colors hover:bg-hover"
                        >
                          {cell}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {view === 'reschedule' && editing && (
              <>
                {submitError && (
                  <Alert variant="error" size="sm">
                    {submitError}
                  </Alert>
                )}
                <SessionRescheduleForm
                  key={editing.id}
                  session={editing}
                  defaultDurationMinutes={defaultDurationMinutes}
                  submitting={submitting}
                  onCancel={backToList}
                  onSave={submitReschedule}
                />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
