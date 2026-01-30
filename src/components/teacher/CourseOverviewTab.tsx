import React from 'react';
import {
  Calendar,
  MapPin,
  Users,
  ChevronDown,
  ChevronUp,
  BarChart2,
  Clock,
  Mail,
  Info,
  Image,
  CheckCircle2,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from '@/components/ui/accordion';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';

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
  courseId: string;
  organizationSlug?: string;
  spotsLeft: number;

  // Course plan
  isMultiDayCourse: boolean;
  sessionLabel: string;
  sessionLabelPlural: string;
  generatedCourseWeeks: CourseWeek[];
  visibleWeeks: number;
  expandedItem: string | undefined;
  sessionEdits: Record<string, { date?: Date; time?: string }>;
  savingSessionId: string | null;
  hasRealSessions: boolean;
  isMobile: boolean;
  organizationId?: string;

  // Image upload
  isUploadingQuickImage: boolean;
  quickImageInputRef: React.RefObject<HTMLInputElement | null>;

  // Callbacks
  onShowMore: () => void;
  onExpandedItemChange: (id: string | undefined) => void;
  onSessionEditChange: (weekId: string, field: 'date' | 'time', value: Date | string) => void;
  onSessionEditCancel: (weekId: string) => void;
  onSaveSession: (sessionId: string) => void;
  onQuickImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEditTime: () => void;
  onCancelCourse: () => void;
  onNavigateToSettings: () => void;

  kursplanRef: React.RefObject<HTMLDivElement | null>;
  formatDateRange: (start: string | null, end: string | null) => string | null;
}

