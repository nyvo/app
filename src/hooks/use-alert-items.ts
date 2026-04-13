import { useState, useCallback, useRef, useEffect } from 'react';
import { CreditCard, MessageSquare, UserCheck, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchNearestFullCourse, fetchLowEnrollmentCourses } from '@/services/courses';
import { fetchRecentSignups } from '@/services/signups';
import { fetchRecentConversations } from '@/services/messages';
import { useMultiTableSubscription } from '@/hooks/use-realtime-subscription';
import { logger } from '@/lib/logger';

export interface AlertItem {
  id: string;
  label: string;
  sublabel?: string;
  to: string;
  icon: LucideIcon;
}

export function useAlertItems() {
  const { currentOrganization } = useAuth();
  const [alertItems, setAlertItems] = useState<AlertItem[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const hasLoadedRef = useRef(false);

  const fetchAlerts = useCallback(async () => {
    if (!currentOrganization?.id) return;

    try {
      const [signupsResult, messagesResult, capacityResult, lowEnrollmentResult] = await Promise.all([
        fetchRecentSignups(currentOrganization.id, 50),
        fetchRecentConversations(currentOrganization.id, 50),
        fetchNearestFullCourse(currentOrganization.id),
        fetchLowEnrollmentCourses(currentOrganization.id),
      ]);

      const items: AlertItem[] = [];

      // Match detectSignupException logic: confirmed signups with failed or pending payment
      const paymentFollowUpCount = signupsResult.data?.filter((s) =>
        s.status === 'confirmed' && (s.payment_status === 'failed' || s.payment_status === 'pending')
      ).length ?? 0;

      if (paymentFollowUpCount > 0) {
        items.push({
          id: 'payments',
          label: `${paymentFollowUpCount} ${paymentFollowUpCount === 1 ? 'betaling' : 'betalinger'} trenger oppfølging`,
          sublabel: 'Mislykket eller ventende',
          to: '/teacher/signups',
          icon: CreditCard,
        });
      }

      const unreadMessageCount = messagesResult.data?.filter((c) => (c.unread_count ?? 0) > 0).length ?? 0;

      if (unreadMessageCount > 0) {
        items.push({
          id: 'messages',
          label: `${unreadMessageCount} ${unreadMessageCount === 1 ? 'ulest melding' : 'uleste meldinger'}`,
          to: '/teacher/messages',
          icon: MessageSquare,
        });
      }

      if (capacityResult.data) {
        const { course, attendees, capacity } = capacityResult.data;
        items.push({
          id: 'capacity',
          label: `${course.title} er fullt`,
          sublabel: `${attendees}/${capacity} plasser`,
          to: `/teacher/courses/${course.id}`,
          icon: UserCheck,
        });
      }

      const lowEnrollment = lowEnrollmentResult.data ?? [];
      if (lowEnrollment.length > 0) {
        items.push({
          id: 'enrollment',
          label: `${lowEnrollment.length} kurs med lav påmelding`,
          sublabel: 'Starter innen 7 dager',
          to: lowEnrollment.length === 1
            ? `/teacher/courses/${lowEnrollment[0]?.course.id}`
            : '/teacher/courses',
          icon: Users,
        });
      }

      setAlertItems(items);
    } catch (err) {
      logger.error('Failed to fetch alert items:', err);
    }
  }, [currentOrganization?.id]);

  // Initial fetch
  useEffect(() => {
    if (!hasLoadedRef.current && currentOrganization?.id) {
      hasLoadedRef.current = true;
      fetchAlerts();
    }
  }, [currentOrganization?.id, fetchAlerts]);

  // Real-time updates
  useMultiTableSubscription(
    [
      { table: 'signups', filter: `organization_id=eq.${currentOrganization?.id}` },
      { table: 'courses', filter: `organization_id=eq.${currentOrganization?.id}` },
      { table: 'conversations', filter: `organization_id=eq.${currentOrganization?.id}` },
    ],
    fetchAlerts,
    !!currentOrganization?.id,
    currentOrganization?.id
  );

  const visibleItems = alertItems.filter((item) => !dismissedIds.has(item.id));

  const dismissAll = useCallback(() => {
    setDismissedIds(new Set(alertItems.map((item) => item.id)));
  }, [alertItems]);

  const dismissOne = useCallback((id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  }, []);

  return { alertItems: visibleItems, dismissAll, dismissOne };
}
