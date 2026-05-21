import React, { useState } from 'react';
import { MoreHorizontal, Check } from '@/lib/icons';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Info } from '@/lib/icons';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { CourseWeek, SessionEditHandlers } from './session-types';

interface SessionListProps {
  sessions: CourseWeek[];
  sessionLabel: string;
  sessionLabelPlural: string;
  hasRealSessions: boolean;
  sessionEditHandlers: SessionEditHandlers;
}

const WEEKDAYS_LONG = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'] as const;
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const;

function parseDate(dateStr: string): Date | null {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? null : date;
}

function isSessionPast(dateStr: string): boolean {
  const sessionDate = parseDate(dateStr);
  if (!sessionDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  sessionDate.setHours(0, 0, 0, 0);
  return sessionDate < today;
}

function weekdayFromDate(dateStr: string): string {
  const date = parseDate(dateStr);
  return date ? WEEKDAYS_LONG[date.getDay()] : '';
}

/**
 * Small custom date pill matching the mockup — 48×44, month abbreviation
 * stacked on top of the day numeral. Past sessions get the muted fill.
 */
function DatePill({ dateStr, isPast }: { dateStr: string; isPast: boolean }) {
  const date = parseDate(dateStr);
  if (!date) return null;
  const month = MONTHS_SHORT[date.getMonth()];
  const day = date.getDate();
  return (
    <span
      className={cn(
        'inline-flex flex-col items-center justify-center w-12 h-12 rounded-md shrink-0',
        isPast ? 'bg-muted border border-transparent' : 'bg-surface border border-border',
      )}
    >
      <span className="text-sm font-medium text-foreground-muted leading-none lowercase">
        {month}
      </span>
      <span
        className={cn(
          'text-base font-medium tabular-nums leading-none mt-1',
          isPast ? 'text-foreground-muted' : 'text-foreground',
        )}
      >
        {day}
      </span>
    </span>
  );
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  sessionLabel: _sessionLabel,
  sessionLabelPlural: _sessionLabelPlural,
  hasRealSessions,
  sessionEditHandlers,
}) => {
  const { sessionEdits, savingSessionId, onSessionEditChange, onSessionEditCancel, onSaveSession } = sessionEditHandlers;
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const visibleSessions = showAll || sessions.length <= 6 ? sessions : sessions.slice(0, 6);

  const handleEditClick = (sessionId: string) => {
    setEditingSessionId(editingSessionId === sessionId ? null : sessionId);
  };

  const handleCancel = (sessionId: string) => {
    onSessionEditCancel(sessionId);
    setEditingSessionId(null);
  };

  const handleSave = (sessionId: string) => {
    onSaveSession(sessionId);
    setEditingSessionId(null);
  };

  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-medium tracking-tight text-foreground">Kursplan</h2>
          <p className="text-base text-foreground-muted">
            Dette kurset varer i <span className="tabular-nums">{sessions.length}</span> {sessions.length === 1 ? 'uke' : 'uker'}. Du kan endre dato eller tidspunkt under Innstillinger.
          </p>
        </div>
        {sessions.length > 6 && (
          <Button
            type="button"
            variant="plain"
            size="xs"
            onClick={() => setShowAll((current) => !current)}
            className="font-medium"
          >
            {showAll ? 'Vis færre' : `Vis alle ${sessions.length}`}
          </Button>
        )}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="divide-y divide-border">
          {visibleSessions.map((session) => {
            const isPast = isSessionPast(session.originalDate);
            const isEditing = editingSessionId === session.id && !isPast;
            const weekday = weekdayFromDate(session.originalDate);
            const timeRange = session.endTime
              ? `${session.time} – ${session.endTime}`
              : session.time;

            return (
              <div key={session.id}>
                {/* Session row — 4-column grid: pill | label | time | menu/check */}
                <div
                  className={cn(
                    'grid grid-cols-[48px_minmax(0,1fr)_auto_24px] items-center gap-4 px-4 py-3 transition-colors duration-150',
                    isPast ? 'bg-muted' : 'hover:bg-muted',
                  )}
                >
                  <DatePill dateStr={session.originalDate} isPast={isPast} />

                  <div className="min-w-0 flex items-center gap-2">
                    <span
                      className={cn(
                        'text-base font-medium truncate',
                        isPast ? 'text-foreground-muted' : 'text-foreground',
                      )}
                    >
                      {weekday}
                    </span>
                    {!isPast && session.isNext && (
                      <Badge variant="inverted" size="sm" className="shrink-0">
                        Neste
                      </Badge>
                    )}
                  </div>

                  <span
                    className={cn(
                      'text-base tabular-nums text-right',
                      isPast ? 'text-foreground-muted' : 'text-foreground-muted',
                    )}
                  >
                    {timeRange}
                  </span>

                  {/* Past = check icon, active = 3-dot menu */}
                  {isPast ? (
                    <span className="inline-flex items-center justify-center size-4 text-foreground-muted" aria-hidden>
                      <Check className="size-4" strokeWidth={2} />
                    </span>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center size-6 rounded text-foreground-muted hover:text-foreground hover:bg-background outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                          aria-label={`Mer for ${weekday} ${session.date}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditClick(session.id)}>
                          Rediger
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Inline edit panel — appears under the row when editing */}
                {isEditing && (
                  <div className="border-t border-border bg-muted px-4 py-4">
                    <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label id={`session-${session.id}-date-label`} className="text-base font-medium mb-2 block text-foreground">Dato</label>
                          <DatePicker
                            aria-labelledby={`session-${session.id}-date-label`}
                            value={sessionEdits[session.id]?.date || (session.originalDate ? new Date(session.originalDate) : undefined)}
                            onChange={(date) => {
                              if (date) onSessionEditChange(session.id, 'date', date);
                            }}
                            placeholder={session.date}
                          />
                        </div>
                        <div>
                          <label id={`session-${session.id}-time-label`} className="text-base font-medium mb-2 block text-foreground">Tidspunkt</label>
                          <TimePicker
                            aria-labelledby={`session-${session.id}-time-label`}
                            value={sessionEdits[session.id]?.time || session.time.split(' - ')[0]}
                            onChange={(time) => onSessionEditChange(session.id, 'time', time)}
                          />
                        </div>
                      </div>

                      <Alert variant="neutral" size="sm" icon={Info}>
                        <p className="text-sm text-foreground-muted">Endring i dato eller tidspunkt sendes på e-post til alle påmeldte deltakere.</p>
                      </Alert>

                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleCancel(session.id)}
                          disabled={savingSessionId === session.id}
                        >
                          Avbryt
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleSave(session.id)}
                          disabled={!hasRealSessions || !sessionEdits[session.id]}
                          loading={savingSessionId === session.id}
                          loadingText="Lagrer"
                        >
                          Lagre endringer
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
