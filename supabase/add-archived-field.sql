-- Migration: Add archived field to conversations table
-- Run this on existing databases to add the archived column

-- Add archived column with default value of false
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Create index for faster filtering by archived status
CREATE INDEX IF NOT EXISTS idx_conversations_archived ON conversations(archived);
