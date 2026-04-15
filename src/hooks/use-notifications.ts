import { useState, useCallback, useEffect } from 'react';
import { CreditCard, MessageSquare, UserCheck, Users } from '@/lib/icons';
import type { LucideIcon } from '@/lib/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiTableSubscription } from '@/hooks/use-realtime-subscription';
import {
  fetchNotifications,
  dismissNotification as dismissService,
  dismissAllNotifications as dismissAllService,
  type NotificationRow,
} from '@/services/notifications';
import { logger } from '@/lib/logger';

export type NotificationSeverity = 'danger' | 'warning' | 'success' | 'neutral';

export interface Notification {
  id: string;
  type: NotificationRow['type'];
  title: string;
  body: string | null;
  link: string;
  groupKey: string | null;
  icon: LucideIcon;
  severity: NotificationSeverity;
  createdAt: string;
}

const ICON_MAP: Record<NotificationRow['type'], LucideIcon> = {
  payment_followup: CreditCard,
  unread_message: MessageSquare,
  course_full: UserCheck,
  low_enrollment: Users,
};

const SEVERITY_MAP: Record<NotificationRow['type'], NotificationSeverity> = {
  payment_followup: 'danger',
  low_enrollment: 'warning',
  course_full: 'success',
  unread_message: 'neutral',
};

const SEVERITY_ORDER: Record<NotificationSeverity, number> = {
  danger: 0,
  warning: 1,
  success: 2,
  neutral: 3,
};

export function useNotifications() {
  const { currentOrganization, profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const orgId = currentOrganization?.id;
  const userId = profile?.id;

  const refetch = useCallback(async () => {
    if (!orgId || !userId) return;

    try {
      const { data, error } = await fetchNotifications(orgId, userId);
      if (error) {
        logger.error('Failed to fetch notifications:', error);
        return;
      }

      const mapped = data.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        body: row.body,
        link: row.link,
        groupKey: row.group_key,
        icon: ICON_MAP[row.type] ?? Users,
        severity: SEVERITY_MAP[row.type] ?? 'neutral' as NotificationSeverity,
        createdAt: row.created_at,
      }));

      // Sort: danger first, then warning, success, neutral
      mapped.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

      setNotifications(mapped);
    } catch (err) {
      logger.error('Failed to fetch notifications:', err);
    }
  }, [orgId, userId]);

  // Fetch when org or user changes
  useEffect(() => {
    if (orgId && userId) {
      refetch();
    }
  }, [orgId, userId, refetch]);

  // Real-time: single subscription on notifications table
  useMultiTableSubscription(
    [{ table: 'notifications', filter: `organization_id=eq.${orgId}` }],
    refetch,
    !!orgId,
    orgId
  );

  const dismiss = useCallback(async (notificationId: string) => {
    // Optimistic: remove from list
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    const { error } = await dismissService(notificationId);
    if (error) {
      logger.error('Failed to dismiss notification:', error);
      refetch();
    }
  }, [refetch]);

  const dismissAll = useCallback(async () => {
    if (!orgId) return;
    // Optimistic: clear list
    setNotifications([]);
    const { error } = await dismissAllService(orgId);
    if (error) {
      logger.error('Failed to dismiss all notifications:', error);
      refetch();
    }
  }, [orgId, refetch]);

  return { notifications, unreadCount: notifications.length, dismiss, dismissAll };
}
