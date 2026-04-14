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

export async function markAsRead(
  notificationId: string,
  userId: string
): Promise<{ error: Error | null }> {
  const { error } = await typedFrom('notification_reads')
    .upsert(
      { notification_id: notificationId, user_id: userId, read_at: new Date().toISOString() },
      { onConflict: 'notification_id,user_id' }
    );

  return { error: error ?? null };
}

export async function markAllAsRead(
  organizationId: string,
  userId: string
): Promise<{ error: Error | null }> {
  const { data: notifications, error: fetchError } = await supabase
    .from('notifications')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('status', 'active');

  if (fetchError || !notifications?.length) return { error: fetchError ?? null };

  const rows = notifications.map((n: { id: string }) => ({
    notification_id: n.id,
    user_id: userId,
    read_at: new Date().toISOString(),
  }));

  const { error } = await typedFrom('notification_reads')
    .upsert(rows, { onConflict: 'notification_id,user_id' });

  return { error: error ?? null };
}
