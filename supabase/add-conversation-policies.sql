-- Add missing RLS policies for conversations table
-- Run this in Supabase SQL Editor

-- Org members can create conversations
CREATE POLICY "Org members can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE organization_id = conversations.organization_id
      AND user_id = auth.uid()
    )
  );

-- Org members can update their org conversations
CREATE POLICY "Org members can update org conversations"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE organization_id = conversations.organization_id
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE organization_id = conversations.organization_id
      AND user_id = auth.uid()
    )
  );

-- Org members can delete their org conversations
CREATE POLICY "Org members can delete org conversations"
  ON conversations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE organization_id = conversations.organization_id
      AND user_id = auth.uid()
    )
  );

-- Also add update policy for messages (mark as read)
CREATE POLICY "Org members can update org messages"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN org_members om ON om.organization_id = c.organization_id
      WHERE c.id = messages.conversation_id
      AND om.user_id = auth.uid()
    )
  );

-- Org members can delete messages in their org conversations
CREATE POLICY "Org members can delete org messages"
  ON messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN org_members om ON om.organization_id = c.organization_id
      WHERE c.id = messages.conversation_id
      AND om.user_id = auth.uid()
    )
  );