export const CourseOverviewTab: React.FC<CourseOverviewTabProps> = ({
  course,
  courseId,
  spotsLeft,
  isMultiDayCourse,
  sessionLabel,
  sessionLabelPlural,
  generatedCourseWeeks,
  visibleWeeks,
  expandedItem,
  sessionEdits,
  savingSessionId,
  hasRealSessions,
  isMobile,
  organizationId,
  isUploadingQuickImage,
  quickImageInputRef,
  onShowMore,
  onExpandedItemChange,
  onSessionEditChange,
  onSessionEditCancel,
  onSaveSession,
  onQuickImageUpload,
  onEditTime,
  onCancelCourse,
  onNavigateToSettings,
  kursplanRef,
  formatDateRange,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Row: Enrollment & Logistics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Enrollment Card (8 cols) */}
        <div className="lg:col-span-8 rounded-3xl bg-white p-6 border border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-text-tertiary" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                Påmelding
              </span>
            </div>
            {spotsLeft > 0 ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-confirmed-bg text-status-confirmed-text border border-status-confirmed-border">
                God kapasitet
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-confirmed-bg text-status-confirmed-text border border-status-confirmed-border">
                <CheckCircle2 className="h-3 w-3" />
                Fullt
              </span>
            )}
          </div>
          <div className="flex items-end gap-3 mb-2">
            <span className="text-2xl font-medium tracking-tight text-text-primary">
              {course.enrolled}
            </span>
            <span className="text-sm text-muted-foreground mb-0.5">
              av {course.capacity} plasser opptatt
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-surface-elevated rounded-full h-2 mb-2">
            <div
              className="bg-gray-900 h-2 rounded-full ios-ease"
              style={{ width: `${Math.max(2, Math.min((course.enrolled / course.capacity) * 100, 100))}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{course.enrolled === 0 ? 'Ingen påmeldte ennå' : `${course.enrolled} påmeldt${course.enrolled > 1 ? 'e' : ''}`}</span>
            <span>{spotsLeft} ledige</span>
          </div>
        </div>

        {/* Logistics Card (4 cols) */}
        <div className="lg:col-span-4 rounded-3xl bg-white p-5 border border-gray-200 flex flex-col justify-center space-y-3">
          <div className="flex items-center gap-2.5">
            <Calendar className="h-4 w-4 text-text-tertiary shrink-0" />
            <div>
              <p className="text-xs font-medium text-text-primary leading-none">
                {formatDateRange(course.startDate, course.endDate) || course.date || 'Ikke angitt'}
              </p>
              {course.date && formatDateRange(course.startDate, course.endDate) && (
                <p className="text-xs text-muted-foreground mt-0.5">{course.date}</p>
              )}
            </div>
          </div>
          <div className="h-px bg-gray-100 w-full" />
          <div className="flex items-center gap-2.5">
            <MapPin className="h-4 w-4 text-text-tertiary shrink-0" />
            <p className="text-xs font-medium text-text-primary leading-none">{course.location}</p>
          </div>
          <div className="h-px bg-gray-100 w-full" />
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
          <div className="rounded-3xl bg-white border border-gray-200 overflow-hidden">
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
              <>
                <input
                  ref={quickImageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onQuickImageUpload}
                  className="hidden"
                />
                <div
                  className="h-48 bg-surface border-b border-gray-100 flex items-center justify-center relative group cursor-pointer ios-ease hover:bg-surface-elevated"
                  onClick={() => !isUploadingQuickImage && quickImageInputRef.current?.click()}
                >
                  {isUploadingQuickImage ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Spinner size="sm" />
                      <span className="text-xs font-medium">Laster opp...</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-gray-200 mb-2 group-hover:scale-105 ios-ease">
                        <Image className="h-4 w-4 text-text-tertiary" />
                      </div>
                      <p className="text-xs font-medium text-text-primary">Legg til forsidebilde</p>
                    </div>
                  )}
                </div>
              </>
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
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-5 flex flex-col items-center justify-center text-center">
                  <div className="bg-white p-2 rounded-lg border border-gray-200 mb-3">
                    <Info className="h-4 w-4 text-text-tertiary" />
                  </div>
                  <p className="text-xs text-text-primary font-medium mb-1">Ingen beskrivelse</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Legg til en beskrivelse for å fortelle deltakerne hva kurset handler om.
                  </p>
                  <Button variant="outline-soft" size="compact" onClick={onNavigateToSettings}>
                    Legg til beskrivelse
                  </Button>
                </div>
              )}

              {/* Metadata Footer */}
              <div className="flex items-center gap-6 mt-6 pt-5 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BarChart2 className="h-3.5 w-3.5 text-text-tertiary" />
                  <span>
                    Nivå: <span className="font-medium text-text-primary">{course.level}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Course Plan - Only show for multi-day courses */}
          {isMultiDayCourse && generatedCourseWeeks.length > 0 && (
            <div ref={kursplanRef} className="rounded-3xl bg-white border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-sm font-medium text-text-primary">
                  Kursplan ({generatedCourseWeeks.length} {sessionLabelPlural})
                </h3>
                <button className="text-sm text-muted-foreground hover:text-text-primary font-medium ios-ease">
                  Rediger
                </button>
              </div>

              <div className="divide-y divide-gray-100">
                <Accordion type="single" collapsible value={expandedItem} onValueChange={onExpandedItemChange}>
                  {generatedCourseWeeks.slice(0, visibleWeeks).map((week) => (
                    <AccordionItem
                      key={week.id}
                      value={week.id}
                      className="border-0"
                    >
                      <div
                        className="p-4 flex items-center gap-4 hover:bg-surface ios-ease group cursor-pointer"
                        onClick={() => onExpandedItemChange(expandedItem === week.id ? undefined : week.id)}
                      >
                        <div
                          className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center shrink-0 ${
                            week.isNext
                              ? 'bg-gray-900 text-white'
                              : 'bg-surface-elevated text-muted-foreground'
                          }`}
                        >
                          <span
                            className={`text-[10px] uppercase font-medium tracking-wider ${
                              week.isNext ? 'opacity-80' : 'opacity-70'
                            }`}
                          >
                            {sessionLabel}
                          </span>
                          <span
                            className={`text-lg leading-none ${
                              week.isNext ? 'font-bold' : 'font-medium'
                            }`}
                          >
                            {week.weekNum}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`text-sm font-medium ${week.status === 'completed' ? 'text-muted-foreground line-through' : 'text-text-primary'}`}>
                              {week.title}
                            </h4>
                            {week.isNext && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-status-confirmed-bg text-status-confirmed-text">
                                Neste time
                              </span>
                            )}
                            {week.status === 'completed' && (
                              <span className="rounded-md bg-surface-elevated px-1.5 py-0.5 text-xxs font-medium text-muted-foreground">
                                Fullført
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{week.time}</span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                            <span>{week.date}</span>
                          </div>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-text-tertiary group-hover:text-muted-foreground ios-ease ${
                            expandedItem === week.id ? 'rotate-180' : ''
                          }`}
                        />
                      </div>

                      <AccordionContent className="px-4 pb-4 pt-0">
                        <div className="pl-[72px] pt-2 space-y-4">
                          <div className="h-px w-full bg-surface-elevated mb-4"></div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">
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
                              <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                                Tidspunkt
                              </label>
                              <TimePicker
                                value={sessionEdits[week.id]?.time || week.time.split(' - ')[0]}
                                onChange={(time) => onSessionEditChange(week.id, 'time', time)}
                                date={sessionEdits[week.id]?.date || (week.originalDate ? new Date(week.originalDate) : undefined)}
                                organizationId={organizationId}
                                duration={course.durationMinutes || 60}
                                excludeCourseId={courseId}
                                placeholder={week.time.split(' - ')[0]}
                              />
                            </div>
                          </div>

                          <div className="flex items-start gap-2 p-3 rounded-lg bg-surface text-xs text-muted-foreground">
                            <Info className="h-4 w-4 shrink-0 mt-0.5 text-text-tertiary" />
                            <p>Endringer i tid eller sted vil automatisk bli sendt på e-post til alle påmeldte deltakere.</p>
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              onClick={() => onSessionEditCancel(week.id)}
                              className="text-xs font-medium text-muted-foreground hover:text-text-primary px-3 py-2 rounded-lg hover:bg-surface-elevated transition-colors"
                              disabled={savingSessionId === week.id}
                            >
                              Avbryt
                            </button>
                            <button
                              onClick={() => onSaveSession(week.id)}
                              disabled={savingSessionId === week.id || !hasRealSessions || !sessionEdits[week.id]}
                              className="rounded-lg bg-text-primary px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-sidebar-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {savingSessionId === week.id ? (
                                <>
                                  <Spinner size="xs" />
                                  Lagrer
                                </>
                              ) : (
                                'Lagre endringer'
                              )}
                            </button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                {generatedCourseWeeks.length > (isMobile ? 1 : 3) && (
                  <button
                    onClick={onShowMore}
                    className="flex w-full items-center justify-center gap-2 py-4 text-xs font-medium text-muted-foreground hover:bg-surface-elevated hover:text-text-primary ios-ease"
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
          <div className="rounded-3xl bg-white p-6 border border-gray-200">
            <h3 className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary mb-4">
              Administrasjon
            </h3>
            <div className="mb-5">
              <span className="text-xs text-muted-foreground block mb-1">Pris per deltaker</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-medium text-text-primary tracking-tight">
                  {course.price}
                </span>
                <span className="text-xs font-medium text-muted-foreground">NOK</span>
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
          <div className="rounded-3xl bg-white border border-gray-200 p-4">
            <div className="flex gap-3">
              <Info className="h-4 w-4 text-text-tertiary shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-medium text-text-primary">Tips for synlighet</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">
                  Legg til bilde og beskrivelse for å gjøre kurset mer attraktivt.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
