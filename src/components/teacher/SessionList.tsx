import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { DateBadge } from '@/components/ui/date-badge';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { Button } from '@/components/ui/button';
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
  sessionLabel,
  sessionLabelPlural,
  hasRealSessions,
  sessionEditHandlers,
}) => {
  const { sessionEdits, savingSessionId, onSessionEditChange, onSessionEditCancel, onSaveSession } = sessionEditHandlers;
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

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
      <div className="flex items-center justify-between mb-3">
        <h2 className="type-title text-foreground">Kursplan</h2>
        <span className="type-meta text-muted-foreground">
          {sessions.length} {sessions.length === 1 ? sessionLabel : sessionLabelPlural}
        </span>
      </div>

      <div className="rounded-lg bg-background border border-border overflow-hidden">
        <div className="divide-y divide-border">
          {sessions.map((session) => {
            const isPast = isSessionPast(session.originalDate);
            const isEditing = editingSessionId === session.id && !isPast;

            return (
              <div key={session.id}>
                {/* Session row */}
                <div className="group flex items-center justify-between px-5 py-4 smooth-transition hover:bg-surface-muted">
                  <div className="flex items-center gap-4">
                    <DateBadge dateStr={session.originalDate?.split('T')[0]} />
                    <div>
                      <p className="type-label text-foreground">{session.title}</p>
                      <p className="type-meta mt-0.5 text-muted-foreground">{session.date} {session.time}</p>
                    </div>
                  </div>
                  {!isPast && (
                    <button
                      onClick={() => handleEditClick(session.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground smooth-transition p-1 rounded-md"
                      aria-label={`Rediger ${session.title}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Inline edit panel */}
                {isEditing && (
                  <div className="border-t border-border bg-surface-muted/30 px-5 pb-4 pt-0">
                    <div className="pt-4 space-y-3">
                      <div>
                        <label className="type-label-sm mb-1.5 block text-foreground">Dato</label>
                        <DatePicker
                          value={sessionEdits[session.id]?.date || (session.originalDate ? new Date(session.originalDate) : undefined)}
                          onChange={(date) => {
                            if (date) onSessionEditChange(session.id, 'date', date);
                          }}
                          placeholder={session.date}
                        />
                      </div>
                      <div>
                        <label className="type-label-sm mb-1.5 block text-foreground">Tidspunkt</label>
                        <TimePicker
                          value={sessionEdits[session.id]?.time || session.time.split(' - ')[0]}
                          onChange={(time) => onSessionEditChange(session.id, 'time', time)}
                        />
                      </div>

                      <Alert variant="neutral" size="sm" icon={Info}>
                        <p className="type-meta text-muted-foreground">Endring i dato eller tidspunkt sendes på e-post til alle påmeldte deltakere.</p>
                      </Alert>

                      <div className="flex gap-2 pt-1">
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
      </div>
    </div>
  );
};
