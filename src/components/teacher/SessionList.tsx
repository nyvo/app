import React, { useState } from 'react';
import { ChevronDown } from '@/lib/icons';
import { DateBadge } from '@/components/ui/date-badge';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert } from '@/components/ui/alert';
import { Info } from '@/lib/icons';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { CourseWeek, SessionEditHandlers } from './session-types';

interface SessionListProps {
  sessions: CourseWeek[];
  sessionLabel: string;
  sessionLabelPlural: string;
  hasRealSessions: boolean;
  sessionEditHandlers: SessionEditHandlers;
}

function isSessionPast(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  const sessionDate = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  sessionDate.setHours(0, 0, 0, 0);
  return sessionDate < today;
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
        <div className="space-y-0.5">
          <h2 className="text-base font-medium text-foreground">Kursplan</h2>
          <p className="text-sm text-muted-foreground">
            Dette kurset varer i {sessions.length} {sessions.length === 1 ? 'uke' : 'uker'}. Du kan endre dato eller tidspunkt under Innstillinger.
          </p>
        </div>
        {sessions.length > 6 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAll((current) => !current)}
            className="text-xs font-medium tracking-wide h-auto p-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
          >
            {showAll ? 'Vis færre' : `Vis alle ${sessions.length}`}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAll ? 'rotate-180' : ''}`} />
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="divide-y divide-border">
          {visibleSessions.map((session) => {
            const isPast = isSessionPast(session.originalDate);
            const isEditing = editingSessionId === session.id && !isPast;

            return (
              <div key={session.id}>
                {/* Session row */}
                <div
                  className={`group flex items-center justify-between gap-4 px-6 py-4 smooth-transition ${
                    isPast ? 'bg-muted/30 text-muted-foreground' : 'hover:bg-muted/60'
                  }`}
                >
                  <div className={`flex min-w-0 items-center gap-4 ${isPast ? 'opacity-60' : ''}`}>
                    <DateBadge
                      dateStr={session.originalDate?.split('T')[0]}
                      className={isPast ? 'border-border/70 bg-muted text-muted-foreground' : undefined}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm font-medium ${isPast ? 'text-muted-foreground' : 'text-foreground'}`}>{session.title}</p>
                        {!isPast && session.isNext ? (
                          <Badge variant="secondary" className="border border-border bg-muted text-foreground">
                            Neste
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs font-medium tracking-wide mt-0.5 text-muted-foreground">{session.date} {session.time}</p>
                    </div>
                  </div>
                  {!isPast && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(session.id)}
                      className="text-xs font-medium tracking-wide h-auto px-2 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-transparent hover:text-foreground"
                      aria-label={`Rediger ${session.title}`}
                    >
                      Rediger
                    </Button>
                  )}
                </div>

                {/* Inline edit panel */}
                {isEditing && (
                  <div className="border-t border-border bg-muted/40 px-6 py-4">
                    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="text-xs font-medium mb-1.5 block text-foreground">Dato</label>
                          <DatePicker
                            value={sessionEdits[session.id]?.date || (session.originalDate ? new Date(session.originalDate) : undefined)}
                            onChange={(date) => {
                              if (date) onSessionEditChange(session.id, 'date', date);
                            }}
                            placeholder={session.date}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1.5 block text-foreground">Tidspunkt</label>
                          <TimePicker
                            value={sessionEdits[session.id]?.time || session.time.split(' - ')[0]}
                            onChange={(time) => onSessionEditChange(session.id, 'time', time)}
                          />
                        </div>
                      </div>

                      <Alert variant="neutral" size="sm" icon={Info}>
                        <p className="text-xs font-medium tracking-wide text-muted-foreground">Endring i dato eller tidspunkt sendes på e-post til alle påmeldte deltakere.</p>
                      </Alert>

                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="compact"
                          className="flex-1"
                          onClick={() => handleCancel(session.id)}
                          disabled={savingSessionId === session.id}
                        >
                          Avbryt
                        </Button>
                        <Button
                          size="compact"
                          className="flex-1"
                          onClick={() => handleSave(session.id)}
                          disabled={savingSessionId === session.id || !hasRealSessions || !sessionEdits[session.id]}
                        >
                          {savingSessionId === session.id ? (
                            <>
                              <Spinner size="xs" />
                              Lagrer
                            </>
                          ) : (
                            'Lagre endringer'
                          )}
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
