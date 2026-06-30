import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, ChevronRight } from '@/lib/icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SessionRescheduleForm } from '@/components/teacher/SessionRescheduleForm';
import { cn } from '@/lib/utils';
import { friendlyError } from '@/lib/error-messages';
import { rescheduleCourseSession } from '@/services/courses';
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

const WEEKDAYS_LONG = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'] as const;
const MONTHS_LONG = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember',
] as const;

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
  const [editing, setEditing] = useState<CourseSession | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const ordered = useMemo(
    () => sessions.slice().sort((a, b) => a.session_date.localeCompare(b.session_date)),
    [sessions],
  );

  function startReschedule(session: CourseSession) {
    setEditing(session);
    setView('reschedule');
  }

  function backToList() {
    setView('list');
    setEditing(null);
  }

  async function submitReschedule(args: {
    newDate: string;
    newStartTime: string;
    newEndTime?: string;
  }) {
    if (!editing) return;
    setSubmitting(true);
    const { data, error } = await rescheduleCourseSession({
      sessionId: editing.id,
      ...args,
    });
    setSubmitting(false);
    if (error) {
      toast.error(friendlyError(error, 'Kunne ikke endre tid'));
      return;
    }
    const notified = data?.notified ?? 0;
    toast.success(
      notified > 0
        ? `Ny tid lagret. Vi varslet ${notified} ${notified === 1 ? 'deltaker' : 'deltakere'}.`
        : 'Ny tid lagret.',
    );
    onSessionUpdated();
    backToList();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={view === 'list'}>
        <DialogHeader
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
              <DialogTitle>
                {editing ? `Endre time — ${dayMonth(editing.session_date)}` : 'Endre time'}
              </DialogTitle>
            </div>
          ) : (
            <DialogTitle>Alle timer</DialogTitle>
          )}
        </DialogHeader>

        {view === 'list' && (
          <ul className="max-h-[60vh] space-y-2 overflow-y-auto p-1">
            {ordered.map((s) => {
              const isPast = s.session_date < today;
              const isCancelled = s.status === 'cancelled';
              const dim = isPast || isCancelled;
              const editDisabled = isPast || isCancelled;
              const label = `${cap(weekdayLabel(s.session_date))} ${dayMonth(s.session_date)}`;
              const cell = (
                <>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'truncate text-base font-medium text-foreground',
                        isCancelled && 'text-foreground-muted line-through',
                      )}
                    >
                      {label}
                    </p>
                    <div
                      className={cn(
                        'mt-0.5 flex items-center gap-2 text-sm text-foreground-muted tabular-nums',
                        isCancelled && 'line-through',
                      )}
                    >
                      {s.start_time && <span>{timeRange(s)}</span>}
                      {isCancelled && (
                        <Badge variant="warning" shape="pill" size="sm">
                          Avlyst
                        </Badge>
                      )}
                    </div>
                  </div>
                  {!editDisabled && (
                    <ChevronRight className="size-5 shrink-0 self-center text-foreground-subtle transition-transform group-hover:translate-x-0.5" />
                  )}
                </>
              );
              return (
                <li key={s.id}>
                  {editDisabled ? (
                    <div
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-xl bg-primary-subtle px-4 py-3',
                        dim && 'opacity-60',
                      )}
                    >
                      {cell}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startReschedule(s)}
                      aria-label={`Endre ${label}`}
                      className="group flex w-full items-center justify-between gap-3 rounded-xl bg-primary-subtle px-4 py-3 text-left transition-colors hover:bg-primary-border"
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
          <SessionRescheduleForm
            key={editing.id}
            session={editing}
            defaultDurationMinutes={defaultDurationMinutes}
            submitting={submitting}
            onCancel={backToList}
            onSave={submitReschedule}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
