import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ChevronDown } from '@/lib/icons';
import { cn, formatKroner } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/user-avatar';
import { formatSessionDate, formatTimeRange } from '@/utils/dateFormatting';
import { extractTimeFromSchedule } from '@/utils/timeExtraction';
import type { PublicCourseWithDetails } from '@/services/publicCourses';
import type { CourseLevel } from '@/types/database';
import {
  getAvailabilityText,
  getAvailabilityVariant,
  getEventDisplayDate,
  extractFullDayFromSchedule,
} from './courseCardUtils';

interface PublicCourseTableProps {
  courses: PublicCourseWithDetails[];
  studioSlug: string;
  signedUpCourseIds: Set<string>;
}

/**
 * Computes the display date for the DATO column.
 * Course-series: next session date or recurring day name.
 * Events: next session or start date.
 */
function getDisplayDate(course: PublicCourseWithDetails): string {
  const date = getEventDisplayDate(course.next_session, course.start_date);
  if (date) return formatSessionDate(date);

  // Fallback for series without a session date — show day name
  const dayName = extractFullDayFromSchedule(course.time_schedule);
  if (dayName) return dayName;

  return '—';
}

/**
 * Computes a time range string from time_schedule + duration.
 */
function getTimeRange(course: PublicCourseWithDetails): string {
  const timeInfo = extractTimeFromSchedule(course.time_schedule);
  if (!timeInfo) return course.time_schedule || '';

  if (!course.duration) return timeInfo.time;

  const [h, m] = timeInfo.time.split(':').map(Number);
  const endMinutes = h * 60 + m + course.duration;
  const endH = Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;
  const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

  return formatTimeRange(timeInfo.time, endTime);
}

/**
 * Dot color class based on availability variant.
 */
const DOT_COLORS: Record<string, string> = {
  success: 'bg-status-confirmed-text',
  warning: 'bg-status-warning-text',
  neutral: 'bg-muted-foreground',
};

function getStatusInfo(spotsAvailable: number) {
  const variant = getAvailabilityVariant(spotsAvailable);
  return {
    label: getAvailabilityText(spotsAvailable),
    dotColor: DOT_COLORS[variant],
  };
}

function formatPrice(price: number | null): string {
  return formatKroner(price);
}

/**
 * Maps course level to a filled-dot count (out of 5) and a Norwegian label.
 */
const LEVEL_CONFIG: Record<string, { dots: number; label: string }> = {
  alle: { dots: 2, label: 'Alle nivåer' },
  nybegynner: { dots: 1, label: 'Nybegynner' },
  viderekommen: { dots: 4, label: 'Viderekommende' },
};

function getLevelInfo(level: CourseLevel | null): { dots: number; label: string } | null {
  if (!level) return null;
  return LEVEL_CONFIG[level] || null;
}

function DifficultyDots({ level }: { level: CourseLevel | null }) {
  const info = getLevelInfo(level);
  if (!info) return null;

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center gap-1" aria-label={`Nivå: ${info.label}`}>
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className={cn(
              'h-2 w-2 rounded-full transition-colors',
              i < info.dots ? 'bg-muted-foreground' : 'bg-border'
            )}
          />
        ))}
      </div>
      <span className="text-xs font-medium tracking-wide text-muted-foreground">{info.label}</span>
    </div>
  );
}

