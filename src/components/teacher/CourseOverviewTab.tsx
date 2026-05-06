import React from 'react';
import { Image, ArrowRight } from '@/lib/icons';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from '@/components/ui/card';
import { CourseDetailKpiStrip, type CourseDetailKpis } from '@/components/teacher/CourseDetailKpiStrip';
import { SessionList } from '@/components/teacher/SessionList';
import { cn, formatKroner } from '@/lib/utils';
import { getInitials } from '@/utils/stringUtils';
import type { SignupStatus, PaymentStatus } from '@/types/database';
import type { CourseWeek, SessionEditHandlers } from './session-types';

const AVATAR_TONES = [
  '#6B7280', '#4F6CB0', '#A66B4F', '#5C7E5A',
  '#8B6A8F', '#B07B4F', '#707070', '#6E6E84',
] as const;

function avatarToneFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

interface RecentParticipant {
  id: string;
  name: string;
  email: string;
  status: SignupStatus;
  paymentStatus: PaymentStatus;
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

  // Session editing
  sessionEditHandlers: SessionEditHandlers;

  // Recent participants
  recentParticipants: RecentParticipant[];
  totalParticipantCount: number;

  // KPIs (computed in parent from signups + course data)
  kpis: CourseDetailKpis | null;
  kpisLoading: boolean;

  // Tab navigation — for the "Se alle X" shortcut on Nylige påmeldinger
  onJumpToParticipants?: () => void;

  kursplanRef: React.RefObject<HTMLDivElement | null>;
}

function statusLabel(s: SignupStatus, p: PaymentStatus): { label: string; tone: 'foreground' | 'muted' | 'failed' } {
  if (s === 'cancelled' || s === 'course_cancelled') {
    if (p === 'refunded') return { label: 'Refundert', tone: 'muted' };
    return { label: 'Avbestilt', tone: 'muted' };
  }
  if (p === 'failed') return { label: 'Betaling feilet', tone: 'failed' };
  if (p === 'pending') return { label: 'Venter', tone: 'muted' };
  return { label: 'Påmeldt', tone: 'foreground' };
}

export const CourseOverviewTab: React.FC<CourseOverviewTabProps> = ({
  course,
  isMultiDayCourse,
  sessionLabel,
  sessionLabelPlural,
  generatedCourseWeeks,
  hasRealSessions,
  sessionEditHandlers,
  recentParticipants,
  totalParticipantCount,
  kpis,
  kpisLoading,
  onJumpToParticipants,
  kursplanRef,
}) => {
  return (
    <div className="space-y-5">
      {/* KPI strip — replaces the old "Oversikt" meta-grid card */}
      <CourseDetailKpiStrip kpis={kpis} loading={kpisLoading} />

      {/* Om kurset — eyebrows dropped, lede paragraph emphasized */}
      <Card>
        <CardHeader>
          <CardTitle>Om kurset</CardTitle>
          <CardDescription>Dette er innholdet deltakerne ser når de vurderer å melde seg på.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="overflow-hidden rounded-lg lg:w-56 lg:shrink-0">
              {course.imageUrl ? (
                <div className="aspect-video w-full overflow-hidden lg:aspect-square">
                  <img
                    src={course.imageUrl}
                    alt={course.title}
                    className="h-full w-full object-cover rounded-lg"
                  />
                </div>
              ) : (
                <div className="flex aspect-video w-full flex-col items-center justify-center rounded-lg bg-muted lg:aspect-square">
                  <Image className="mx-auto mb-2 size-5 text-disabled-foreground" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-4">
              {course.description && (
                <p className="text-[15px] leading-[1.55] text-foreground whitespace-pre-wrap">
                  {course.description}
                </p>
              )}
              {course.description2 && (
                <p className="text-sm leading-[1.55] text-muted-foreground whitespace-pre-wrap">
                  {course.description2}
                </p>
              )}
              {(course.level || course.courseType === 'kursrekke') && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {course.level && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-foreground text-[11px] font-medium leading-[1.5]">
                      {course.level}
                    </span>
                  )}
                  {course.courseType === 'kursrekke' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-foreground text-[11px] font-medium leading-[1.5]">
                      Voksne
                    </span>
                  )}
                </div>
              )}
              {!course.description && !course.description2 && (
                <p className="text-sm leading-relaxed text-muted-foreground italic">
                  Ingen beskrivelse lagt til.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kursplan — same SessionList component, rendered when multi-day */}
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

      {/* Nylige påmeldinger — uses the colored-initials pattern from /signups */}
      {recentParticipants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Nylige påmeldinger</CardTitle>
            <CardDescription>De siste fem som meldte seg på dette kurset.</CardDescription>
            {onJumpToParticipants && totalParticipantCount > 5 && (
              <CardAction>
                <button
                  type="button"
                  onClick={onJumpToParticipants}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline decoration-disabled-foreground underline-offset-2"
                >
                  Se alle {totalParticipantCount}
                  <ArrowRight className="size-3.5" strokeWidth={1.75} />
                </button>
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border -my-2">
              {recentParticipants.map((p) => {
                const tone = avatarToneFor(p.name || p.email || '?');
                const { label, tone: pillTone } = statusLabel(p.status, p.paymentStatus);
                return (
                  <div key={p.id} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 py-2.5">
                    <div
                      className="size-8 rounded-full inline-flex items-center justify-center text-white text-[11px] font-semibold tracking-tight"
                      style={{ background: tone }}
                      aria-label={p.name}
                    >
                      {getInitials(p.name || p.email || null)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">{p.name}</p>
                      <p className="text-xs truncate text-muted-foreground">{p.email}</p>
                    </div>
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium leading-[1.5] shrink-0',
                      pillTone === 'failed' && 'bg-foreground text-background',
                      pillTone === 'muted' && 'bg-muted text-muted-foreground',
                      pillTone === 'foreground' && 'bg-muted text-foreground',
                    )}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Estimated revenue moved out of headline — surfaced as quiet meta */}
            {course.estimatedRevenue > 0 && (
              <p className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground tabular-nums">
                Estimerte inntekter for denne kursrekken:{' '}
                <span className="text-foreground font-medium">{formatKroner(course.estimatedRevenue)}</span>
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
