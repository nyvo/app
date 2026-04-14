import React, { useState, useMemo } from 'react';
import { nb } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { Spinner } from '@/components/ui/spinner';
import { Alert } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface CourseWeek {
  id: string;
  weekNum: string;
  title: string;
  status: string;
  isNext: boolean;
  date: string;
  time: string;
  originalDate: string;
  originalTime: string;
}

interface SessionEditHandlers {
  sessionEdits: Record<string, { date?: Date; time?: string }>;
  savingSessionId: string | null;
  onSessionEditChange: (weekId: string, field: 'date' | 'time', value: Date | string) => void;
  onSessionEditCancel: (weekId: string) => void;
  onSaveSession: (sessionId: string) => void;
}

interface SessionCalendarProps {
  sessions: CourseWeek[];
  sessionLabel: string;
  sessionLabelPlural: string;
  hasRealSessions: boolean;
  sessionEditHandlers: SessionEditHandlers;
}

export const SessionCalendar: React.FC<SessionCalendarProps> = ({
  sessions,
  sessionLabel,
  sessionLabelPlural,
  hasRealSessions,
  sessionEditHandlers,
}) => {
  const { sessionEdits, savingSessionId, onSessionEditChange, onSessionEditCancel, onSaveSession } = sessionEditHandlers;

  // Format a Date to YYYY-MM-DD in local timezone (avoids UTC shift)
  const toLocalDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Parse a date string as local (not UTC) to avoid timezone day-shift
  const parseLocalDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  // Build a map of date string -> session for quick lookup
  const sessionDateMap = useMemo(() => {
    const map = new Map<string, CourseWeek>();
    for (const session of sessions) {
      if (session.originalDate) {
        const dateKey = session.originalDate.split('T')[0];
        map.set(dateKey, session);
      }
    }
    return map;
  }, [sessions]);

  // All session dates as Date objects for the modifier (parsed as local)
  const sessionDates = useMemo(() => {
    return sessions
      .filter(s => s.originalDate)
      .map(s => parseLocalDate(s.originalDate));
  }, [sessions]);

  // Find the next upcoming session to default-select & default-month
  const nextSession = useMemo(() => sessions.find(s => s.isNext), [sessions]);
  const firstSession = sessions[0];

  // Default month: show the month of next session, or first session
  const defaultMonth = useMemo(() => {
    if (nextSession?.originalDate) return parseLocalDate(nextSession.originalDate);
    if (firstSession?.originalDate) return parseLocalDate(firstSession.originalDate);
    return new Date();
  }, [nextSession, firstSession]);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    nextSession?.originalDate ? parseLocalDate(nextSession.originalDate) : undefined
  );
  // Look up selected session (use local date key to avoid UTC shift)
  const selectedSession = useMemo(() => {
    if (!selectedDate) return null;
    const key = toLocalDateKey(selectedDate);
    return sessionDateMap.get(key) || null;
  }, [selectedDate, sessionDateMap]);

  // Check if a session date is in the past (date-only comparison, local timezone)
  const isSessionPast = (dateStr: string) => {
    const sessionDate = parseLocalDate(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    sessionDate.setHours(0, 0, 0, 0);
    return sessionDate < today;
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-3">
        <h2 className="type-title text-foreground">
          Kursplan ({sessions.length} {sessionLabelPlural})
        </h2>
      </div>

      <div className="rounded-lg bg-background border border-border overflow-hidden">
      {/* Calendar + Detail side-by-side on desktop, stacked on mobile */}
      <div className="p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-stretch lg:gap-6">
          {/* Left: Calendar + Legend */}
          <div className="shrink-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && handleDayClick(date)}
              defaultMonth={defaultMonth}
              locale={nb}
              modifiers={{
                session: sessionDates,
              }}
              classNames={{
                root: "w-full max-w-[350px]",
                months: "relative flex flex-col gap-4",
                month: "flex flex-col gap-6",
                weekdays: "flex justify-between",
                weekday: "type-meta text-muted-foreground w-11 text-center",
                week: "flex justify-between w-full mt-1",
                day: "h-11 w-11 p-0 text-center",
              }}
            />

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="type-meta text-muted-foreground">{sessionLabel}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[3px] bg-primary" />
                <span className="type-meta text-muted-foreground">Valgt</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[3px] border border-border bg-surface-muted" />
                <span className="type-meta text-muted-foreground">I dag</span>
              </div>
            </div>
          </div>

          {/* Right: Session Detail Panel — top-aligned, content-hugging */}
          <div className="flex-1 min-w-0 mt-6 lg:mt-0">
            {selectedSession && (() => {
              const isPast = isSessionPast(selectedSession.originalDate);
              return (
              <div className="rounded-lg border border-border p-6 space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div
                    className={`size-10 rounded-lg flex flex-col items-center justify-center shrink-0 ${
                      selectedSession.isNext
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border text-muted-foreground'
                    }`}
                  >
                    <span className="type-eyebrow opacity-80">{sessionLabel}</span>
                    <span className="type-label leading-none">{selectedSession.weekNum}</span>
                  </div>
                  <h4 className="type-title text-foreground">
                    {isPast ? 'Tidligere økt' : 'Rediger økt'}
                  </h4>
                </div>

                {isPast ? (
                  /* Read-only view for past sessions */
                  <div className="space-y-3">
                    <div>
                      <label className="type-label-sm mb-1.5 block text-foreground">Dato</label>
                      <p className="type-body text-muted-foreground">{selectedSession.date}</p>
                    </div>
                    <div>
                      <label className="type-label-sm mb-1.5 block text-foreground">Tidspunkt</label>
                      <p className="type-body text-muted-foreground">{selectedSession.time}</p>
                    </div>
                    <Alert variant="neutral" size="sm" icon={Info}>
                      <p className="type-meta text-muted-foreground">Tidligere økter kan ikke endres.</p>
                    </Alert>
                  </div>
                ) : (
                  /* Editable view for future sessions */
                  <>
                    <div className="space-y-3">
                      <div>
                        <label className="type-label-sm mb-1.5 block text-foreground">
                          Dato
                        </label>
                        <DatePicker
                          value={sessionEdits[selectedSession.id]?.date || (selectedSession.originalDate ? new Date(selectedSession.originalDate) : undefined)}
                          onChange={(date) => {
                            if (date) {
                              onSessionEditChange(selectedSession.id, 'date', date);
                            }
                          }}
                          placeholder={selectedSession.date}
                        />
                      </div>

                      <div>
                        <label className="type-label-sm mb-1.5 block text-foreground">
                          Tidspunkt
                        </label>
                        <TimePicker
                          value={sessionEdits[selectedSession.id]?.time || selectedSession.time.split(' - ')[0]}
                          onChange={(time) => onSessionEditChange(selectedSession.id, 'time', time)}
                        />
                      </div>
                    </div>

                    <Alert variant="neutral" size="sm" icon={Info}>
                      <p className="type-meta text-muted-foreground">Endring i dato eller tidspunkt sendes på e-post til alle påmeldte deltakere.</p>
                    </Alert>

                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="ghost"
                        size="compact"
                        className="flex-1"
                        onClick={() => onSessionEditCancel(selectedSession.id)}
                        disabled={savingSessionId === selectedSession.id}
                      >
                        Avbryt
                      </Button>
                      <Button
                        size="compact"
                        className="flex-1"
                        onClick={() => onSaveSession(selectedSession.id)}
                        disabled={savingSessionId === selectedSession.id || !hasRealSessions || !sessionEdits[selectedSession.id]}
                      >
                        {savingSessionId === selectedSession.id ? (
                          <>
                            <Spinner size="xs" />
                            Lagrer
                          </>
                        ) : (
                          'Lagre endringer'
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
              );
            })()}

            {/* Empty state — stretches to match calendar height */}
            {!selectedSession && (
              <div className="rounded-lg border border-dashed border-border p-6 h-full flex items-center justify-center">
                <p className="type-meta text-muted-foreground">
                  {selectedDate ? 'Ingen økt på denne datoen' : 'Velg en dato for å se detaljer'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
