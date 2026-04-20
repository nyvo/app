import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ErrorState } from '@/components/ui/error-state';

import { pageVariants, pageTransition } from '@/lib/motion';

import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import type { SignupStatus, PaymentStatus, ExceptionType, SignupDisplay } from '@/types/database';
import { SearchInput } from '@/components/ui/search-input';
import { SignupListView, PastSignupsList } from '@/components/teacher/SignupListView';
import { toast } from 'sonner';
import { friendlyError } from '@/lib/error-messages';
import {
  fetchAllSignups,
  teacherCancelSignup,
  sendPaymentLink,
  markPaymentResolved,
  type SignupWithDetails,
} from '@/services/signups';
import type { ParticipantActionHandlers } from '@/components/teacher/ParticipantActionMenu';
import { useAuth } from '@/contexts/AuthContext';
import { typedFrom } from '@/lib/supabase';

// Format date for display
function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const months = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
  return `${date.getDate()}. ${months[date.getMonth()]}`;
}

// Format time from time_schedule
function extractTime(timeSchedule: string | null): string {
  if (!timeSchedule) return '';
  const match = timeSchedule.match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : '';
}

// Format relative date
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'I dag';
  if (diffDays === 1) return 'I går';
  if (diffDays < 7) return `${diffDays} dager siden`;

  const months = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
  return `${date.getDate()}. ${months[date.getMonth()]}`;
}

// Detect payment exception for action menu context
function detectException(signup: SignupDisplay): ExceptionType | null {
  if (signup.paymentStatus === 'failed') return 'payment_failed';
  if (signup.paymentStatus === 'pending' && signup.status === 'confirmed') return 'pending_payment';
  return null;
}

// A signup is actionable ("Til oppfølging") when the teacher needs to do something.
// Resolved states (refunded, participant cancelled) are excluded — they live in
// their natural tab with row badges that carry the signal.
function isFollowup(s: SignupDisplay): boolean {
  if (s.paymentStatus === 'pending' && s.status === 'confirmed') return true;
  if (s.paymentStatus === 'failed') return true;
  if (s.status === 'course_cancelled' && s.paymentStatus !== 'refunded') return true;
  return false;
}

type ViewTab = 'active' | 'followup' | 'past';

