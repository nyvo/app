-- Migration: Schema fixes from code review
-- Fixes: idempotency UNIQUE constraint, cascade delete RPC, session_status constraint

-- 1. Add UNIQUE constraint on processed_webhook_events.event_id for idempotency
-- (Only add if not already unique)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'processed_webhook_events_event_id_key'
  ) THEN
    ALTER TABLE processed_webhook_events
      ADD CONSTRAINT processed_webhook_events_event_id_key UNIQUE (event_id);
  END IF;
END $$;

-- 2. Add CHECK constraint on course_sessions.status to match TypeScript enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_sessions_status_check'
  ) THEN
    ALTER TABLE course_sessions
      ADD CONSTRAINT course_sessions_status_check
      CHECK (status IN ('upcoming', 'completed', 'cancelled'));
  END IF;
END $$;

-- 3. Create delete_course_cascade RPC for transactional course deletion
CREATE OR REPLACE FUNCTION delete_course_cascade(p_course_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete in foreign key order within a single transaction
  DELETE FROM signups WHERE course_id = p_course_id;
  DELETE FROM course_sessions WHERE course_id = p_course_id;
  DELETE FROM courses WHERE id = p_course_id;
END;
$$;
