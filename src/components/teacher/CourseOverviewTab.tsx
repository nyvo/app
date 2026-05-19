import React from 'react';
import { Image } from '@/lib/icons';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from '@/components/ui/card';
import { RichTextContent } from '@/components/ui/rich-text-content';
import { SessionList } from '@/components/teacher/SessionList';
import { formatKroner } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/user-avatar';
import { SignupStatusBadge } from '@/components/ui/signup-status-badge';
import { Badge } from '@/components/ui/badge';
import type { SignupStatus, PaymentStatus } from '@/types/database';
import type { CourseWeek, SessionEditHandlers } from './session-types';

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

  // Tab navigation — for the "Se alle X" shortcut on Nylige påmeldinger
  onJumpToParticipants?: () => void;

  kursplanRef: React.RefObject<HTMLDivElement | null>;
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
  onJumpToParticipants,
  kursplanRef,
}) => {
  return (
    <div className="space-y-6">
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
                  <Image className="mx-auto mb-2 size-5 text-foreground-disabled" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-4">
              {course.description && (
                <RichTextContent
                  html={course.description}
                  className="text-base text-foreground"
                />
              )}
              {course.description2 && (
                <RichTextContent
                  html={course.description2}
                  className="text-sm text-foreground-muted"
                />
              )}
              {course.courseType === 'kursrekke' && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="neutral" shape="pill">Voksne</Badge>
                </div>
              )}
              {!course.description && !course.description2 && (
                <p className="text-sm text-foreground-muted italic">
                  Ingen beskrivelse enda.
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
                  className="inline-flex items-center text-sm font-medium text-foreground hover:underline underline-offset-4"
                >
                  Se alle {totalParticipantCount}
                </button>
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border -my-2">
              {recentParticipants.map((p) => (
                <div key={p.id} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 py-3">
                  <UserAvatar name={p.name} email={p.email} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{p.name}</p>
                    <p className="text-xs truncate text-foreground-muted">{p.email}</p>
                  </div>
                  <SignupStatusBadge
                    status={p.status}
                    paymentStatus={p.paymentStatus}
                    className="shrink-0"
                  />
                </div>
              ))}
            </div>
            {/* Estimated revenue moved out of headline — surfaced as quiet meta */}
            {course.estimatedRevenue > 0 && (
              <p className="mt-4 pt-3 border-t border-border text-xs text-foreground-muted tabular-nums">
                Anslått inntekt for kursrekken:{' '}
                <span className="text-foreground font-medium">{formatKroner(course.estimatedRevenue)}</span>
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
