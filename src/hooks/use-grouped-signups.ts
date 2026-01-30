import { useMemo } from 'react';
import type { SignupStatus, PaymentStatus, OfferStatus } from '@/types/database';

// Extended display type with exception tracking
export interface SignupDisplay {
  id: string;
  courseId: string;
  participantName: string;
  participantEmail: string;
  className: string;
  classDate: string;
  classTime: string;
  classDateTime: Date;
  registeredAt: string;
  registeredAtDate: Date;
  status: SignupStatus;
  paymentStatus: PaymentStatus;
  note?: string;
  // Additional fields for exceptions
  waitlistPosition?: number;
  offerStatus?: OfferStatus | null;
  offerExpiresAt?: Date | null;
  // Computed exception type
  exceptionType?: ExceptionType | null;
}

export type ExceptionType = 'payment_failed' | 'offer_expiring' | 'pending_payment';
export type TimeFilter = 'today' | 'this_week' | 'upcoming';
export type ModeFilter = 'active' | 'ended' | 'needs_attention';
export type StatusFilter = 'all' | 'confirmed' | 'waitlist' | 'cancelled';
export type PaymentFilter = 'all' | 'paid' | 'refunded';

export interface SignupGroup {
  key: string;
  courseId: string;
  courseTitle: string;
  classDate: Date;
  classTime: string;
  signups: {
    exceptions: SignupDisplay[];
    confirmed: SignupDisplay[];
    waitlist: SignupDisplay[];
    cancelled: SignupDisplay[];
  };
  counts: {
    confirmed: number;
    waitlist: number;
    cancelled: number;
    exceptions: number;
  };
  hasExceptions: boolean;
}

// Exception priority (lower = higher priority)
const EXCEPTION_PRIORITY: Record<ExceptionType, number> = {
  payment_failed: 1,
  offer_expiring: 2,
  pending_payment: 3,
};

function detectException(signup: SignupDisplay): ExceptionType | null {
  // Payment failed is highest priority
  if (signup.paymentStatus === 'failed') {
    return 'payment_failed';
  }

  // Offer expiring soon (within 24 hours)
  if (signup.offerStatus === 'pending' && signup.offerExpiresAt) {
    const hoursUntilExpiry = (signup.offerExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilExpiry > 0 && hoursUntilExpiry < 24) {
      return 'offer_expiring';
    }
  }

  // Pending payment for confirmed signup
  if (signup.paymentStatus === 'pending' && signup.status === 'confirmed') {
    return 'pending_payment';
  }

  return null;
}