export function PublicCourseTable({ courses, studioSlug }: PublicCourseTableProps) {
  const navigate = useNavigate();
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Collapse on click outside the table
  useEffect(() => {
    if (!expandedCourseId) return;

    function handleClickOutside(e: MouseEvent) {
      if (tableRef.current && !tableRef.current.contains(e.target as Node)) {
        setExpandedCourseId(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [expandedCourseId]);

  const toggleExpand = (courseId: string, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-action]')) return;
    setExpandedCourseId(prev => prev === courseId ? null : courseId);
  };

  return (
    <div className="overflow-hidden" ref={tableRef}>
      {/* Desktop table */}
      <div className="hidden md:block">
        {/* Rows */}
        {courses.map((course) => {
          const isFull = course.spots_available === 0;
          const status = getStatusInfo(course.spots_available);
          const isExpanded = expandedCourseId === course.id;

          return (
            <div
              key={course.id}
              className={cn(
                "smooth-transition",
                isExpanded
                  ? "rounded-lg border border-border bg-background/60 my-2"
                  : "border-b border-border last:border-b-0"
              )}
            >
              {/* Row */}
              <div
                className={cn(
                  "group flex items-center gap-4 px-6 py-6 smooth-transition cursor-pointer",
                  isFull ? "opacity-40" : "hover:bg-muted/30",
                  isExpanded && "bg-muted/30"
                )}
                onClick={(e) => toggleExpand(course.id, e)}
                role="row"
                aria-label={`${course.title}, ${getDisplayDate(course)}`}
                aria-expanded={isExpanded}
              >
                {/* Chevron */}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
                    isExpanded && "rotate-180"
                  )}
                />

                {/* Left group: Class name + meta line */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">
                    {course.title}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs font-medium tracking-wide text-muted-foreground">
                      {getDisplayDate(course)} · {getTimeRange(course)}
                    </span>
                    {!isFull && (
                      <span className="text-xs font-medium tracking-wide flex items-center gap-1.5 text-muted-foreground">
                        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', status.dotColor)} />
                        {status.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right group: Price/Full + CTA */}
                <div className="flex items-center gap-4 shrink-0" data-action>
                  {isFull ? (
                    <span className="text-xs font-medium tracking-wide text-foreground">Fullt</span>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-foreground">
                        {formatPrice(course.price)}
                      </span>
                      <Button
                        variant="outline-soft"
                        size="compact"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/studio/${studioSlug}/${course.id}`);
                        }}
                      >
                        Meld deg på
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Expandable preview panel */}
              <div
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
                  isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
                aria-hidden={!isExpanded}
              >
                <div className="overflow-hidden">
                  <DesktopPreview course={course} studioSlug={studioSlug} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile view — stacked rows */}
      <div className="md:hidden">
        {courses.map((course) => {
          const isFull = course.spots_available === 0;
          const status = getStatusInfo(course.spots_available);
          const isExpanded = expandedCourseId === course.id;

          return (
            <div
              key={course.id}
              className={cn(
                "smooth-transition",
                isExpanded
                  ? "rounded-lg border border-border bg-background/60 my-2"
                  : "border-b border-border last:border-b-0"
              )}
            >
              {/* Row */}
              <div
                className={cn(
                  "group flex items-center gap-3 px-4 py-6 smooth-transition cursor-pointer",
                  isFull ? "opacity-40" : "hover:bg-muted/30",
                  isExpanded && "bg-muted/30"
                )}
                onClick={(e) => toggleExpand(course.id, e)}
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium truncate text-foreground">
                    {course.title}
                  </p>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground">
                    {getDisplayDate(course)} · {getTimeRange(course)}
                  </p>
                  <div className="flex items-center gap-3">
                    {!isFull && (
                      <span className="text-xs font-medium tracking-wide flex items-center gap-1.5 text-muted-foreground">
                        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', status.dotColor)} />
                        {status.label}
                      </span>
                    )}
                    {!isFull && (
                      <span className="text-xs font-medium tracking-wide text-muted-foreground">
                        {formatPrice(course.price)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2" data-action>
                  {isFull ? (
                    <span className="text-xs font-medium tracking-wide text-foreground">Fullt</span>
                  ) : (
                    <Button
                      variant="outline-soft"
                      size="compact"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/studio/${studioSlug}/${course.id}`);
                      }}
                    >
                      Meld deg på
                    </Button>
                  )}
                </div>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200",
                    isExpanded && "rotate-180"
                  )}
                />
              </div>

              {/* Mobile expandable preview */}
              <div
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
                  isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
                aria-hidden={!isExpanded}
              >
                <div className="overflow-hidden">
                  <MobilePreview course={course} studioSlug={studioSlug} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Preview sub-components ─── */

interface PreviewProps {
  course: PublicCourseWithDetails;
  studioSlug: string;
}

function DesktopPreview({ course }: PreviewProps) {
  const hasDescription = !!course.description;
  const hasLevel = !!getLevelInfo(course.level);
  const hasInstructor = !!course.instructor?.name;
  const hasLocation = !!course.location;
  const hasContent = hasDescription || hasLevel || hasInstructor || hasLocation;

  if (!hasContent) {
    return (
      <div className="px-6 pb-6 pt-1">
        <span className="text-sm text-muted-foreground">Ingen tilleggsinformasjon</span>
      </div>
    );
  }

  return (
    <div className="px-6 pb-6 pt-1 space-y-3">
      {/* Description */}
      {hasDescription && (
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {course.description}
        </p>
      )}

      {/* Difficulty level + Instructor + Location */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {hasLevel && <DifficultyDots level={course.level} />}
        {hasInstructor && (
          <div className="flex items-center gap-2">
            <UserAvatar
              name={course.instructor!.name!}
              src={course.instructor!.avatar_url}
              size="xxs"
            />
            <span className="text-xs font-medium tracking-wide text-muted-foreground">
              {course.instructor!.name}
            </span>
          </div>
        )}
        {hasLocation && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium tracking-wide text-muted-foreground">
              {course.location}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function MobilePreview({ course }: PreviewProps) {
  const hasDescription = !!course.description;
  const hasLevel = !!getLevelInfo(course.level);
  const hasInstructor = !!course.instructor?.name;
  const hasLocation = !!course.location;

  return (
    <div className="px-4 pb-4 space-y-3">
      {hasDescription && (
        <p className="text-xs font-medium tracking-wide text-muted-foreground leading-relaxed line-clamp-3">
          {course.description}
        </p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {hasLevel && <DifficultyDots level={course.level} />}
        {hasInstructor && (
          <div className="flex items-center gap-1.5">
            <UserAvatar
              name={course.instructor!.name!}
              src={course.instructor!.avatar_url}
              size="xxs"
            />
            <span className="text-xs font-medium tracking-wide text-muted-foreground">
              {course.instructor!.name}
            </span>
          </div>
        )}
        {hasLocation && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium tracking-wide text-muted-foreground">
              {course.location}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
