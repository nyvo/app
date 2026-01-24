-- Add RLS policy for users to create conversations
-- This allows students to initiate conversations with teachers

-- Users can create conversations where they are the user_id
CREATE POLICY "Users can create conversations for themselves"
  ON conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Also add missing database indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_signups_payment_status ON signups(payment_status);
CREATE INDEX IF NOT EXISTS idx_signups_payment_intent ON signups(stripe_payment_intent_id);
