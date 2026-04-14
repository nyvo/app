import { useState, useCallback, useEffect, useRef } from 'react';
import { CreditCard, MessageSquare, UserCheck, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiTableSubscription } from '@/hooks/use-realtime-subscription';
import {
  fetchNotifications,
  markAsRead as markAsReadService,
  markAllAsRead as markAllAsReadService,
  type NotificationRow,
} from '@/services/notifications';
import { logger } from '@/lib/logger';

export interface Notification {
  id: string;
  type: NotificationRow['type'];
  title: string;
  body: string | null;
  link: string;
  groupKey: string | null;
  icon: LucideIcon;
  isUnread: boolean;
  createdAt: string;
}

const ICON_MAP: Record<NotificationRow['type'], LucideIcon> = {
  payment_followup: CreditCard,
  unread_message: MessageSquare,
  course_full: UserCheck,
  low_enrollment: Users,
};

export function useNotifications() {
  const { currentOrganization, profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const hasLoadedRef = useRef(false);

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

      setNotifications(
        data.map((row) => ({
          id: row.id,
          type: row.type,
          title: row.title,
          body: row.body,
          link: row.link,
          groupKey: row.group_key,
          icon: ICON_MAP[row.type] ?? Users,
          isUnread: !row.read_at || new Date(row.read_at) < new Date(row.updated_at),
          createdAt: row.created_at,
        }))
      );
    } catch (err) {
      logger.error('Failed to fetch notifications:', err);
    }
  }, [orgId, userId]);

  // Initial fetch
  useEffect(() => {
    if (!hasLoadedRef.current && orgId && userId) {
      hasLoadedRef.current = true;
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

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!userId) return;
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isUnread: false } : n))
    );
    const { error } = await markAsReadService(notificationId, userId);
    if (error) {
      logger.error('Failed to mark notification as read:', error);
      refetch();
    }
  }, [userId, refetch]);

  const markAllAsRead = useCallback(async () => {
    if (!orgId || !userId) return;
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
    const { error } = await markAllAsReadService(orgId, userId);
    if (error) {
      logger.error('Failed to mark all as read:', error);
      refetch();
    }
  }, [orgId, userId, refetch]);

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
