-- ============================================
-- COURSE STYLES TABLE
-- Yoga styles like vinyasa, yin, hatha, etc.
-- ============================================

-- Optional helper for consistent normalization
-- (safe to keep even if you manually insert normalized values)
CREATE OR REPLACE FUNCTION normalize_style_name(input TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT trim(
    regexp_replace(
      regexp_replace(lower(COALESCE(input, '')), '[^a-z0-9]+', ' ', 'g'),
      '\s+', ' ', 'g'
    )
  );
$$;

-- Course styles table
CREATE TABLE course_styles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,                    -- Display name: "Vinyasa Flow"
  normalized_name TEXT NOT NULL UNIQUE,  -- Canonical key: "vinyasa"
  color TEXT,                            -- Optional hex color for UI badges
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure display names are unique enough to avoid confusion
CREATE UNIQUE INDEX idx_course_styles_name
  ON course_styles (name);

-- Add style_id FK to courses (one style per course, nullable)
ALTER TABLE courses
  ADD COLUMN style_id UUID REFERENCES course_styles(id);

CREATE INDEX idx_courses_style
  ON courses(style_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Anyone can read styles (students + teachers)
ALTER TABLE course_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read course_styles"
  ON course_styles
  FOR SELECT
  USING (TRUE);

-- ============================================
-- SEED DATA (CURATED, VERIFIED STYLES)
-- ============================================

-- These are canonical styles.
-- normalized_name is intentionally simplified for dedupe and filtering.

INSERT INTO course_styles (name, normalized_name, color) VALUES
  ('Vinyasa Flow',  'vinyasa',    '#6366f1'),
  ('Yin Yoga',      'yin',        '#8b5cf6'),
  ('Hatha Yoga',    'hatha',      '#06b6d4'),
  ('Ashtanga',      'ashtanga',   '#f59e0b'),
  ('Restorative',   'restorative','#10b981'),
  ('Meditation',    'meditation', '#ec4899'),
  ('Prenatal Yoga', 'prenatal',   '#f472b6'),
  ('Power Yoga',    'power',      '#ef4444'),
  ('Kundalini',     'kundalini',  '#a855f7'),
  ('Hot Yoga',      'hot yoga',   '#dc2626')
ON CONFLICT (normalized_name) DO NOTHING;