export const SignupsPage = () => {
  const { currentOrganization } = useAuth();
  const [signups, setSignups] = useState<SignupWithDetails[]>([]);
  const [nextSessionDates, setNextSessionDates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewTab, setViewTab] = useState<ViewTab>('active');

  // Fetch signups from database
  const loadSignups = useCallback(async () => {
    if (!currentOrganization?.id) return;

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await fetchAllSignups(currentOrganization.id);

    if (fetchError) {
      setError('Kunne ikke laste påmeldinger. Sjekk internettforbindelsen og prøv på nytt.');
      setLoading(false);
      return;
    }

    const signupsData = data || [];
    setSignups(signupsData);

    // Fetch next upcoming session date per course (for display)
    const courseIds = [...new Set(signupsData.map(s => s.course_id).filter(Boolean))];
    if (courseIds.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const { data: sessionsData } = await typedFrom('course_sessions')
        .select('course_id, session_date')
        .in('course_id', courseIds)
        .gte('session_date', today)
        .order('session_date', { ascending: true });

      const nextDates: Record<string, string> = {};
      (sessionsData as { course_id: string; session_date: string }[] | null)?.forEach(s => {
        if (!nextDates[s.course_id]) {
          nextDates[s.course_id] = s.session_date;
        }
      });
      setNextSessionDates(nextDates);
    }

    setLoading(false);
  }, [currentOrganization?.id]);

  // Initial load
  useEffect(() => {
    loadSignups();
  }, [loadSignups]);

  // Transform signups to display format, sorted by newest first
  const displaySignups: SignupDisplay[] = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    const mapped = signups.map(signup => {
      const courseTitle = signup.course?.title || 'Ukjent kurs';
      const courseId = signup.course?.id || signup.course_id;
      const displayDate = signup.class_date
        || nextSessionDates[courseId]
        || signup.course?.start_date
        || null;
      const rawTime = signup.class_time || extractTime(signup.course?.time_schedule || null);
      const displayTime = rawTime ? rawTime.slice(0, 5) : '';

      const courseEndDate = signup.course?.end_date;
      const courseStartDate = signup.course?.start_date;
      const cutoffDate = courseEndDate || courseStartDate;
      const courseEnded = cutoffDate != null && cutoffDate < todayStr;

      const display: SignupDisplay = {
        id: signup.id,
        courseId: signup.course?.id || signup.course_id,
        participantName: signup.participant_name || signup.profile?.name || 'Ukjent',
        participantEmail: signup.participant_email || signup.profile?.email || '',
        className: courseTitle,
        classDate: formatDate(displayDate),
        classTime: displayTime,
        classDateTime: displayDate ? new Date(displayDate) : new Date(),
        registeredAt: formatRelativeDate(signup.created_at || ''),
        registeredAtDate: new Date(signup.created_at || ''),
        status: signup.status as SignupStatus,
        paymentStatus: signup.payment_status as PaymentStatus,
        note: signup.note || undefined,
        amountPaid: signup.amount_paid ?? null,
        stripePaymentIntentId: signup.stripe_payment_intent_id || null,
        receiptUrl: signup.stripe_receipt_url || null,
        organizationId: signup.organization_id,
        courseEnded,
        courseEndDate: courseEndDate ?? courseStartDate ?? null,
        courseCapacity: signup.course?.max_participants ?? null,
      };

      // Annotate with exception type for action menu
      display.exceptionType = detectException(display);

      return display;
    });

    // Sort by newest signup first
    mapped.sort((a, b) => b.registeredAtDate.getTime() - a.registeredAtDate.getTime());

    return mapped;
  }, [signups, nextSessionDates]);

  const followupCount = useMemo(
    () => displaySignups.reduce((n, s) => n + (isFollowup(s) ? 1 : 0), 0),
    [displaySignups],
  );

  const filteredSignups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    let result = displaySignups.filter(s => {
      if (viewTab === 'followup') return isFollowup(s);
      if (viewTab === 'past') return !!s.courseEnded && !isFollowup(s);
      return !s.courseEnded && !isFollowup(s);
    });

    if (q) {
      result = result.filter(s =>
        s.participantName.toLowerCase().includes(q) ||
        s.participantEmail.toLowerCase().includes(q),
      );
    }

    const sorted = [...result];
    sorted.sort((a, b) => {
      if (viewTab === 'followup') {
        return a.registeredAtDate.getTime() - b.registeredAtDate.getTime();
      }
      if (viewTab === 'past') {
        const aEnd = a.courseEndDate || '';
        const bEnd = b.courseEndDate || '';
        const byCourseEnd = bEnd.localeCompare(aEnd);
        if (byCourseEnd !== 0) return byCourseEnd;
        return b.registeredAtDate.getTime() - a.registeredAtDate.getTime();
      }
      return b.registeredAtDate.getTime() - a.registeredAtDate.getTime();
    });
    return sorted;
  }, [displaySignups, viewTab, searchQuery]);

  const clearFilters = () => {
    setViewTab('active');
    setSearchQuery('');
  };

  const hasFilters = viewTab !== 'active' || searchQuery.trim() !== '';

  const actionHandlers: ParticipantActionHandlers = useMemo(() => ({
    onSendPaymentLink: async (signupId: string) => {
      const { error } = await sendPaymentLink(signupId);
      if (!error) {
        toast.success('Betalingslenke sendt');
      } else {
        toast.error(friendlyError(error, 'Kunne ikke sende betalingslenke'));
      }
    },
    onCancelEnrollment: async (signupId: string, refund: boolean) => {
      const { error } = await teacherCancelSignup(signupId, { refund });
      if (!error) {
        toast.success('Deltaker avbestilt');
        loadSignups();
      } else {
        toast.error(friendlyError(error, 'Kunne ikke avbestille deltaker'));
      }
    },
    onMarkResolved: async (signupId: string) => {
      const { error } = await markPaymentResolved(signupId);
      if (!error) {
        toast.success('Markert som betalt');
        loadSignups();
      } else {
        toast.error('Kunne ikke oppdatere status');
      }
    },
  }), [loadSignups]);

  return (
      <div className="flex-1 flex flex-col min-h-full overflow-y-auto bg-background">
        <MobileTeacherHeader title="Påmeldinger" />

        <motion.header
          variants={pageVariants}
          initial="initial"
          animate="animate"
          transition={pageTransition}
          className="shrink-0 px-6 lg:px-8 pt-6 lg:pt-8 pb-0"
        >
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Påmeldinger</h1>
            <p className="text-sm mt-1 text-muted-foreground">Oversikt over deltakere og påmeldinger.</p>
          </div>
        </motion.header>

        <div className="flex-1 px-6 lg:px-8 pb-6 lg:pb-8">
          <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center gap-3 p-3">
              <ToggleGroup
                type="single"
                value={viewTab}
                onValueChange={(v) => { if (v) setViewTab(v as ViewTab); }}
                variant="segmented"
                aria-label="Filtrer påmeldinger"
              >
                <ToggleGroupItem value="active">Påmeldinger</ToggleGroupItem>
                <ToggleGroupItem value="followup">
                  Til oppfølging
                  {followupCount > 0 && (
                    <span aria-hidden className="relative ml-1.5 inline-flex size-1.5 align-middle">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-chart-2 opacity-75 [animation-duration:1.6s]" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-chart-2" />
                    </span>
                  )}
                </ToggleGroupItem>
                <ToggleGroupItem value="past">Fullførte</ToggleGroupItem>
              </ToggleGroup>
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Søk etter navn"
                aria-label="Søk etter deltakere"
                className="w-full md:w-auto md:ml-auto md:max-w-xs"
              />
            </div>

            {error ? (
              <ErrorState
                title="Kunne ikke laste påmeldinger"
                message={error}
                onRetry={loadSignups}
              />
            ) : viewTab === 'past' && !searchQuery && filteredSignups.length > 0 ? (
              <PastSignupsList signups={filteredSignups} actionHandlers={actionHandlers} />
            ) : (
              <SignupListView
                signups={filteredSignups}
                isLoading={loading}
                isEmpty={displaySignups.length === 0}
                hasFilters={hasFilters}
                onClearFilters={clearFilters}
                actionHandlers={actionHandlers}
                viewTab={viewTab}
              />
            )}
          </div>
        </div>
      </div>
  );
};

export default SignupsPage;
