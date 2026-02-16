import React from 'react';
import {
  Calendar,
  MapPin,
  Users,
  ChevronDown,
  ChevronUp,
  Clock,
  Mail,
  Info,
  Image,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from '@/components/ui/accordion';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';

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
  visibleWeeks: number;
  expandedItem: string | undefined;
  hasRealSessions: boolean;
  isMobile: boolean;

  // Session editing (grouped)
  sessionEditHandlers: SessionEditHandlers;

  // Image upload
  isUploadingQuickImage: boolean;
  quickImageInputRef: React.RefObject<HTMLInputElement | null>;

  // Callbacks
  onShowMore: () => void;
  onExpandedItemChange: (id: string | undefined) => void;
  onQuickImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEditTime: () => void;
  onCancelCourse: () => void;
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
  visibleWeeks,
  expandedItem,
  hasRealSessions,
  isMobile,
  sessionEditHandlers,
  isUploadingQuickImage,
  quickImageInputRef,
  onShowMore,
  onExpandedItemChange,
  onQuickImageUpload,
  onEditTime,
  onCancelCourse,
  onNavigateToSettings,
  kursplanRef,
}) => {
  const { sessionEdits, savingSessionId, onSessionEditChange, onSessionEditCancel, onSaveSession } = sessionEditHandlers;
  return (
    <div className="space-y-6">
      {/* Top Row: Enrollment & Logistics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Enrollment Card (8 cols) */}
        <div className="lg:col-span-8 rounded-2xl bg-white p-6 border border-zinc-200">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-text-tertiary" />
              <span className="text-xs font-medium text-text-tertiary">
                Påmelding
              </span>
            </div>
            {/* Enrollment status badge */}
            {course.capacity > 0 && (
              <div className="flex items-center">
                {course.enrolled >= course.capacity ? (
                  <StatusIndicator
                    variant="success"
                    mode="badge"
                    size="sm"
                    label="Fullt"
                  />
                ) : (
                  <span className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-xxs font-medium text-text-secondary">
                    {spotsLeft} {spotsLeft === 1 ? 'plass' : 'plasser'} igjen
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-end gap-3 mb-2">
            <span className="text-2xl font-medium tracking-tight text-text-primary">
              {course.enrolled ?? 0}
            </span>
            <span className="text-sm text-text-secondary mb-0.5">
              av {course.capacity} påmeldte
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-surface-elevated rounded-full h-2 overflow-hidden">
            {course.enrolled > 0 && course.capacity > 0 && (
              <div
                className="bg-primary h-2 rounded-full ios-ease"
                style={{ width: `${Math.min((course.enrolled / course.capacity) * 100, 100)}%` }}
              />
            )}
          </div>
        </div>

        {/* Logistics Card (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl bg-white p-5 border border-zinc-200 flex flex-col justify-center space-y-3">
          <div className="flex items-center gap-2.5">
            <Calendar className="h-4 w-4 text-text-tertiary shrink-0" />
            <div>
              <p className="text-xs font-medium text-text-primary leading-none">
                {formatDateRange(course.startDate, course.endDate) || course.date || 'Ikke angitt'}
              </p>
              {course.date && formatDateRange(course.startDate, course.endDate) && (
                <p className="text-xs text-text-secondary mt-0.5">{course.date}</p>
              )}
            </div>
          </div>
          <div className="h-px bg-zinc-100 w-full" />
          <div className="flex items-center gap-2.5">
            <MapPin className="h-4 w-4 text-text-tertiary shrink-0" />
            <p className="text-xs font-medium text-text-primary leading-none">{course.location}</p>
          </div>
          <div className="h-px bg-zinc-100 w-full" />
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-text-tertiary shrink-0" />
            <p className="text-xs font-medium text-text-primary leading-none">{course.duration}</p>
          </div>
        </div>
      </div>

      {/* Middle Section: Content & Admin Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Column: Description & Course Plan (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Description Card */}
          <div className="rounded-2xl bg-white border border-zinc-200 overflow-hidden">
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
                  className="h-40 bg-surface/30 rounded-2xl border border-zinc-200 flex items-center justify-center group cursor-pointer smooth-transition hover:bg-zinc-50/50"
                  onClick={() => !isUploadingQuickImage && quickImageInputRef.current?.click()}
                >
                  {isUploadingQuickImage ? (
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Spinner size="sm" />
                      <span className="text-xs font-medium">Laster opp...</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-zinc-200 mb-2 group-hover:scale-[1.02] smooth-transition">
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
              <h3 className="text-sm font-medium text-text-primary mb-2">Om timen</h3>
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
                <div className="bg-surface/30 rounded-2xl border border-zinc-200 p-6 flex flex-col items-center justify-center text-center">
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

          {/* Course Plan - Only show for multi-day courses */}
          {isMultiDayCourse && generatedCourseWeeks.length > 0 && (
            <div ref={kursplanRef} className="rounded-2xl bg-white border border-zinc-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center">
                <h3 className="text-sm font-medium text-text-primary">
                  Kursplan ({generatedCourseWeeks.length} {sessionLabelPlural})
                </h3>
                <button onClick={onEditTime} className="cursor-pointer text-sm text-text-secondary hover:text-text-primary font-medium smooth-transition">
                  Rediger
                </button>
              </div>

              <div className="divide-y divide-zinc-100">
                <Accordion type="single" collapsible value={expandedItem} onValueChange={onExpandedItemChange}>
                  {generatedCourseWeeks.slice(0, visibleWeeks).map((week) => (
                    <AccordionItem
                      key={week.id}
                      value={week.id}
                      className="border-0"
                    >
                      <div
                        className="p-4 flex items-center gap-4 hover:bg-zinc-50 smooth-transition group cursor-pointer"
                        onClick={() => onExpandedItemChange(expandedItem === week.id ? undefined : week.id)}
                      >
                        <div
                          className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                            week.isNext
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-white border border-zinc-200 text-text-secondary'
                          }`}
                        >
                          <span
                            className={`text-xs font-medium ${
                              week.isNext ? 'opacity-90' : 'opacity-80'
                            }`}
                          >
                            {sessionLabel}
                          </span>
                          <span
                            className="text-lg leading-none font-medium"
                          >
                            {week.weekNum}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`text-sm font-medium ${week.status === 'completed' ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
                              {week.title}
                            </h4>
                            {week.isNext && (
                              <StatusIndicator
                                variant="success"
                                mode="badge"
                                size="xs"
                                label="Neste time"
                              />
                            )}
                            {week.status === 'completed' && (
                              <StatusIndicator
                                variant="neutral"
                                mode="inline"
                                size="xs"
                                label="Fullført"
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-text-secondary">
                            <span>{week.time}</span>
                            <span className="w-1 h-1 bg-zinc-300 rounded-full" />
                            <span>{week.date}</span>
                          </div>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-text-tertiary group-hover:text-text-secondary smooth-transition ${
                            expandedItem === week.id ? 'rotate-180' : ''
                          }`}
                        />
                      </div>

                      <AccordionContent className="px-4 pb-4 pt-0">
                        <div className="pl-[72px] pt-2 space-y-4">
                          <div className="h-px w-full bg-zinc-100 mb-4"></div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-text-tertiary mb-1.5">
                                Dato
                              </label>
                              <DatePicker
                                value={sessionEdits[week.id]?.date || (week.originalDate ? new Date(week.originalDate) : undefined)}
                                onChange={(date) => {
                                  if (date) {
                                    onSessionEditChange(week.id, 'date', date);
                                  }
                                }}
                                placeholder={week.date}
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-text-tertiary mb-1.5">
                                Tidspunkt
                              </label>
                              <TimePicker
                                value={sessionEdits[week.id]?.time || week.time.split(' - ')[0]}
                                onChange={(time) => onSessionEditChange(week.id, 'time', time)}
                              />
                            </div>
                          </div>

                          <Alert variant="neutral" size="sm" icon={Info}>
                            <p className="text-xs text-text-secondary">Endringer i tid eller sted vil automatisk bli sendt på e-post til alle påmeldte deltakere.</p>
                          </Alert>

                          <div className="flex justify-end gap-2 pt-2">
                            <Button
                              variant="ghost"
                              size="compact"
                              onClick={() => onSessionEditCancel(week.id)}
                              disabled={savingSessionId === week.id}
                            >
                              Avbryt
                            </Button>
                            <Button
                              size="compact"
                              onClick={() => onSaveSession(week.id)}
                              disabled={savingSessionId === week.id || !hasRealSessions || !sessionEdits[week.id]}
                            >
                              {savingSessionId === week.id ? (
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
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                {generatedCourseWeeks.length > (isMobile ? 1 : 3) && (
                  <button
                    onClick={onShowMore}
                    className="flex w-full items-center justify-center gap-2 py-4 text-xs font-medium text-text-secondary hover:bg-zinc-50 hover:text-text-primary smooth-transition"
                  >
                    {visibleWeeks >= generatedCourseWeeks.length ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" />
                        Vis mindre
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" />
                        Vis {Math.min(isMobile ? 2 : 3, generatedCourseWeeks.length - visibleWeeks)} {sessionLabelPlural} til
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Administration (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Admin Card */}
          <div className="rounded-2xl bg-white p-6 border border-zinc-200">
            <h3 className="text-xs font-medium text-text-tertiary mb-4">
              Administrasjon
            </h3>
            <div className="mb-5">
              <span className="text-xs text-text-secondary block mb-1">Pris per deltaker</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-medium text-text-primary tracking-tight">
                  {course.price}
                </span>
                <span className="text-xs font-medium text-text-secondary">NOK</span>
              </div>
            </div>
            <div className="space-y-3">
              <Button
                variant="outline-soft"
                size="compact"
                className="w-full justify-between"
                disabled={course.enrolled === 0}
              >
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Send melding
                </span>
                <span className="text-xs text-text-tertiary">({course.enrolled})</span>
              </Button>
              <Button variant="outline-soft" size="compact" className="w-full" onClick={onEditTime}>
                <Calendar className="h-4 w-4" />
                Endre tidspunkt
              </Button>
              <Button
                variant="outline-soft"
                size="compact"
                className="w-full mt-4 text-destructive hover:bg-red-50 hover:border-red-200"
                onClick={onCancelCourse}
              >
                Avlys kurs
              </Button>
            </div>
          </div>

          {/* Tips Card */}
          <Alert variant="info">
            <div>
              <AlertTitle variant="info">Tips for synlighet</AlertTitle>
              <AlertDescription variant="info">
                Legg til bilde og beskrivelse for å gjøre kurset mer attraktivt.
              </AlertDescription>
            </div>
          </Alert>
        </div>
      </div>
    </div>
  );
};
