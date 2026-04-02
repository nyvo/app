import React from 'react';
import {
  Calendar,
  MapPin,
  Clock,
  Mail,
  Image,
  UserPlus,
  Banknote,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
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
  onAddParticipant: () => void;
  onNavigateToSettings: () => void;
  onNavigateToParticipants: () => void;

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
  onAddParticipant,
  onNavigateToSettings,
  onNavigateToParticipants,
  recentParticipants,
  totalParticipantCount,
  kursplanRef,
}) => {
  const fillPercent = course.capacity > 0
    ? Math.min(Math.round((course.enrolled / course.capacity) * 100), 100)
    : 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── LEFT COLUMN (2 cols) ── */}
        <div className="lg:col-span-2 space-y-8">

          {/* Tid og Sted */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="type-title text-foreground">Tid og sted</h2>
              <Button variant="ghost" size="sm" onClick={onNavigateToSettings} className="type-meta text-muted-foreground h-auto p-0 hover:bg-transparent hover:text-foreground">
                Rediger
              </Button>
            </div>
            <Card className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="type-meta mb-0.5 text-muted-foreground">Dato</p>
                    <p className="type-label text-foreground">
                      {formatDateRange(course.startDate, course.endDate) || course.date || 'Ikke angitt'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="type-meta mb-0.5 text-muted-foreground">Tidspunkt</p>
                    <p className="type-label text-foreground">
                      {course.timeSchedule || 'Ikke angitt'}
                      {course.durationMinutes > 0 && (
                        <span className="type-body-sm ml-1 text-muted-foreground">({course.durationMinutes} min)</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="type-meta mb-0.5 text-muted-foreground">Sted</p>
                    <p className="type-label text-foreground">{course.location || 'Ikke angitt'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Banknote className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="type-meta mb-0.5 text-muted-foreground">Pris</p>
                    <p className="type-label text-foreground">{formatKroner(course.price)}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Om Kurset */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="type-title text-foreground">Om kurset</h2>
              <Button variant="ghost" size="sm" onClick={onNavigateToSettings} className="type-meta text-muted-foreground h-auto p-0 hover:bg-transparent hover:text-foreground">
                Rediger
              </Button>
            </div>
            <Card className="overflow-hidden">
              <div className="flex flex-col gap-6 p-6 sm:flex-row">
                {/* Image / Upload */}
                {course.imageUrl ? (
                  <div className="w-full sm:w-48 aspect-video sm:aspect-square rounded-lg overflow-hidden shrink-0">
                    <img
                      src={course.imageUrl}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="shrink-0">
                    <input
                      ref={quickImageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={onQuickImageUpload}
                      className="hidden"
                    />
                    <div
                      className="group flex aspect-video w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-input bg-surface-muted smooth-transition hover:bg-surface-muted/50 sm:w-48 sm:aspect-square"
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
                          <Image className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                          <span className="type-meta text-muted-foreground">Last opp bilde</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Description + Metadata */}
                <div className="flex-1 min-w-0 space-y-4">
                  {/* Description — always same layout, just different content */}
                  <div>
                    <p className="type-meta mb-1 text-muted-foreground">Kort beskrivelse</p>
                    {course.description ? (
                      <p className="type-body text-muted-foreground leading-relaxed">
                        {course.description}
                      </p>
                    ) : (
                      <p className="type-body text-muted-foreground">
                        Ingen beskrivelse lagt til
                      </p>
                    )}
                  </div>
                  {course.description2 && (
                    <p className="type-body text-muted-foreground leading-relaxed">
                      {course.description2}
                    </p>
                  )}

                  {/* Målgruppe & Nivå */}
                  {course.level && (
                    <div>
                      <p className="type-meta mb-1.5 text-muted-foreground">Målgruppe & Nivå</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          {course.level}
                        </Badge>
                        {course.courseType === 'kursrekke' && (
                          <Badge variant="secondary">
                            Voksne
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Kursplan (Session List) — multi-day courses only */}
          {isMultiDayCourse && generatedCourseWeeks.length > 0 && (
            <div ref={kursplanRef}>
              <SessionList
                sessions={generatedCourseWeeks}
                sessionLabel={sessionLabel}
                sessionLabelPlural={sessionLabelPlural}
                hasRealSessions={hasRealSessions}
                sessionEditHandlers={sessionEditHandlers}
              />
            </div>
          )}

          {/* Nylige Påmeldinger */}
          {recentParticipants.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="type-title text-foreground">Nylige påmeldinger</h2>
                <Button variant="ghost" size="sm" onClick={onNavigateToParticipants} className="type-meta h-auto p-0 text-muted-foreground hover:bg-transparent hover:text-foreground">
                  Se alle {totalParticipantCount}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
              <Card className="overflow-hidden divide-y divide-border">
                {recentParticipants.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-6 py-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted">
                      <span className="type-meta text-muted-foreground">
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="type-label truncate text-foreground">{p.name}</p>
                      <p className="type-meta truncate text-muted-foreground">{p.email}</p>
                    </div>
                    <StatusBadge status={p.status} size="sm" />
                  </div>
                ))}
              </Card>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN (sidebar) ── */}
        <div className="space-y-8">

          {/* Kapasitet */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="type-title text-foreground">Kapasitet</h2>
              {course.capacity > 0 && (
                course.enrolled >= course.capacity ? (
                  <StatusIndicator
                    variant="success"
                    mode="badge"
                    size="sm"
                    label="Fullt"
                  />
                ) : (
                  <Badge variant="secondary" className="bg-status-info-bg text-status-info-text ring-1 ring-inset ring-status-info-border border-0">
                    {spotsLeft} {spotsLeft === 1 ? 'plass' : 'plasser'} igjen
                  </Badge>
                )
              )}
            </div>
            <Card className="p-6">
              <div className="flex items-end gap-1 mb-4">
                <span className="type-display-2 leading-none text-foreground">
                  {course.enrolled ?? 0}
                </span>
                <span className="type-body-sm mb-0.5 text-muted-foreground">
                  / {course.capacity} deltakere
                </span>
              </div>

              {/* Progress bar */}
              <div
                className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
                role="progressbar"
                aria-valuenow={course.enrolled}
                aria-valuemin={0}
                aria-valuemax={course.capacity}
                aria-label={`${course.enrolled} av ${course.capacity} deltakere`}
              >
                {course.enrolled > 0 && course.capacity > 0 && (
                  <div
                    className="bg-primary h-1.5 rounded-full ios-ease"
                    style={{ width: `${fillPercent}%` }}
                  />
                )}
              </div>
              <p className="type-meta text-right text-muted-foreground">{fillPercent}% fylt opp</p>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="type-title mb-3 text-foreground">Handlinger</h2>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="compact"
                className="w-full justify-start"
                onClick={onAddParticipant}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Legg til deltaker
              </Button>
              <Button
                variant="outline"
                size="compact"
                className="w-full justify-start"
                disabled={course.enrolled === 0}
                onClick={onMessageParticipants}
              >
                <Mail className="h-3.5 w-3.5" />
                Send melding til alle
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
