import type {
  ExceptionType,
  SignupDisplay,
  SignupStatus,
  PaymentStatus,
  CourseType,
  TicketAudience,
  TicketKind,
  Signup,
} from '@/types/database';
import type { SignupWithDetails, SignupWithProfile } from '@/services/signups';

// ---------------------------------------------------------------------------
// SignupWithDetails → SignupDisplay projection.
//
// Used by SignupsPage and the dashboard's Recent Activity card to feed the
// shared signup detail drawer with a uniform display row. Keep this lean —
// it runs in the render path of both lists.
// ---------------------------------------------------------------------------

const NB_MONTH_ABBR = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return `${date.getDate()}. ${NB_MONTH_ABBR[date.getMonth()]}`;
}

function extractTime(timeSchedule: string | null): string {
  if (!timeSchedule) return '';
  const match = timeSchedule.match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : '';
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'I dag';
  if (diffDays === 1) return 'I går';
  if (diffDays < 7) return `${diffDays} dager siden`;
  return `${date.getDate()}. ${NB_MONTH_ABBR[date.getMonth()]}`;
}

function detectException(
  status: SignupStatus,
  paymentStatus: PaymentStatus,
): ExceptionType | null {
  if (status === 'cancelled' || status === 'course_cancelled') return null;
  if (paymentStatus === 'failed') return 'payment_failed';
  if (paymentStatus === 'pending' && status === 'confirmed') return 'pending_payment';
  return null;
}

interface ToSignupDisplayOptions {
  /** Map of course_id → next-upcoming session date. Optional — when present
   *  takes priority over the signup's own session_date / course start_date. */
  nextSessionDates?: Record<string, string>;
  /** Today's date as YYYY-MM-DD; defaults to local-today. */
  todayKey?: string;
}

/** Course context needed to project a SignupWithProfile (no course join) into
 *  a SignupDisplay. Use when calling fromSignupWithProfile() — typically on
 *  the course detail page, where the page already knows the course. */
export interface SignupCourseContext {
  id: string;
  title: string;
  courseType?: CourseType | string;
  timeSchedule?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  maxParticipants?: number | null;
  totalWeeks?: number | null;
}

export function toSignupDisplay(
  signup: SignupWithDetails,
  opts?: ToSignupDisplayOptions,
): SignupDisplay {
  const todayStr = opts?.todayKey ?? new Date().toISOString().split('T')[0];
  const courseTitle = signup.course?.title || 'Ukjent kurs';
  const courseId = signup.course?.id || signup.course_id;
  const displayDate =
    signup.course_session?.session_date ||
    opts?.nextSessionDates?.[courseId] ||
    signup.course?.start_date ||
    null;
  const rawTime =
    signup.course_session?.start_time ||
    extractTime(signup.course?.time_schedule || null);
  const displayTime = rawTime ? rawTime.slice(0, 5) : '';

  const courseEndDate = signup.course?.end_date;
  const courseStartDate = signup.course?.start_date;
  const cutoffDate = courseEndDate || courseStartDate;
  const courseEnded = cutoffDate != null && cutoffDate < todayStr;

  const status = signup.status as SignupStatus;
  const paymentStatus = signup.payment_status as PaymentStatus;

  const display: SignupDisplay = {
    id: signup.id,
    courseId,
    participantName: signup.participant_name || signup.profile?.name || 'Ukjent',
    participantEmail: signup.participant_email || signup.profile?.email || '',
    className: courseTitle,
    classDate: formatDate(displayDate),
    classTime: displayTime,
    classDateTime: displayDate ? new Date(displayDate) : new Date(),
    registeredAt: formatRelativeDate(signup.created_at || ''),
    registeredAtDate: new Date(signup.created_at || ''),
    status,
    paymentStatus,
    note: signup.note || undefined,
    amountPaid: signup.amount_paid ?? null,
    dinteroTransactionId: signup.dintero_transaction_id || null,
    sellerId: signup.seller_id,
    courseEnded,
    courseEndDate: courseEndDate ?? courseStartDate ?? null,
    courseCapacity: signup.course?.max_participants ?? null,
    ticketLabel: signup.ticket_label_snapshot,
    ticketKind: signup.ticket_kind_snapshot as TicketKind | undefined,
    ticketAudience: signup.ticket_audience_snapshot as TicketAudience | undefined,
    courseType: signup.course?.course_type as CourseType | undefined,
    courseStartDate: courseStartDate ?? null,
    courseTotalWeeks: signup.course?.total_weeks ?? null,
  };
  display.exceptionType = detectException(status, paymentStatus);
  return display;
}

/**
 * Project a SignupWithProfile (no course join) into a SignupDisplay using
 * a separate course context. Used by CourseDetailPage where the page
 * already knows the course and the participants list is keyed only on
 * profile + signup fields.
 */
export function signupWithProfileToDisplay(
  signup: SignupWithProfile,
  course: SignupCourseContext,
  opts?: ToSignupDisplayOptions,
): SignupDisplay {
  // Reuse the canonical projection by synthesizing a minimal
  // SignupWithDetails that carries the course context through.
  const synthetic: SignupWithDetails = {
    ...(signup as Signup & { profile: SignupWithProfile['profile'] }),
    course: {
      id: course.id,
      title: course.title,
      course_type: (course.courseType as CourseType) ?? 'course-series',
      time_schedule: course.timeSchedule ?? null,
      start_date: course.startDate ?? null,
      end_date: course.endDate ?? null,
      status: 'active',
      max_participants: course.maxParticipants ?? null,
      total_weeks: course.totalWeeks ?? null,
    },
    course_session: null,
  };
  return toSignupDisplay(synthetic, opts);
}
