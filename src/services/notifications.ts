import { supabase, typedFrom } from '@/lib/supabase';
import type { NotificationType } from '@/types/database';

export interface NotificationRow {
  id: string;
  organization_id: string;
  type: NotificationType;
  reference_id: string;
  title: string;
  body: string | null;
  link: string;
  group_key: string | null;
  status: 'active' | 'resolved';
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  read_at: string | null;
}

export async function fetchNotifications(
  organizationId: string,
  userId: string
): Promise<{ data: NotificationRow[]; error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('get_active_notifications', {
    p_org_id: organizationId,
    p_user_id: userId,
  });

  if (error) return { data: [], error };
  return { data: (data as NotificationRow[]) ?? [], error: null };
}

export async function dismissNotification(
  notificationId: string
): Promise<{ error: Error | null }> {
  const { error } = await typedFrom('notifications')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', notificationId);

  return { error: error ?? null };
}

export async function dismissAllNotifications(
  organizationId: string
): Promise<{ error: Error | null }> {
  const { error } = await typedFrom('notifications')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('organization_id', organizationId)
    .eq('status', 'active');

  return { error: error ?? null };
}
