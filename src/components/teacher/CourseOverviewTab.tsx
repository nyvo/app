import React from 'react';
import {
  Image,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SessionList } from '@/components/teacher/SessionList';
import { formatKroner } from '@/lib/utils';
import type { SignupStatus } from '@/types/dashboard';

// Format date range for display (e.g., "17. jan – 7. feb 2025")
function formatDateRange(startDate?: string | null, endDate?: string | null): string | null {
  if (!startDate) return null;

  const start = new Date(startDate);

  if (isNaN(start.getTime())) return null;

  const end = endDate ? new Date(endDate) : null;

  if (end && isNaN(end.getTime())) return null;
  if (end && end.getTime() < start.getTime()) return null;

  const formatDay = (date: Date) => date.getDate();
  const formatMonth = (date: Date) => date.toLocaleDateString('nb-NO', { month: 'short' }).replace('.', '');
  const formatYear = (date: Date) => date.getFullYear();

  if (!end) {
    return `${formatDay(start)}. ${formatMonth(start)} ${formatYear(start)}`;
  }

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  const sameDay = sameMonth && start.getDate() === end.getDate();

  if (sameDay) {
    return `${formatDay(start)}. ${formatMonth(start)} ${formatYear(start)}`;
  }

  if (sameMonth) {
    return `${formatDay(start)}. – ${formatDay(end)}. ${formatMonth(end)} ${formatYear(end)}`;
  } else if (sameYear) {
    return `${formatDay(start)}. ${formatMonth(start)} – ${formatDay(end)}. ${formatMonth(end)} ${formatYear(end)}`;
  } else {
    return `${formatDay(start)}. ${formatMonth(start)} ${formatYear(start)} – ${formatDay(end)}. ${formatMonth(end)} ${formatYear(end)}`;
  }
}

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

interface RecentParticipant {
  id: string;
  name: string;
  email: string;
  status: SignupStatus;
}

interface CourseOverviewTabProps {
  course: {
    title: string;
    status: string;
    date: string;
    location: string;
    enrolled: number;
    capacity: number;
    price: number;
    estimatedRevenue: number;
    description: string;
    description2: string;
    level: string;
    duration: string;
    durationMinutes: number;
    courseType: string;
    imageUrl: string | null;
    startDate: string | null;
    endDate: string | null;
    timeSchedule: string;
  };
  organizationSlug?: string;
  spotsLeft: number;

  // Course plan
  isMultiDayCourse: boolean;
  sessionLabel: string;
  sessionLabelPlural: string;
  generatedCourseWeeks: CourseWeek[];
  hasRealSessions: boolean;

  // Session editing (grouped)
  sessionEditHandlers: SessionEditHandlers;

  // Image upload
  isUploadingQuickImage: boolean;
  quickImageInputRef: React.RefObject<HTMLInputElement | null>;

  // Recent participants
  recentParticipants: RecentParticipant[];
  totalParticipantCount: number;

  // Callbacks
  onQuickImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMessageParticipants: () => void;

  kursplanRef: React.RefObject<HTMLDivElement | null>;
}

