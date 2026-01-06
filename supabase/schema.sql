-- ============================================
-- EASE YOGA BOOKING PLATFORM - DATABASE SCHEMA
-- Multi-tenant architecture for multiple studios
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

-- Course type: what kind of offering
CREATE TYPE course_type AS ENUM ('course-series', 'event', 'online');

-- Course status: lifecycle state
CREATE TYPE course_status AS ENUM ('draft', 'upcoming', 'active', 'completed');

-- Signup status: booking state
CREATE TYPE signup_status AS ENUM ('confirmed', 'waitlist', 'cancelled');

-- Payment status: payment lifecycle
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- Organization member role
CREATE TYPE org_member_role AS ENUM ('owner', 'admin', 'teacher');

-- Course level
CREATE TYPE course_level AS ENUM ('alle', 'nybegynner', 'viderekommen');

-- ============================================
-- ORGANIZATIONS TABLE
-- Each yoga studio/teacher is an organization
-- ============================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier (ease.no/slug)
  description TEXT,
  logo_url TEXT,

  -- Contact info
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,

  -- Payment integrations (added later in Phase 4)
  stripe_account_id TEXT, -- Stripe Connect account
  stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
  fiken_company_slug TEXT, -- Fiken accounting integration

  -- Settings (JSON for flexibility)
  settings JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for slug lookups (common operation)
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- ============================================
-- PROFILES TABLE
-- Extended user data (linked to Supabase Auth)
-- ============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  phone TEXT,

  -- Platform admin flag (for you as the developer)
  is_platform_admin BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORGANIZATION MEMBERS TABLE
-- Links users to organizations with roles
-- ============================================

CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role org_member_role NOT NULL DEFAULT 'teacher',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each user can only have one role per organization
  UNIQUE(organization_id, user_id)
);

-- Indexes for common queries
CREATE INDEX idx_org_members_org ON org_members(organization_id);
CREATE INDEX idx_org_members_user ON org_members(user_id);

-- ============================================
-- COURSES TABLE
-- All course offerings (scoped to organization)
-- ============================================

CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Basic info
  title TEXT NOT NULL,
  description TEXT,
  course_type course_type NOT NULL DEFAULT 'event',
  status course_status NOT NULL DEFAULT 'draft',
  level course_level DEFAULT 'alle',

  -- Location & Time
  location TEXT,
  time_schedule TEXT, -- e.g., "Mandager 18:00"
  duration INTEGER, -- in minutes

  -- Capacity
  max_participants INTEGER,

  -- Pricing
  price DECIMAL(10, 2),
  allows_drop_in BOOLEAN DEFAULT FALSE,
  drop_in_price DECIMAL(10, 2),

  -- For course-series (kursrekke)
  total_weeks INTEGER, -- e.g., 8 weeks
  current_week INTEGER DEFAULT 0,

  -- Dates
  start_date DATE,
  end_date DATE,

  -- Instructor (optional, defaults to org owner)
  instructor_id UUID REFERENCES profiles(id),

  -- Image
  image_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_courses_org ON courses(organization_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_start_date ON courses(start_date);

-- ============================================
-- SIGNUPS TABLE
-- Course bookings (supports guests & logged-in users)
-- ============================================

CREATE TABLE signups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

  -- User (nullable for guest checkout)
  user_id UUID REFERENCES profiles(id),

  -- Guest info (when user_id is null)
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,

  -- Booking details
  status signup_status NOT NULL DEFAULT 'confirmed',
  waitlist_position INTEGER,
  is_drop_in BOOLEAN DEFAULT FALSE,

  -- For specific class in a course-series
  class_date DATE,
  class_time TIME,

  -- Teacher notes
  note TEXT,

  -- Payment (Phase 4)
  payment_status payment_status DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  amount_paid DECIMAL(10, 2),

  -- Timestamps
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_signups_org ON signups(organization_id);
CREATE INDEX idx_signups_course ON signups(course_id);
CREATE INDEX idx_signups_user ON signups(user_id);
CREATE INDEX idx_signups_status ON signups(status);
CREATE INDEX idx_signups_guest_email ON signups(guest_email);

-- ============================================
-- CONVERSATIONS TABLE
-- Messaging between teachers and students
-- ============================================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- The student in the conversation
  user_id UUID REFERENCES profiles(id),
  guest_email TEXT, -- For guest conversations

  -- Status
  is_read BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_conversations_org ON conversations(organization_id);
CREATE INDEX idx_conversations_user ON conversations(user_id);

-- ============================================
-- MESSAGES TABLE
-- Individual messages in conversations
-- ============================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Content
  content TEXT NOT NULL,

  -- Direction (from teacher's perspective)
  is_outgoing BOOLEAN NOT NULL DEFAULT FALSE,

  -- Status
  is_read BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables that need it
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_signups_updated_at
  BEFORE UPDATE ON signups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Platform admins can read all profiles
CREATE POLICY "Platform admins can read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_platform_admin = TRUE
    )
  );

