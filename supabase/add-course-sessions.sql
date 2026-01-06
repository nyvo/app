-- ============================================
-- COURSE SESSIONS TABLE
-- Individual sessions/weeks for course series
-- ============================================

-- Each row represents one session (e.g., Week 1, Week 2, etc.)
CREATE TABLE course_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL,        -- 1, 2, 3... (week/day number)
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,                          -- Optional end time
  status TEXT DEFAULT 'upcoming',         -- 'upcoming' | 'completed' | 'cancelled'
  notes TEXT,                             -- Optional teacher notes for this session
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each course can only have one session per session_number
  UNIQUE(course_id, session_number)
);

-- Indexes for common queries
CREATE INDEX idx_course_sessions_course ON course_sessions(course_id);
CREATE INDEX idx_course_sessions_date ON course_sessions(session_date);
CREATE INDEX idx_course_sessions_status ON course_sessions(status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE course_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone in the org can read sessions (teachers, admins, owners)
CREATE POLICY "Org members can read course sessions"
  ON course_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN org_members om ON c.organization_id = om.organization_id
      WHERE c.id = course_sessions.course_id
      AND om.user_id = auth.uid()
    )
  );

-- Teachers/admins/owners can insert sessions
CREATE POLICY "Teachers can insert course sessions"
  ON course_sessions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN org_members om ON c.organization_id = om.organization_id
      WHERE c.id = course_sessions.course_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'teacher')
    )
  );

-- Teachers/admins/owners can update sessions
CREATE POLICY "Teachers can update course sessions"
  ON course_sessions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN org_members om ON c.organization_id = om.organization_id
      WHERE c.id = course_sessions.course_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'teacher')
    )
  );

-- Teachers/admins/owners can delete sessions
CREATE POLICY "Teachers can delete course sessions"
  ON course_sessions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN org_members om ON c.organization_id = om.organization_id
      WHERE c.id = course_sessions.course_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'teacher')
    )
  );

-- ============================================
-- TRIGGER: Auto-update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_course_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER course_sessions_updated_at
  BEFORE UPDATE ON course_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_course_sessions_updated_at();