function groupSignups(signups: SignupDisplay[]): SignupGroup[] {
  // Group by course + date
  const groupMap = new Map<string, SignupDisplay[]>();

  for (const signup of signups) {
    // Use courseId + formatted date as key
    const dateKey = signup.classDateTime.toISOString().split('T')[0];
    const key = `${signup.courseId}-${dateKey}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(signup);
  }

  // Transform to SignupGroup with categorized signups
  const groups: SignupGroup[] = [];

  for (const [key, groupSignups] of groupMap) {
    const exceptions: SignupDisplay[] = [];
    const confirmed: SignupDisplay[] = [];
    const waitlist: SignupDisplay[] = [];
    const cancelled: SignupDisplay[] = [];

    for (const signup of groupSignups) {
      // Detect and assign exception type (create new object to avoid mutation)
      const exception = detectException(signup);
      const annotatedSignup = { ...signup, exceptionType: exception };

      // Add to exceptions list if applicable (don't duplicate in other lists)
      if (exception) {
        exceptions.push(annotatedSignup);
      }

      // Categorize by status
      switch (annotatedSignup.status) {
        case 'confirmed':
          if (!exception) confirmed.push(annotatedSignup);
          break;
        case 'waitlist':
          if (!exception) waitlist.push(annotatedSignup);
          break;
        case 'cancelled':
        case 'course_cancelled':
          cancelled.push(annotatedSignup);
          break;
      }
    }

    // Sort exceptions by priority
    exceptions.sort((a, b) => {
      const priorityA = a.exceptionType ? EXCEPTION_PRIORITY[a.exceptionType] : 99;
      const priorityB = b.exceptionType ? EXCEPTION_PRIORITY[b.exceptionType] : 99;
      return priorityA - priorityB;
    });

    // Sort waitlist by position
    waitlist.sort((a, b) => (a.waitlistPosition || 999) - (b.waitlistPosition || 999));

    // Sort confirmed/cancelled by name
    confirmed.sort((a, b) => a.participantName.localeCompare(b.participantName));
    cancelled.sort((a, b) => a.participantName.localeCompare(b.participantName));

    const firstSignup = groupSignups[0];

    groups.push({
      key,
      courseId: firstSignup.courseId,
      courseTitle: firstSignup.className,
      classDate: firstSignup.classDateTime,
      classTime: firstSignup.classTime,
      signups: { exceptions, confirmed, waitlist, cancelled },
      counts: {
        confirmed: groupSignups.filter(s => s.status === 'confirmed').length,
        waitlist: groupSignups.filter(s => s.status === 'waitlist').length,
        cancelled: groupSignups.filter(s => s.status === 'cancelled' || s.status === 'course_cancelled').length,
        exceptions: exceptions.length,
      },
      hasExceptions: exceptions.length > 0,
    });
  }

  // Sort groups by date (ascending for upcoming view)
  groups.sort((a, b) => a.classDate.getTime() - b.classDate.getTime());

  return groups;
}

function filterByTime(signups: SignupDisplay[], filter: TimeFilter | null): SignupDisplay[] {
  if (!filter) return signups;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  // Get end of current week (Sunday)
  const weekEnd = new Date(todayStart);
  const dayOfWeek = weekEnd.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  weekEnd.setDate(weekEnd.getDate() + daysUntilSunday + 1); // +1 to include Sunday

  switch (filter) {
    case 'today':
      return signups.filter(s => s.classDateTime >= todayStart && s.classDateTime < todayEnd);
    case 'this_week':
      return signups.filter(s => s.classDateTime >= todayStart && s.classDateTime < weekEnd);
    case 'upcoming':
      return signups.filter(s => s.classDateTime >= todayStart);
    default:
      return signups;
  }
}

function filterByMode(signups: SignupDisplay[], mode: ModeFilter): SignupDisplay[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (mode) {
    case 'active':
      // Active = upcoming/current sessions, exclude cancelled
      return signups.filter(s =>
        s.classDateTime >= todayStart &&
        s.status !== 'cancelled' &&
        s.status !== 'course_cancelled'
      );
    case 'ended':
      // Ended = cancelled or past sessions
      return signups.filter(s =>
        s.status === 'cancelled' ||
        s.status === 'course_cancelled' ||
        s.classDateTime < todayStart
      );
    case 'needs_attention':
      // Items needing attention (exceptions)
      return signups.filter(s => detectException(s) !== null);
    default:
      return signups;
  }
}

function filterByStatus(signups: SignupDisplay[], status: StatusFilter): SignupDisplay[] {
  switch (status) {
    case 'confirmed':
      return signups.filter(s => s.status === 'confirmed');
    case 'waitlist':
      return signups.filter(s => s.status === 'waitlist');
    case 'cancelled':
      return signups.filter(s => s.status === 'cancelled' || s.status === 'course_cancelled');
    case 'all':
    default:
      return signups;
  }
}

function filterByPayment(signups: SignupDisplay[], payment: PaymentFilter): SignupDisplay[] {
  switch (payment) {
    case 'paid':
      return signups.filter(s => s.paymentStatus === 'paid');
    case 'refunded':
      return signups.filter(s => s.paymentStatus === 'refunded');
    case 'all':
    default:
      return signups;
  }
}

export interface GroupedSignupsOptions {
  modeFilter: ModeFilter;
  timeFilter: TimeFilter | null;
  statusFilter: StatusFilter;
  paymentFilter: PaymentFilter;
  searchQuery: string;
}

export function useGroupedSignups(
  signups: SignupDisplay[],
  options: GroupedSignupsOptions
) {
  const { modeFilter, timeFilter, statusFilter, paymentFilter, searchQuery } = options;

  // Count exceptions before filtering (for badge display)
  const totalExceptions = useMemo(() => {
    return signups.filter(s => detectException(s) !== null).length;
  }, [signups]);

  const filteredSignups = useMemo(() => {
    let result = signups;

    // Apply mode filter first (defines the baseline dataset)
    result = filterByMode(result, modeFilter);

    // Apply time filter (secondary refinement)
    result = filterByTime(result, timeFilter);

    // Apply status filter
    result = filterByStatus(result, statusFilter);

    // Apply payment filter
    result = filterByPayment(result, paymentFilter);

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        s =>
          s.participantName.toLowerCase().includes(query) ||
          s.participantEmail.toLowerCase().includes(query)
      );
    }

    return result;
  }, [signups, modeFilter, timeFilter, statusFilter, paymentFilter, searchQuery]);

  const groups = useMemo(() => groupSignups(filteredSignups), [filteredSignups]);

  // Summary stats for current filtered view
  const stats = useMemo(() => {
    const allExceptions = groups.reduce((sum, g) => sum + g.counts.exceptions, 0);
    const allConfirmed = groups.reduce((sum, g) => sum + g.counts.confirmed, 0);
    const allWaitlist = groups.reduce((sum, g) => sum + g.counts.waitlist, 0);
    const allCancelled = groups.reduce((sum, g) => sum + g.counts.cancelled, 0);
    return {
      exceptions: allExceptions,
      confirmed: allConfirmed,
      waitlist: allWaitlist,
      cancelled: allCancelled,
      groups: groups.length,
      totalExceptions, // Total across all data (for badge)
    };
  }, [groups, totalExceptions]);

  // Check if any filters are applied beyond mode-specific defaults
  // Defaults per mode:
  //   - active: timeFilter = 'upcoming'
  //   - needs_attention: timeFilter = null (Alle)
  //   - ended: timeFilter = null (hidden, not applicable)
  const hasActiveFilters = useMemo(() => {
    // Determine the default time filter for current mode
    const isTimeFilterDefault =
      (modeFilter === 'active' && timeFilter === 'upcoming') ||
      (modeFilter === 'needs_attention' && timeFilter === null) ||
      (modeFilter === 'ended' && timeFilter === null);

    return (
      !isTimeFilterDefault ||
      statusFilter !== 'all' ||
      paymentFilter !== 'all' ||
      searchQuery.trim() !== ''
    );
  }, [modeFilter, timeFilter, statusFilter, paymentFilter, searchQuery]);

  return { groups, filteredSignups, stats, hasActiveFilters };
}

// Exception display config
export const EXCEPTION_CONFIG: Record<ExceptionType, {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  payment_failed: {
    label: 'Betaling feilet',
    bgColor: 'bg-status-error-bg/30',
    textColor: 'text-status-error-text',
    borderColor: 'border-status-error-border',
  },
  offer_expiring: {
    label: 'Tilbud utløper snart',
    bgColor: 'bg-status-waitlist-bg/30',
    textColor: 'text-status-waitlist-text',
    borderColor: 'border-status-waitlist-border',
  },
  pending_payment: {
    label: 'Venter betaling',
    bgColor: 'bg-gray-100/50',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-300',
  },
};
