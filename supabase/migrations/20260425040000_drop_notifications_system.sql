-- ============================================================================
-- Drop the in-app notifications system (2026-04-25)
--
-- The bell-icon dropdown that surfaced notifications has been retired. Updates
-- now live on the dashboard's RecentActivityCard. This migration drops every
-- DB object that backed the dropdown:
--
--   - tables: notifications, notification_reads
--   - triggers on signups + messages that wrote into notifications
--   - trigger functions (trg_signup_notification, trg_message_notification)
--   - RPCs: get_active_notifications, upsert_notification, resolve_notification,
--           check_low_enrollment_notifications
--
-- Email-notification PREFERENCES (organizations.settings.notifications JSON
-- field for newSignups / cancellations / messages / marketing) are a separate
-- concept and untouched by this migration.
-- ============================================================================

-- 1. Drop triggers BEFORE their functions (avoids dependency errors).
DROP TRIGGER IF EXISTS trg_signups_notification ON public.signups;
DROP TRIGGER IF EXISTS trg_messages_notification ON public.messages;

-- 2. Drop trigger functions.
DROP FUNCTION IF EXISTS public.trg_signup_notification();
DROP FUNCTION IF EXISTS public.trg_message_notification();

-- 3. Drop RPCs that read/write the notifications table.
DROP FUNCTION IF EXISTS public.get_active_notifications(uuid, uuid);
DROP FUNCTION IF EXISTS public.upsert_notification(uuid, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.resolve_notification(uuid, text, text);
DROP FUNCTION IF EXISTS public.check_low_enrollment_notifications();

-- 4. Drop tables. CASCADE clears policies, indexes, and the FK from
--    notification_reads → notifications.
DROP TABLE IF EXISTS public.notification_reads CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
