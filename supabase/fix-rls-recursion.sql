-- ============================================
-- FIX: Infinite Recursion in RLS Policies
-- ============================================
-- Problem: Policies that query their own table cause infinite loops
-- Solution: Use direct auth.uid() checks and security definer functions

-- ============================================
-- STEP 1: Drop problematic policies
-- ============================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Platform admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Org_members policies
DROP POLICY IF EXISTS "Org members can read members" ON org_members;
DROP POLICY IF EXISTS "Owners can manage members" ON org_members;

-- ============================================
-- STEP 2: Create helper function for org membership check
-- This function runs with elevated privileges to avoid RLS recursion
-- ============================================

CREATE OR REPLACE FUNCTION is_org_member(org_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE organization_id = org_id
    AND user_id = user_uuid
  );
$$;

CREATE OR REPLACE FUNCTION is_org_owner(org_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE organization_id = org_id
    AND user_id = user_uuid
    AND role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION is_platform_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_platform_admin FROM profiles WHERE id = user_uuid),
    FALSE
  );
$$;

-- ============================================
-- STEP 3: Recreate PROFILES policies (fixed)
-- ============================================

-- Users can read their own profile (simple, no recursion)
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Platform admins can read all profiles (uses security definer function)
CREATE POLICY "Platform admins can read all profiles"
  ON profiles FOR SELECT
  USING (is_platform_admin(auth.uid()));

-- Service role can insert (for trigger)
CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Users can insert their own profile (fallback)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================
-- STEP 4: Recreate ORG_MEMBERS policies (fixed)
-- ============================================

-- Users can always read their own memberships
CREATE POLICY "Users can read own memberships"
  ON org_members FOR SELECT
  USING (user_id = auth.uid());

-- Org members can read other members in same org (uses security definer)
CREATE POLICY "Org members can read org memberships"
  ON org_members FOR SELECT
  USING (is_org_member(organization_id, auth.uid()));

-- Owners can insert new members
CREATE POLICY "Owners can insert members"
  ON org_members FOR INSERT
  WITH CHECK (is_org_owner(organization_id, auth.uid()));

-- Owners can update members
CREATE POLICY "Owners can update members"
  ON org_members FOR UPDATE
  USING (is_org_owner(organization_id, auth.uid()));

-- Owners can delete members (but not themselves)
CREATE POLICY "Owners can delete members"
  ON org_members FOR DELETE
  USING (
    is_org_owner(organization_id, auth.uid())
    AND user_id != auth.uid()
  );

-- Service role can manage members (for RPC functions)
CREATE POLICY "Service role can manage members"
  ON org_members FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- STEP 5: Fix organizations update policy
-- ============================================

DROP POLICY IF EXISTS "Org members can update organization" ON organizations;

CREATE POLICY "Org admins can update organization"
  ON organizations FOR UPDATE
  USING (is_org_owner(id, auth.uid()));

-- Allow service role to insert organizations (for RPC)
CREATE POLICY "Service role can insert organizations"
  ON organizations FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================
-- STEP 6: Fix courses policies to use helper function
-- ============================================

DROP POLICY IF EXISTS "Org members can read all org courses" ON courses;
DROP POLICY IF EXISTS "Org members can create courses" ON courses;
DROP POLICY IF EXISTS "Org members can update courses" ON courses;
DROP POLICY IF EXISTS "Org members can delete courses" ON courses;

CREATE POLICY "Org members can read all org courses"
  ON courses FOR SELECT
  USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY "Org members can create courses"
  ON courses FOR INSERT
  WITH CHECK (is_org_member(organization_id, auth.uid()));

CREATE POLICY "Org members can update courses"
  ON courses FOR UPDATE
  USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY "Org members can delete courses"
  ON courses FOR DELETE
  USING (is_org_member(organization_id, auth.uid()));

-- ============================================
-- STEP 7: Fix signups policies
-- ============================================

DROP POLICY IF EXISTS "Org members can read org signups" ON signups;
DROP POLICY IF EXISTS "Org members can update signups" ON signups;

CREATE POLICY "Org members can read org signups"
  ON signups FOR SELECT
  USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY "Org members can update signups"
  ON signups FOR UPDATE
  USING (is_org_member(organization_id, auth.uid()));

-- ============================================
-- STEP 8: Fix conversations policies
-- ============================================

DROP POLICY IF EXISTS "Org members can read org conversations" ON conversations;

CREATE POLICY "Org members can read org conversations"
  ON conversations FOR SELECT
  USING (is_org_member(organization_id, auth.uid()));

-- ============================================
-- STEP 9: Fix messages policies
-- ============================================

DROP POLICY IF EXISTS "Org members can read org messages" ON messages;
DROP POLICY IF EXISTS "Org members can create messages" ON messages;

CREATE POLICY "Org members can read org messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND is_org_member(c.organization_id, auth.uid())
    )
  );

CREATE POLICY "Org members can create messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND is_org_member(c.organization_id, auth.uid())
    )
  );
