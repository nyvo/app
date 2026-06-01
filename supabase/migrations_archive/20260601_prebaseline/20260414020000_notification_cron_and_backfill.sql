-- ============================================
-- Notification System — Phase 2
-- Low enrollment cron + backfill existing data
-- ============================================

-- ── Low Enrollment Check Function ──

CREATE OR REPLACE FUNCTION check_low_enrollment_notifications()
RETURNS void AS $$
DECLARE
  r RECORD;
BEGIN
  -- Create notifications for qualifying courses
  FOR r IN
    SELECT
      c.id AS course_id,
      c.organization_id,
      c.title,
      c.max_participants,
      COALESCE(COUNT(s.id), 0) AS signup_count
    FROM courses c
    LEFT JOIN signups s ON s.course_id = c.id AND s.status = 'confirmed'
    WHERE c.status IN ('upcoming', 'active')
      AND c.max_participants > 0
      AND c.start_date IS NOT NULL
      AND c.start_date::date >= CURRENT_DATE
      AND c.start_date::date <= CURRENT_DATE + INTERVAL '7 days'
    GROUP BY c.id, c.organization_id, c.title, c.max_participants
    HAVING COALESCE(COUNT(s.id), 0)::float / c.max_participants < 0.4
  LOOP
    PERFORM upsert_notification(
      r.organization_id,
      'low_enrollment',
      r.course_id::text,
      r.title || ' – lav påmelding',
      r.signup_count || '/' || r.max_participants || ' påmeldt',
      '/teacher/courses/' || r.course_id
    );
  END LOOP;

  -- Resolve notifications for courses that no longer qualify
  UPDATE notifications
  SET status = 'resolved', resolved_at = now(), updated_at = now()
  WHERE type = 'low_enrollment'
    AND status = 'active'
    AND reference_id NOT IN (
      SELECT c.id::text
      FROM courses c
      LEFT JOIN signups s ON s.course_id = c.id AND s.status = 'confirmed'
      WHERE c.status IN ('upcoming', 'active')
        AND c.max_participants > 0
        AND c.start_date IS NOT NULL
        AND c.start_date::date >= CURRENT_DATE
        AND c.start_date::date <= CURRENT_DATE + INTERVAL '7 days'
      GROUP BY c.id
      HAVING COALESCE(COUNT(s.id), 0)::float / NULLIF(c.max_participants, 0) < 0.4
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule daily at 06:00 UTC (~08:00 CET)
-- Note: pg_cron must be enabled on the Supabase project (Pro plan+)
-- If pg_cron is not available, call this function from a scheduled Edge Function instead.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'check-low-enrollment',
      '0 6 * * *',
      'SELECT check_low_enrollment_notifications()'
    );
  END IF;
END $$;

-- ── Backfill: Create notifications for existing conditions ──

-- 1. Payment follow-ups
INSERT INTO notifications (organization_id, type, reference_id, title, body, link, group_key)
SELECT
  s.organization_id,
  'payment_followup',
  s.id::text,
  COALESCE(s.participant_name, s.participant_email, 'Ukjent') || ' – betaling trenger oppfølging',
  COALESCE(c.title, 'Ukjent kurs'),
  '/teacher/signups',
  s.course_id::text
FROM signups s
LEFT JOIN courses c ON c.id = s.course_id
WHERE s.status = 'confirmed'
  AND s.payment_status IN ('failed', 'pending')
ON CONFLICT (organization_id, type, reference_id) DO NOTHING;

-- 2. Unread messages
INSERT INTO notifications (organization_id, type, reference_id, title, body, link)
SELECT DISTINCT ON (conv.id)
  conv.organization_id,
  'unread_message',
  conv.id::text,
  'Ny melding',
  NULL,
  '/teacher/messages/' || conv.id
FROM conversations conv
JOIN messages m ON m.conversation_id = conv.id
WHERE m.is_outgoing = false
  AND m.is_read = false
ON CONFLICT (organization_id, type, reference_id) DO NOTHING;

-- 3. Course capacity
INSERT INTO notifications (organization_id, type, reference_id, title, body, link)
SELECT
  c.organization_id,
  'course_full',
  c.id::text,
  c.title || ' er fullt',
  COUNT(s.id) || '/' || c.max_participants || ' plasser',
  '/teacher/courses/' || c.id
FROM courses c
JOIN signups s ON s.course_id = c.id AND s.status = 'confirmed'
WHERE c.max_participants IS NOT NULL
  AND c.max_participants > 0
  AND c.status IN ('upcoming', 'active')
GROUP BY c.id, c.organization_id, c.title, c.max_participants
HAVING COUNT(s.id) >= c.max_participants
ON CONFLICT (organization_id, type, reference_id) DO NOTHING;

-- 4. Low enrollment (run the function once to seed)
SELECT check_low_enrollment_notifications();