export const CourseOverviewTab: React.FC<CourseOverviewTabProps> = ({
  course,
  spotsLeft,
  isMultiDayCourse,
  sessionLabel,
  sessionLabelPlural,
  generatedCourseWeeks,
  hasRealSessions,
  sessionEditHandlers,
  isUploadingQuickImage,
  quickImageInputRef,
  onQuickImageUpload,
  onMessageParticipants,
  recentParticipants,
  totalParticipantCount: _totalParticipantCount,
  kursplanRef,
}) => {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <h2 className="type-title text-foreground">Oversikt</h2>
          <p className="type-body-sm text-muted-foreground">De viktigste detaljene om kurset samlet på ett sted.</p>
        </div>
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem] xl:gap-10">
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
              <div>
                <p className="type-meta mb-0.5 text-muted-foreground">Dato</p>
                <p className="type-label text-foreground">
                  {formatDateRange(course.startDate, course.endDate) || course.date || 'Ikke angitt'}
                </p>
              </div>
              <div>
                <p className="type-meta mb-0.5 text-muted-foreground">Tidspunkt</p>
                <p className="type-label text-foreground">
                  {course.timeSchedule || 'Ikke angitt'}
                  {course.durationMinutes > 0 && (
                    <span className="type-body-sm ml-1 text-muted-foreground">({course.durationMinutes} min)</span>
                  )}
                </p>
              </div>
              <div>
                <p className="type-meta mb-0.5 text-muted-foreground">Sted</p>
                <p className="type-label text-foreground">{course.location || 'Ikke angitt'}</p>
              </div>
              <div>
                <p className="type-meta mb-0.5 text-muted-foreground">Pris</p>
                <p className="type-label text-foreground">{formatKroner(course.price)}</p>
              </div>
            </div>

            <div className="min-w-0 xl:pl-10 xl:border-l xl:border-border">
              <p className="type-meta mb-1 text-muted-foreground">Kapasitet</p>
              <p className="type-title mb-2 text-foreground">
                {course.enrolled ?? 0} av {course.capacity} påmeldt
              </p>
              {course.capacity > 0 && (
                course.enrolled >= course.capacity ? (
                  <Badge variant="secondary" className="mb-2 border border-border bg-surface-muted text-foreground">
                    Fullt
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="mb-2 border border-border bg-surface-muted text-foreground">
                    {spotsLeft} {spotsLeft === 1 ? 'plass' : 'plasser'} igjen
                  </Badge>
                )
              )}
            </div>
        </div>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button
              variant="outline-soft"
              size="compact"
              className="justify-start"
              disabled={course.enrolled === 0}
              onClick={onMessageParticipants}
            >
              <Send className="h-3.5 w-3.5" />
              Send melding til påmeldte
            </Button>
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="type-title text-foreground">Om kurset</h2>
            <p className="type-body-sm text-muted-foreground">Dette er innholdet deltakerne ser når de vurderer å melde seg på.</p>
          </div>
        </div>
        <div className="flex flex-col gap-6 lg:flex-row">
          <Card className="overflow-hidden lg:w-56 lg:shrink-0">
            {course.imageUrl ? (
              <div className="aspect-video w-full overflow-hidden lg:aspect-square">
                <img
                  src={course.imageUrl}
                  alt={course.title}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div>
                <input
                  ref={quickImageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onQuickImageUpload}
                  className="hidden"
                />
                <div
                  className="group flex aspect-video w-full cursor-pointer flex-col items-center justify-center border border-dashed border-input bg-surface-muted smooth-transition hover:bg-surface-muted/50 lg:aspect-square"
                  onClick={() => !isUploadingQuickImage && quickImageInputRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); !isUploadingQuickImage && quickImageInputRef.current?.click(); } }}
                  role="button"
                  tabIndex={0}
                  aria-label="Last opp forsidebilde"
                >
                  {isUploadingQuickImage ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Spinner size="sm" />
                      <span className="type-meta text-foreground">Laster opp</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Image className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                      <span className="type-meta text-muted-foreground">Last opp bilde</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>

          <div className="min-w-0 flex-1 space-y-5">
            <div>
              <p className="type-meta mb-1 text-muted-foreground">Kort beskrivelse</p>
              <p className="type-body leading-relaxed text-muted-foreground">
                {course.description || 'Ingen beskrivelse lagt til'}
              </p>
            </div>

            {course.description2 && (
              <div>
                <p className="type-meta mb-1 text-muted-foreground">Utfyllende tekst</p>
                <p className="type-body leading-relaxed text-muted-foreground">
                  {course.description2}
                </p>
              </div>
            )}

            {course.level && (
              <div>
                <p className="type-meta mb-1.5 text-muted-foreground">Målgruppe og nivå</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{course.level}</Badge>
                  {course.courseType === 'kursrekke' && (
                    <Badge variant="secondary">Voksne</Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {isMultiDayCourse && generatedCourseWeeks.length > 0 && (
        <section ref={kursplanRef}>
          <SessionList
            sessions={generatedCourseWeeks}
            sessionLabel={sessionLabel}
            sessionLabelPlural={sessionLabelPlural}
            hasRealSessions={hasRealSessions}
            sessionEditHandlers={sessionEditHandlers}
          />
        </section>
      )}

      {recentParticipants.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="type-title text-foreground">Nylige påmeldinger</h2>
          </div>
          <Card className="overflow-hidden divide-y divide-border">
            {recentParticipants.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-6 py-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted">
                  <span className="type-meta text-muted-foreground">
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="type-label truncate text-foreground">{p.name}</p>
                  <p className="type-meta truncate text-muted-foreground">{p.email}</p>
                </div>
                <StatusBadge status={p.status} size="sm" />
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
};
