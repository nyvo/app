-- ============================================
-- Simplify notification copy
-- Shorter, clearer Norwegian text
-- ============================================

-- Update existing notifications with simpler copy
UPDATE notifications
SET title = regexp_replace(title, ' – betaling trenger oppfølging$', ' – mislykket betaling')
WHERE type = 'payment_followup'
  AND title LIKE '% – betaling trenger oppfølging';

UPDATE notifications
SET title = regexp_replace(title, ' – lav påmelding$', ' – få påmeldte')
WHERE type = 'low_enrollment'
  AND title LIKE '% – lav påmelding';

-- Update trigger function with simpler copy
CREATE OR REPLACE FUNCTION trg_signup_notification()
RETURNS trigger AS $$
DECLARE
  v_course_title text;
  v_participant text;
  v_confirmed_count int;
  v_max_participants int;
BEGIN
  IF NEW.status = 'confirmed' AND NEW.payment_status IN ('failed', 'pending') THEN
    SELECT title INTO v_course_title FROM courses WHERE id = NEW.course_id;
    v_participant := COALESCE(NEW.participant_name, NEW.participant_email, 'Ukjent');
    PERFORM upsert_notification(
      NEW.organization_id,
      'payment_followup',
      NEW.id::text,
      v_participant || ' – mislykket betaling',
      COALESCE(v_course_title, 'Ukjent kurs'),
      '/teacher/signups',
      NEW.course_id::text
    );
  ELSIF NEW.payment_status = 'paid' OR NEW.status = 'cancelled' OR NEW.status = 'course_cancelled' THEN
    PERFORM resolve_notification(NEW.organization_id, 'payment_followup', NEW.id::text);
  END IF;

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

-- Update low enrollment function with simpler copy
CREATE OR REPLACE FUNCTION check_low_enrollment_notifications()
RETURNS void AS $$
DECLARE
  r RECORD;
BEGIN
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
      r.title || ' – få påmeldte',
      r.signup_count || '/' || r.max_participants || ' påmeldt',
      '/teacher/courses/' || r.course_id
    );
  END LOOP;

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
