import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft } from '@/lib/icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DateBadge } from '@/components/ui/date-badge';
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
}

type View = 'list' | 'reschedule';

const WEEKDAYS_LONG = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'] as const;

function formatNorwegianDate(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return new Intl.DateTimeFormat('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d);
}

function weekdayLabel(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return WEEKDAYS_LONG[d.getDay()];
}

function shortTime(time: string | null | undefined): string {
  if (!time) return '';
  return time.slice(0, 5);
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function SessionsModal({
  open,
  onOpenChange,
  sessions,
  defaultDurationMinutes,
  onSessionUpdated,
}: SessionsModalProps) {
  const [view, setView] = useState<View>('list');
  const [editing, setEditing] = useState<CourseSession | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset to list view whenever the modal opens
  useEffect(() => {
    if (open) setView('list');
  }, [open]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const ordered = useMemo(
    () => sessions.slice().sort((a, b) => a.session_date.localeCompare(b.session_date)),
    [sessions],
  );

  function startReschedule(session: CourseSession) {
    setEditing(session);
    setNewDate(session.session_date);
    setNewStart(shortTime(session.start_time));
    setNewEnd(shortTime(session.end_time));
    setView('reschedule');
  }

  function backToList() {
    setView('list');
    setEditing(null);
  }

  async function submitReschedule() {
    if (!editing) return;
    setSubmitting(true);
    const { data, error } = await rescheduleCourseSession({
      sessionId: editing.id,
      newDate,
      newStartTime: newStart,
      newEndTime: newEnd || undefined,
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
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <div className="flex items-center gap-2">
            {view !== 'list' && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={backToList}
                aria-label="Tilbake"
                className="-ml-2"
              >
                <ArrowLeft className="size-4" />
              </Button>
            )}
            <DialogTitle>{view === 'list' ? 'Kursplan' : 'Endre tid'}</DialogTitle>
          </div>
        </DialogHeader>

        {view === 'list' && (
          <ul className="max-h-[60vh] overflow-y-auto divide-y divide-border-subtle">
            {ordered.map((s) => {
              const isPast = s.session_date < today;
              const isCancelled = s.status === 'cancelled';
              const dim = isPast || isCancelled;
              const editDisabled = isPast || isCancelled;
              return (
                <li
                  key={s.id}
                  className={cn(
                    'flex items-center gap-3 px-1 py-3',
                    dim && 'opacity-60',
                  )}
                >
                  <DateBadge dateStr={s.session_date} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-base font-medium text-foreground capitalize truncate',
                        isCancelled && 'line-through text-foreground-muted',
                      )}
                    >
                      {weekdayLabel(s.session_date)}
                    </p>
                    <div
                      className={cn(
                        'mt-0.5 flex items-center gap-2 text-base text-foreground-muted tabular-nums',
                        isCancelled && 'line-through',
                      )}
                    >
                      {s.start_time && <span>kl. {shortTime(s.start_time)}</span>}
                      {isCancelled && (
                        <Badge variant="warning" shape="pill" size="sm">
                          Avlyst
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startReschedule(s)}
                    disabled={editDisabled}
                    className="shrink-0"
                  >
                    Endre
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        {view === 'reschedule' && editing && (
          <div className="space-y-4">
            <p className="text-sm text-foreground-muted">
              {formatNorwegianDate(editing.session_date)} · kl.{' '}
              {shortTime(editing.start_time)}
            </p>

            <div className="space-y-1.5">
              <label
                htmlFor="reschedule-date"
                className="text-sm font-medium text-foreground"
              >
                Dato
              </label>
              <Input
                id="reschedule-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="reschedule-start"
                  className="text-sm font-medium text-foreground"
                >
                  Starter
                </label>
                <Input
                  id="reschedule-start"
                  type="time"
                  value={newStart}
                  onChange={(e) => {
                    setNewStart(e.target.value);
                    // If the user hasn't explicitly set an end time yet,
                    // keep it in sync with the new start + course duration.
                    if (!newEnd && defaultDurationMinutes > 0) {
                      setNewEnd(addMinutes(e.target.value, defaultDurationMinutes));
                    }
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="reschedule-end"
                  className="text-sm font-medium text-foreground"
                >
                  Slutter
                </label>
                <Input
                  id="reschedule-end"
                  type="time"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                />
              </div>
            </div>

            <p className="text-sm text-foreground-muted">
              Påmeldte får automatisk beskjed om den nye tiden.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline-soft" size="sm" onClick={backToList} disabled={submitting}>
                Avbryt
              </Button>
              <Button
                size="sm"
                onClick={submitReschedule}
                loading={submitting}
                loadingText="Lagrer"
                disabled={!newDate || !newStart}
              >
                Lagre
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
