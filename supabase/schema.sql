-- ============================================
-- EASE YOGA BOOKING PLATFORM - DATABASE SCHEMA
-- Multi-tenant architecture for multiple studios
-- Last synced with production: 2026-03-07
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE course_type AS ENUM ('course-series', 'event', 'online');
CREATE TYPE course_status AS ENUM ('draft', 'upcoming', 'active', 'completed', 'cancelled');
CREATE TYPE signup_status AS ENUM ('confirmed', 'cancelled', 'course_cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE org_member_role AS ENUM ('owner', 'admin', 'teacher');
CREATE TYPE course_level AS ENUM ('alle', 'nybegynner', 'viderekommen');

-- ============================================
-- ORGANIZATIONS TABLE
-- ============================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,

  -- Contact info
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,

  -- Payment integrations
  stripe_account_id TEXT,
  stripe_onboarding_complete BOOLEAN DEFAULT FALSE,

  -- Settings (JSON for flexibility)
  settings JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);

-- ============================================
-- PROFILES TABLE
-- ============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  phone TEXT,
  is_platform_admin BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORGANIZATION MEMBERS TABLE
-- ============================================

CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role org_member_role NOT NULL DEFAULT 'teacher',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON org_members(organization_id);
CREATE INDEX idx_org_members_user ON org_members(user_id);

-- ============================================
-- COURSES TABLE
-- ============================================

CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,
  course_type course_type NOT NULL DEFAULT 'event',
  status course_status NOT NULL DEFAULT 'draft',
  level course_level DEFAULT 'alle',

  location TEXT,
  time_schedule TEXT, -- e.g., "Mandager 18:00"
  duration INTEGER,   -- in minutes

  max_participants INTEGER,

  price DECIMAL(10, 2),
  allows_drop_in BOOLEAN DEFAULT FALSE,
  drop_in_price DECIMAL(10, 2),

  total_weeks INTEGER,

  start_date DATE,
  end_date DATE,

  instructor_id UUID REFERENCES profiles(id),
  image_url TEXT,

  -- Client-generated key to prevent duplicate course creation on retries
  idempotency_key TEXT,

  -- Structured practical info (e.g., what to bring, requirements)
  practical_info JSONB CHECK (practical_info IS NULL OR jsonb_typeof(practical_info) = 'object'),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_courses_org ON courses(organization_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_start_date ON courses(start_date);
CREATE INDEX idx_courses_idempotency ON courses(idempotency_key);

-- ============================================
-- COURSE SESSIONS TABLE
-- Individual sessions within a course-series
-- ============================================

CREATE TABLE course_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(course_id, session_number)
);

CREATE INDEX idx_course_sessions_course ON course_sessions(course_id);
CREATE INDEX idx_course_sessions_date ON course_sessions(session_date);
CREATE INDEX idx_course_sessions_status ON course_sessions(status);

-- ============================================
-- COURSE SIGNUP PACKAGES TABLE
-- Multiple signup options per course (e.g., 6-week vs 8-week)
-- ============================================

CREATE TABLE course_signup_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  weeks INTEGER NOT NULL,
  label TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  is_full_course BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_course_signup_packages_course ON course_signup_packages(course_id);
CREATE UNIQUE INDEX idx_course_signup_packages_unique ON course_signup_packages(course_id, weeks);

-- ============================================
-- SIGNUPS TABLE
-- ============================================

CREATE TABLE signups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

  user_id UUID REFERENCES profiles(id),

  participant_name TEXT,
  participant_email TEXT,
  participant_phone TEXT,

  status signup_status NOT NULL DEFAULT 'confirmed',
  is_drop_in BOOLEAN DEFAULT FALSE,

  class_date DATE,
  class_time TIME,

  note TEXT,

  payment_status payment_status DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  stripe_receipt_url TEXT,
  amount_paid DECIMAL(10, 2),

  -- Package info (if booked via a signup package)
  signup_package_id UUID REFERENCES course_signup_packages(id),
  package_weeks INTEGER,
  package_end_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signups_org ON signups(organization_id);
CREATE INDEX idx_signups_course ON signups(course_id);
CREATE INDEX idx_signups_user ON signups(user_id);
CREATE INDEX idx_signups_status ON signups(status);
CREATE INDEX idx_signups_guest_email ON signups(participant_email);
CREATE INDEX idx_signups_stripe_checkout_session_id ON signups(stripe_checkout_session_id);
CREATE INDEX idx_signups_package_end_date ON signups(package_end_date);
CREATE UNIQUE INDEX unique_active_signup_per_course_email ON signups(course_id, participant_email) WHERE status = 'confirmed';

-- ============================================
-- CONVERSATIONS TABLE
-- ============================================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  guest_email TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  archived BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_org ON conversations(organization_id);
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_archived ON conversations(archived);

-- ============================================
-- MESSAGES TABLE
-- ============================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_outgoing BOOLEAN NOT NULL DEFAULT FALSE,
  is_read BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- ============================================
-- PROCESSED WEBHOOK EVENTS TABLE
-- Idempotency tracking for Stripe webhooks
-- ============================================

CREATE TABLE processed_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  result JSONB,

  UNIQUE(event_id)
);

CREATE INDEX idx_webhook_events_type ON processed_webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed_at ON processed_webhook_events(processed_at);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_signups_updated_at BEFORE UPDATE ON signups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_course_signup_packages_updated_at BEFORE UPDATE ON course_signup_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER course_sessions_updated_at BEFORE UPDATE ON course_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Security-definer helpers to avoid RLS recursion
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID, uid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM org_members WHERE organization_id = org_id AND user_id = uid);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_org_owner(org_id UUID, uid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM org_members WHERE organization_id = org_id AND user_id = uid AND role = 'owner');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_platform_admin(uid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = uid AND is_platform_admin = TRUE);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Create profile on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- RLS POLICIES (see migrations for full list)
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_signup_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;
