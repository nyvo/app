-- ============================================
-- Notification System — Phase 1
-- Tables, helper functions, triggers, RLS
-- ============================================

-- ── Tables ──

CREATE TABLE notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type            text NOT NULL,
  reference_id    text NOT NULL,
  title           text NOT NULL,
  body            text,
  link            text NOT NULL,
  group_key       text,
  status          text NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,

  CONSTRAINT uq_notification_dedup UNIQUE (organization_id, type, reference_id),
  CONSTRAINT chk_notification_status CHECK (status IN ('active', 'resolved'))
);

CREATE INDEX idx_notifications_org_active
  ON notifications (organization_id) WHERE status = 'active';

CREATE INDEX idx_notifications_org_type
  ON notifications (organization_id, type);

CREATE TABLE notification_reads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_notification_read UNIQUE (notification_id, user_id)
);

CREATE INDEX idx_notification_reads_user ON notification_reads(user_id);

-- ── Helper Functions ──

-- Upsert: create new or re-activate resolved notification
CREATE OR REPLACE FUNCTION upsert_notification(
  p_org_id       uuid,
  p_type         text,
  p_reference_id text,
  p_title        text,
  p_body         text,
  p_link         text,
  p_group_key    text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO notifications (organization_id, type, reference_id, title, body, link, group_key)
  VALUES (p_org_id, p_type, p_reference_id, p_title, p_body, p_link, p_group_key)
  ON CONFLICT (organization_id, type, reference_id)
  DO UPDATE SET
    status = 'active',
    title = EXCLUDED.title,
    body = EXCLUDED.body,
    link = EXCLUDED.link,
    group_key = EXCLUDED.group_key,
    updated_at = now(),
    resolved_at = NULL
  WHERE notifications.status = 'resolved';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Resolve: mark notification as resolved
CREATE OR REPLACE FUNCTION resolve_notification(
  p_org_id       uuid,
  p_type         text,
  p_reference_id text
)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET status = 'resolved', resolved_at = now(), updated_at = now()
  WHERE organization_id = p_org_id
    AND type = p_type
    AND reference_id = p_reference_id
    AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Trigger Functions ──

-- Signup trigger: payment follow-ups + course capacity
CREATE OR REPLACE FUNCTION trg_signup_notification()
RETURNS trigger AS $$
DECLARE
  v_course_title text;
  v_participant text;
  v_confirmed_count int;
  v_max_participants int;
BEGIN
  -- Payment follow-up
  IF NEW.status = 'confirmed' AND NEW.payment_status IN ('failed', 'pending') THEN
    SELECT title INTO v_course_title FROM courses WHERE id = NEW.course_id;
    v_participant := COALESCE(NEW.participant_name, NEW.participant_email, 'Ukjent');
    PERFORM upsert_notification(
      NEW.organization_id,
      'payment_followup',
      NEW.id::text,
      v_participant || ' – betaling trenger oppfølging',
      COALESCE(v_course_title, 'Ukjent kurs'),
      '/teacher/signups',
      NEW.course_id::text
    );
  ELSIF NEW.payment_status = 'paid' OR NEW.status = 'cancelled' OR NEW.status = 'course_cancelled' THEN
    PERFORM resolve_notification(NEW.organization_id, 'payment_followup', NEW.id::text);
  END IF;

  -- Course capacity
  SELECT c.max_participants, COUNT(s.id)
  INTO v_max_participants, v_confirmed_count
  FROM courses c
  LEFT JOIN signups s ON s.course_id = c.id AND s.status = 'confirmed'
  WHERE c.id = NEW.course_id
  GROUP BY c.max_participants;

  IF v_max_participants IS NOT NULL AND v_max_participants > 0 THEN
    IF v_confirmed_count >= v_max_participants THEN
      SELECT title INTO v_course_title FROM courses WHERE id = NEW.course_id;
      PERFORM upsert_notification(
        NEW.organization_id,
        'course_full',
        NEW.course_id::text,
        COALESCE(v_course_title, 'Kurs') || ' er fullt',
        v_confirmed_count || '/' || v_max_participants || ' plasser',
        '/teacher/courses/' || NEW.course_id
      );
    ELSE
      PERFORM resolve_notification(NEW.organization_id, 'course_full', NEW.course_id::text);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Message trigger: unread message notifications
CREATE OR REPLACE FUNCTION trg_message_notification()
RETURNS trigger AS $$
DECLARE
  v_org_id uuid;
  v_unread_count int;
BEGIN
  SELECT c.organization_id INTO v_org_id
  FROM conversations c WHERE c.id = NEW.conversation_id;

  IF v_org_id IS NULL THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' AND NEW.is_outgoing = false THEN
    PERFORM upsert_notification(
      v_org_id,
      'unread_message',
      NEW.conversation_id::text,
      'Ny melding',
      NULL,
      '/teacher/messages/' || NEW.conversation_id
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.is_read = true THEN
    SELECT COUNT(*) INTO v_unread_count
    FROM messages
    WHERE conversation_id = NEW.conversation_id
      AND is_outgoing = false
      AND is_read = false
      AND id != NEW.id;

    IF v_unread_count = 0 THEN
      PERFORM resolve_notification(v_org_id, 'unread_message', NEW.conversation_id::text);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Attach Triggers ──

CREATE TRIGGER trg_signups_notification
  AFTER INSERT OR UPDATE ON signups
  FOR EACH ROW EXECUTE FUNCTION trg_signup_notification();

CREATE TRIGGER trg_messages_notification
  AFTER INSERT OR UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION trg_message_notification();

-- ── RLS Policies ──

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read notifications"
  ON notifications FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    )
  );

ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notification_reads"
  ON notification_reads FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notification_reads"
  ON notification_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own notification_reads"
  ON notification_reads FOR DELETE
  USING (user_id = auth.uid());

-- ── RPC: Fetch active notifications with read state ──

CREATE OR REPLACE FUNCTION get_active_notifications(p_org_id uuid, p_user_id uuid)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  type text,
  reference_id text,
  title text,
  body text,
  link text,
  group_key text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  resolved_at timestamptz,
  read_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id, n.organization_id, n.type, n.reference_id,
    n.title, n.body, n.link, n.group_key,
    n.status, n.created_at, n.updated_at, n.resolved_at,
    nr.read_at
  FROM notifications n
  LEFT JOIN notification_reads nr
    ON nr.notification_id = n.id AND nr.user_id = p_user_id
  WHERE n.organization_id = p_org_id
    AND n.status = 'active'
  ORDER BY n.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Enable Realtime ──

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
