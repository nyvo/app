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

-- Organization creation for new users (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION ensure_organization_for_user(p_org_name TEXT, p_org_slug TEXT)
RETURNS TABLE(org_id UUID, org_slug TEXT, org_name TEXT, member_role org_member_role, was_created BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  calling_user UUID := auth.uid();
  existing_org_id UUID;
  new_org_id UUID;
  base_slug TEXT;
  candidate_slug TEXT;
  clean_name TEXT;
  slug_suffix INT := 0;
  suffix_text TEXT;
BEGIN
  IF calling_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT om.organization_id INTO existing_org_id
  FROM org_members om WHERE om.user_id = calling_user AND om.role = 'owner'
  ORDER BY om.created_at ASC LIMIT 1;

  IF existing_org_id IS NOT NULL THEN
    RETURN QUERY SELECT o.id, o.slug, o.name, 'owner'::org_member_role, FALSE FROM organizations o WHERE o.id = existing_org_id;
    RETURN;
  END IF;

  clean_name := LEFT(TRIM(COALESCE(p_org_name, '')), 100);
  IF clean_name = '' THEN RAISE EXCEPTION 'Organization name is required'; END IF;

  base_slug := NULLIF(TRIM(LOWER(COALESCE(p_org_slug, ''))), '');
  IF base_slug IS NULL THEN base_slug := LOWER(clean_name); END IF;
  base_slug := REGEXP_REPLACE(base_slug, '[æ]', 'ae', 'g');
  base_slug := REGEXP_REPLACE(base_slug, '[ø]', 'o', 'g');
  base_slug := REGEXP_REPLACE(base_slug, '[å]', 'a', 'g');
  base_slug := REGEXP_REPLACE(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := REGEXP_REPLACE(base_slug, '^-+|-+$', '', 'g');
  base_slug := LEFT(base_slug, 56);
  IF base_slug = '' THEN RAISE EXCEPTION 'Could not generate valid slug from name'; END IF;

  LOOP
    IF slug_suffix = 0 THEN candidate_slug := base_slug;
    ELSE suffix_text := slug_suffix::TEXT; candidate_slug := LEFT(base_slug, 60 - 1 - LENGTH(suffix_text)) || '-' || suffix_text;
    END IF;
    BEGIN
      INSERT INTO organizations (name, slug) VALUES (clean_name, candidate_slug) RETURNING id INTO new_org_id; EXIT;
    EXCEPTION WHEN unique_violation THEN
      slug_suffix := slug_suffix + 1;
      IF slug_suffix > 50 THEN RAISE EXCEPTION 'Could not generate unique slug after 50 attempts'; END IF;
    END;
  END LOOP;

  INSERT INTO org_members (organization_id, user_id, role) VALUES (new_org_id, calling_user, 'owner');
  RETURN QUERY SELECT new_org_id, candidate_slug, clean_name, 'owner'::org_member_role, TRUE;
  RETURN;
END;
$$;

-- Package end date calculation
CREATE OR REPLACE FUNCTION calculate_package_end_date(p_course_start_date DATE, p_package_weeks INTEGER)
RETURNS DATE LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_package_weeks IS NULL THEN RETURN NULL; END IF;
  RETURN p_course_start_date + ((p_package_weeks - 1) * 7);
END;
$$;

-- Count active confirmed signups (package-aware capacity check)
CREATE OR REPLACE FUNCTION count_active_confirmed_signups(p_course_id UUID)
RETURNS INTEGER LANGUAGE plpgsql STABLE AS $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM signups
  WHERE course_id = p_course_id AND status = 'confirmed'
    AND (package_end_date IS NULL OR package_end_date > CURRENT_DATE);
  RETURN v_count;
END;
$$;

-- Atomic signup creation with capacity check (prevents overbooking via row lock)
CREATE OR REPLACE FUNCTION create_signup_if_available(
  p_course_id UUID, p_organization_id UUID,
  p_participant_name TEXT, p_participant_email TEXT, p_participant_phone TEXT,
  p_stripe_checkout_session_id TEXT, p_stripe_payment_intent_id TEXT,
  p_stripe_receipt_url TEXT, p_amount_paid NUMERIC,
  p_is_drop_in BOOLEAN DEFAULT FALSE, p_class_date DATE DEFAULT NULL,
  p_class_time TIME DEFAULT NULL, p_signup_package_id UUID DEFAULT NULL,
  p_package_weeks INTEGER DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql AS $$
DECLARE
  v_max_participants INT; v_current_count INT; v_signup_id UUID;
  v_course_start_date DATE; v_package_end_date DATE;
BEGIN
  SELECT max_participants, start_date INTO v_max_participants, v_course_start_date
  FROM courses WHERE id = p_course_id FOR UPDATE;
  IF v_max_participants IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'course_not_found', 'message', 'Kurset ble ikke funnet');
  END IF;
  IF p_package_weeks IS NOT NULL AND v_course_start_date IS NOT NULL THEN
    v_package_end_date := calculate_package_end_date(v_course_start_date, p_package_weeks);
  END IF;
  v_current_count := count_active_confirmed_signups(p_course_id);
  IF v_current_count >= v_max_participants THEN
    RETURN json_build_object('success', false, 'error', 'course_full', 'message', 'Kurset er fullt',
      'current_count', v_current_count, 'max_participants', v_max_participants);
  END IF;
  INSERT INTO signups (
    organization_id, course_id, participant_name, participant_email, participant_phone,
    status, payment_status, is_drop_in, class_date, class_time,
    stripe_checkout_session_id, stripe_payment_intent_id, stripe_receipt_url, amount_paid,
    signup_package_id, package_weeks, package_end_date, created_at, updated_at
  ) VALUES (
    p_organization_id, p_course_id, p_participant_name, p_participant_email, p_participant_phone,
    'confirmed', 'paid', p_is_drop_in, p_class_date, p_class_time,
    p_stripe_checkout_session_id, p_stripe_payment_intent_id, p_stripe_receipt_url, p_amount_paid,
    p_signup_package_id, p_package_weeks, v_package_end_date, NOW(), NOW()
  ) RETURNING id INTO v_signup_id;
  RETURN json_build_object('success', true, 'signup_id', v_signup_id, 'status', 'confirmed', 'package_end_date', v_package_end_date);
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'error', 'already_signed_up', 'message', 'Du er allerede påmeldt dette kurset');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'database_error', 'message', SQLERRM);
END;
$$;

-- Idempotent course creation
CREATE OR REPLACE FUNCTION create_course_idempotent(
  p_organization_id UUID, p_idempotency_key TEXT, p_title TEXT,
  p_description TEXT DEFAULT NULL, p_course_type TEXT DEFAULT 'event',
  p_status TEXT DEFAULT 'draft', p_level TEXT DEFAULT 'alle',
  p_location TEXT DEFAULT NULL, p_time_schedule TEXT DEFAULT NULL,
  p_duration INTEGER DEFAULT 60, p_max_participants INTEGER DEFAULT NULL,
  p_price NUMERIC DEFAULT NULL, p_allows_drop_in BOOLEAN DEFAULT FALSE,
  p_drop_in_price NUMERIC DEFAULT NULL, p_total_weeks INTEGER DEFAULT NULL,
  p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL,
  p_instructor_id UUID DEFAULT NULL, p_image_url TEXT DEFAULT NULL,
  p_style_id UUID DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql AS $$
DECLARE v_existing_course RECORD; v_new_course_id UUID;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id, title, status, created_at INTO v_existing_course FROM courses
    WHERE organization_id = p_organization_id AND idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN json_build_object('success', true, 'course_id', v_existing_course.id, 'already_existed', true, 'message', 'Kurset eksisterer allerede');
    END IF;
  END IF;
  INSERT INTO courses (organization_id, idempotency_key, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, allows_drop_in, drop_in_price, total_weeks, start_date, end_date, instructor_id, image_url, style_id)
  VALUES (p_organization_id, p_idempotency_key, p_title, p_description, p_course_type::course_type, p_status::course_status, p_level::course_level, p_location, p_time_schedule, p_duration, p_max_participants, p_price, p_allows_drop_in, p_drop_in_price, p_total_weeks, p_start_date, p_end_date, p_instructor_id, p_image_url, p_style_id)
  RETURNING id INTO v_new_course_id;
  RETURN json_build_object('success', true, 'course_id', v_new_course_id, 'already_existed', false, 'message', 'Kurs opprettet');
EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO v_existing_course FROM courses WHERE organization_id = p_organization_id AND idempotency_key = p_idempotency_key;
    IF FOUND THEN RETURN json_build_object('success', true, 'course_id', v_existing_course.id, 'already_existed', true, 'message', 'Kurset eksisterer allerede'); END IF;
    RETURN json_build_object('success', false, 'error', 'unique_violation', 'message', 'Unik begrensning feilet');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'database_error', 'message', SQLERRM);
END;
$$;

-- Session conflict checking
CREATE OR REPLACE FUNCTION check_session_conflict(
  p_organization_id UUID, p_session_date DATE, p_start_time TIME, p_end_time TIME, p_exclude_course_id UUID DEFAULT NULL
) RETURNS TABLE(has_conflict BOOLEAN, conflicting_course_id UUID, conflicting_course_title TEXT, conflicting_start TIME, conflicting_end TIME)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY SELECT TRUE, c.id, c.title, cs.start_time,
    (cs.start_time + (COALESCE(c.duration, 60) || ' minutes')::INTERVAL)::TIME
  FROM course_sessions cs JOIN courses c ON c.id = cs.course_id
  WHERE c.organization_id = p_organization_id AND cs.session_date = p_session_date
    AND cs.status != 'cancelled' AND c.status != 'cancelled'
    AND (p_exclude_course_id IS NULL OR c.id != p_exclude_course_id)
    AND (p_start_time < (cs.start_time + (COALESCE(c.duration, 60) || ' minutes')::INTERVAL)::TIME AND cs.start_time < p_end_time)
  LIMIT 1;
  IF NOT FOUND THEN RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TIME, NULL::TIME; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION check_sessions_conflicts(p_organization_id UUID, p_sessions JSONB, p_exclude_course_id UUID DEFAULT NULL)
RETURNS TABLE(session_date DATE, has_conflict BOOLEAN, conflicting_course_id UUID, conflicting_course_title TEXT, conflicting_start TIME, conflicting_end TIME)
LANGUAGE plpgsql AS $$
DECLARE v_session JSONB; v_date DATE; v_start TIME; v_duration INTEGER; v_end TIME; v_conflict RECORD;
BEGIN
  FOR v_session IN SELECT * FROM jsonb_array_elements(p_sessions) LOOP
    v_date := (v_session->>'date')::DATE; v_start := (v_session->>'start_time')::TIME;
    v_duration := COALESCE((v_session->>'duration')::INTEGER, 60); v_end := v_start + (v_duration || ' minutes')::INTERVAL;
    SELECT * INTO v_conflict FROM check_session_conflict(p_organization_id, v_date, v_start, v_end, p_exclude_course_id) AS c WHERE c.has_conflict = TRUE;
    IF FOUND THEN RETURN QUERY SELECT v_date, TRUE, v_conflict.conflicting_course_id, v_conflict.conflicting_course_title, v_conflict.conflicting_start, v_conflict.conflicting_end;
    ELSE RETURN QUERY SELECT v_date, FALSE, NULL::UUID, NULL::TEXT, NULL::TIME, NULL::TIME;
    END IF;
  END LOOP;
END;
$$;

-- Session conflict enforcement trigger
CREATE OR REPLACE FUNCTION enforce_session_no_conflict() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_organization_id UUID; v_duration INTEGER; v_end_time TIME; v_conflict RECORD;
BEGIN
  SELECT c.organization_id, COALESCE(c.duration, 60) INTO v_organization_id, v_duration FROM courses c WHERE c.id = NEW.course_id;
  v_end_time := NEW.start_time + (v_duration || ' minutes')::INTERVAL;
  SELECT * INTO v_conflict FROM check_session_conflict(v_organization_id, NEW.session_date, NEW.start_time, v_end_time, NEW.course_id) AS c WHERE c.has_conflict = TRUE;
  IF FOUND THEN
    RAISE EXCEPTION 'Session conflicts with existing course: % (%-%)', v_conflict.conflicting_course_title, v_conflict.conflicting_start, v_conflict.conflicting_end USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_session_conflict_check
  BEFORE INSERT OR UPDATE OF session_date, start_time ON course_sessions
  FOR EACH ROW WHEN (NEW.status <> 'cancelled')
  EXECUTE FUNCTION enforce_session_no_conflict();

-- Webhook event cleanup (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events() RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE deleted_count INTEGER;
BEGIN
  DELETE FROM processed_webhook_events WHERE processed_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

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
