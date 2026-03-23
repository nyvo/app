import React from 'react';
import {
  Calendar,
  MapPin,
  Clock,
  Mail,
  Info,
  Image,
  Archive,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { SessionCalendar } from '@/components/teacher/SessionCalendar';
import { formatKroner } from '@/lib/utils';

// Format date range for display (e.g., "17. jan – 7. feb 2025")
function formatDateRange(startDate?: string | null, endDate?: string | null): string | null {
  if (!startDate) return null;

  const start = new Date(startDate);

  // Validate start date
  if (isNaN(start.getTime())) return null;

  const end = endDate ? new Date(endDate) : null;

  // Validate end date if provided
  if (end && isNaN(end.getTime())) return null;

  // Validate end is not before start
  if (end && end.getTime() < start.getTime()) return null;

  const formatDay = (date: Date) => date.getDate();
  const formatMonth = (date: Date) => date.toLocaleDateString('nb-NO', { month: 'short' }).replace('.', '');
  const formatYear = (date: Date) => date.getFullYear();

  if (!end) {
    // Single date - show full format
    return `${formatDay(start)}. ${formatMonth(start)} ${formatYear(start)}`;
  }

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  const sameDay = sameMonth && start.getDate() === end.getDate();

  // Same day - just show single date
  if (sameDay) {
    return `${formatDay(start)}. ${formatMonth(start)} ${formatYear(start)}`;
  }

  if (sameMonth) {
    // Same month: "17. – 28. jan 2025"
    return `${formatDay(start)}. – ${formatDay(end)}. ${formatMonth(end)} ${formatYear(end)}`;
  } else if (sameYear) {
    // Same year: "17. jan – 7. feb 2025"
    return `${formatDay(start)}. ${formatMonth(start)} – ${formatDay(end)}. ${formatMonth(end)} ${formatYear(end)}`;
  } else {
    // Different years: "17. des 2024 – 7. jan 2025"
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

  // Callbacks
  onQuickImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCancelCourse: () => void;
  onMessageParticipants: () => void;
  onNavigateToSettings: () => void;

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
  onCancelCourse,
  onMessageParticipants,
  onNavigateToSettings,
  kursplanRef,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Row: Enrollment & Logistics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Enrollment Card (8 cols) */}
        <div className="lg:col-span-8">
          <h2 className="text-sm font-medium text-text-primary mb-3">
            Påmelding
          </h2>
          <div className="rounded-xl bg-white p-6 border border-zinc-200">
            <div className="flex items-end justify-between gap-2 mb-3 flex-wrap">
              <div className="flex items-end gap-3">
                <span className="text-2xl font-medium tracking-tight text-text-primary">
                  {course.enrolled ?? 0}
                </span>
                <span className="text-sm text-text-secondary mb-0.5">
                  av {course.capacity} påmeldte
                </span>
              </div>
              {/* Enrollment status badge */}
              {course.capacity > 0 && (
                course.enrolled >= course.capacity ? (
                  <StatusIndicator
                    variant="success"
                    mode="badge"
                    size="sm"
                    label="Fullt"
                  />
                ) : (
                  <span className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-xxs font-medium text-text-secondary mb-0.5">
                    {spotsLeft} {spotsLeft === 1 ? 'plass' : 'plasser'} igjen
                  </span>
                )
              )}
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-surface-elevated rounded-full h-2 overflow-hidden" role="progressbar" aria-valuenow={course.enrolled} aria-valuemin={0} aria-valuemax={course.capacity} aria-label={`${course.enrolled} av ${course.capacity} påmeldte`}>
              {course.enrolled > 0 && course.capacity > 0 && (
                <div
                  className="bg-primary h-2 rounded-full ios-ease"
                  style={{ width: `${Math.min((course.enrolled / course.capacity) * 100, 100)}%` }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Logistics Card (4 cols) */}
        <div className="lg:col-span-4">
          <h2 className="text-sm font-medium text-text-primary mb-3">
            Tid og sted
          </h2>
          <div className="rounded-xl bg-white p-6 border border-zinc-200 flex flex-col justify-center space-y-4">
            <div className="flex items-center gap-2.5">
              <Calendar className="h-4 w-4 text-text-tertiary shrink-0" />
              <p className="text-sm text-text-primary leading-none">
                {formatDateRange(course.startDate, course.endDate) || course.date || 'Ikke angitt'}
              </p>
            </div>
            <div className="h-px bg-zinc-100 w-full" />
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-text-tertiary shrink-0" />
              <p className="text-sm text-text-primary leading-none">
                {course.date || `${course.durationMinutes} min`}
                {course.date && ` (${course.durationMinutes} min)`}
              </p>
            </div>
            <div className="h-px bg-zinc-100 w-full" />
            <div className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 text-text-tertiary shrink-0" />
              <p className="text-sm text-text-primary leading-none">{course.location}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Content & Admin Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Column: Description & Course Plan (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Description Card */}
          <div>
            <h2 className="text-sm font-medium text-text-primary mb-3">Om kurset</h2>
            <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
              {/* Course Image */}
              {course.imageUrl ? (
                <div className="h-48 overflow-hidden">
                  <img
                    src={course.imageUrl}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="p-6 pb-0">
                  <input
                    ref={quickImageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={onQuickImageUpload}
                    className="hidden"
                  />
                  <div
                    className="h-40 bg-surface/30 rounded-xl border border-zinc-200 flex items-center justify-center group cursor-pointer smooth-transition hover:bg-zinc-50/50 focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 outline-none"
                    onClick={() => !isUploadingQuickImage && quickImageInputRef.current?.click()}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); !isUploadingQuickImage && quickImageInputRef.current?.click(); } }}
                    role="button"
                    tabIndex={0}
                    aria-label="Last opp forsidebilde"
                  >
                    {isUploadingQuickImage ? (
                      <div className="flex items-center gap-2 text-text-secondary">
                        <Spinner size="sm" />
                        <span className="text-xs font-medium">Laster opp...</span>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-zinc-200 mb-2 smooth-transition">
                          <Image className="h-4 w-4 text-text-tertiary" />
                        </div>
                        <p className="text-xs font-medium text-text-primary">Legg til forsidebilde</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description Content */}
              <div className="p-6">
                {course.description ? (
                  <div className="max-w-lg">
                    <p className="text-sm text-text-secondary leading-relaxed mb-4">
                      {course.description}
                    </p>
                    {course.description2 && (
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {course.description2}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-surface/30 rounded-xl border border-zinc-200 p-6 flex flex-col items-center justify-center text-center">
                    <div className="bg-white p-2 rounded-xl border border-zinc-200 mb-3">
                      <Info className="h-4 w-4 text-text-tertiary" />
                    </div>
                    <p className="text-sm text-text-primary font-medium mb-1">Ingen beskrivelse</p>
                    <p className="text-xs text-text-secondary mb-4">
                      Legg til en beskrivelse for å fortelle deltakerne hva kurset handler om.
                    </p>
                    <Button variant="outline-soft" size="compact" onClick={onNavigateToSettings}>
                      Legg til beskrivelse
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Course Plan Calendar - Only show for multi-day courses */}
          {isMultiDayCourse && generatedCourseWeeks.length > 0 && (
            <div ref={kursplanRef}>
              <SessionCalendar
                sessions={generatedCourseWeeks}
                sessionLabel={sessionLabel}
                sessionLabelPlural={sessionLabelPlural}
                hasRealSessions={hasRealSessions}
                sessionEditHandlers={sessionEditHandlers}
              />
            </div>
          )}
        </div>

        {/* Right Sidebar: Administration (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Admin Card */}
          <div>
            <h2 className="text-sm font-medium text-text-primary mb-3">
              Administrasjon
            </h2>
            <div className="rounded-xl bg-white p-6 border border-zinc-200">
              <div className="mb-5">
                <span className="text-xs text-text-secondary block mb-1">Pris per deltaker</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-medium text-text-primary tracking-tight">
                    {formatKroner(course.price)}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <Button
                  variant="default"
                  size="compact"
                  className="w-full justify-center"
                  disabled={course.enrolled === 0}
                  onClick={onMessageParticipants}
                >
                  <Mail className="h-4 w-4" />
                  Melding til deltakere
                </Button>
                <Button
                  variant="outline"
                  size="compact"
                  className="w-full justify-center text-destructive border-status-error-border hover:bg-status-error-bg"
                  onClick={onCancelCourse}
                >
                  <Archive className="h-4 w-4" />
                  Avlys kurs
                </Button>
              </div>
            </div>
          </div>

          {/* Tips Card — only when image or description is missing */}
          {(!course.imageUrl || !course.description) && (
            <Alert variant="info">
              <div>
                <AlertTitle variant="info">Tips for synlighet</AlertTitle>
                <AlertDescription variant="info">
                  {!course.imageUrl && !course.description
                    ? 'Legg til bilde og beskrivelse så deltakerne vet hva kurset handler om.'
                    : !course.imageUrl
                      ? 'Legg til et forsidebilde så kurset blir lettere å finne.'
                      : 'Legg til en beskrivelse for å fortelle deltakerne hva kurset handler om.'}
                </AlertDescription>
              </div>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
};