-- ============================================
-- ORGANIZATIONS POLICIES
-- ============================================

-- Public can read basic org info (for public course listings)
CREATE POLICY "Public can read organizations"
  ON organizations FOR SELECT
  USING (TRUE);

-- Org members can update their organization
CREATE POLICY "Org members can update organization"
  ON organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE organization_id = organizations.id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- ORG_MEMBERS POLICIES
-- ============================================

-- Org members can read their organization's members
CREATE POLICY "Org members can read members"
  ON org_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.organization_id = org_members.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Owners can manage members
CREATE POLICY "Owners can manage members"
  ON org_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE organization_id = org_members.organization_id
      AND user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- ============================================
-- COURSES POLICIES
-- ============================================

-- Public can read published courses
CREATE POLICY "Public can read published courses"
  ON courses FOR SELECT
  USING (status != 'draft');

-- Org members can read all courses in their org (including drafts)
CREATE POLICY "Org members can read all org courses"
  ON courses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE organization_id = courses.organization_id
      AND user_id = auth.uid()
    )
  );

-- Org members can create courses
CREATE POLICY "Org members can create courses"
  ON courses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE organization_id = courses.organization_id
      AND user_id = auth.uid()
    )
  );

-- Org members can update courses
CREATE POLICY "Org members can update courses"
  ON courses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE organization_id = courses.organization_id
      AND user_id = auth.uid()
    )
  );

-- Org members can delete courses
CREATE POLICY "Org members can delete courses"
  ON courses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE organization_id = courses.organization_id
      AND user_id = auth.uid()
    )
  );

-- ============================================
-- SIGNUPS POLICIES
-- ============================================

-- Users can read their own signups
CREATE POLICY "Users can read own signups"
  ON signups FOR SELECT
  USING (user_id = auth.uid());

-- Org members can read all signups for their org
CREATE POLICY "Org members can read org signups"
  ON signups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE organization_id = signups.organization_id
      AND user_id = auth.uid()
    )
  );

-- Anyone can create signups (for guest checkout)
CREATE POLICY "Anyone can create signups"
  ON signups FOR INSERT
  WITH CHECK (TRUE);

-- Org members can update signups
CREATE POLICY "Org members can update signups"
  ON signups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE organization_id = signups.organization_id
      AND user_id = auth.uid()
    )
  );

-- Users can cancel their own signups
CREATE POLICY "Users can cancel own signups"
  ON signups FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (status = 'cancelled');

-- ============================================
-- CONVERSATIONS & MESSAGES POLICIES
-- ============================================

-- Users can read their own conversations
CREATE POLICY "Users can read own conversations"
  ON conversations FOR SELECT
  USING (user_id = auth.uid());

-- Org members can read org conversations
CREATE POLICY "Org members can read org conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE organization_id = conversations.organization_id
      AND user_id = auth.uid()
    )
  );

-- Users can read messages in their conversations
CREATE POLICY "Users can read messages in own conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- Org members can read messages in their org
CREATE POLICY "Org members can read org messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN org_members om ON om.organization_id = c.organization_id
      WHERE c.id = messages.conversation_id
      AND om.user_id = auth.uid()
    )
  );

-- Org members can create messages
CREATE POLICY "Org members can create messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN org_members om ON om.organization_id = c.organization_id
      WHERE c.id = messages.conversation_id
      AND om.user_id = auth.uid()
    )
  );

-- Users can create messages in their conversations
CREATE POLICY "Users can create messages in own conversations"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- ============================================
-- FUNCTION: Create profile on signup
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- FUNCTION: Create organization for new teacher
-- ============================================

CREATE OR REPLACE FUNCTION create_organization_for_user(
  org_name TEXT,
  org_slug TEXT,
  user_id UUID
)
RETURNS UUID AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Create the organization
  INSERT INTO organizations (name, slug)
  VALUES (org_name, org_slug)
  RETURNING id INTO new_org_id;

  -- Add user as owner
  INSERT INTO org_members (organization_id, user_id, role)
  VALUES (new_org_id, user_id, 'owner');

  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
