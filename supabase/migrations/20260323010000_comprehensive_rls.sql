-- ============================================
-- MIGRATION: Comprehensive RLS policies
-- Adds SELECT/INSERT/UPDATE/DELETE policies for all tables
-- that had RLS enabled but were missing policies.
-- ============================================

-- ============================================
-- 1. PROFILES
-- ============================================

-- Anyone can read any profile (needed for instructor display on public pages,
-- conversation participant names, etc.)
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO authenticated, anon
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Profile creation is handled by the handle_new_user() trigger (SECURITY DEFINER).
-- No INSERT policy needed for regular users.

-- ============================================
-- 2. ORGANIZATIONS
-- ============================================

-- Public: anyone can read organizations (needed for public studio pages)
CREATE POLICY "Organizations are viewable by everyone"
  ON organizations FOR SELECT
  TO authenticated, anon
  USING (true);

-- Organization creation is handled by ensure_organization_for_user() RPC (SECURITY DEFINER).
-- No INSERT policy needed for regular users.

-- Only org members (owner/admin) can update their organization
CREATE POLICY "Org members can update organization"
  ON organizations FOR UPDATE
  TO authenticated
  USING (is_org_member(id, auth.uid()))
  WITH CHECK (is_org_member(id, auth.uid()));

-- Only org owners can delete their organization
CREATE POLICY "Org owners can delete organization"
  ON organizations FOR DELETE
  TO authenticated
  USING (is_org_owner(id, auth.uid()));

-- ============================================
-- 3. ORG_MEMBERS
-- ============================================

-- Authenticated users can see their own memberships
-- (needed to determine userType and load org context)
CREATE POLICY "Users can view own memberships"
  ON org_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Org owners/admins can view all members in their org
CREATE POLICY "Org members can view co-members"
  ON org_members FOR SELECT
  TO authenticated
  USING (is_org_member(organization_id, auth.uid()));

-- Org owners can manage members
CREATE POLICY "Org owners can insert members"
  ON org_members FOR INSERT
  TO authenticated
  WITH CHECK (is_org_owner(organization_id, auth.uid()));

CREATE POLICY "Org owners can update members"
  ON org_members FOR UPDATE
  TO authenticated
  USING (is_org_owner(organization_id, auth.uid()))
  WITH CHECK (is_org_owner(organization_id, auth.uid()));

CREATE POLICY "Org owners can delete members"
  ON org_members FOR DELETE
  TO authenticated
  USING (is_org_owner(organization_id, auth.uid()));

-- ============================================
-- 4. COURSES
-- ============================================

-- Public: anyone can read non-draft courses (public course listings)
CREATE POLICY "Public courses are viewable by everyone"
  ON courses FOR SELECT
  TO authenticated, anon
  USING (status != 'draft');

-- Org members can see all courses including drafts
CREATE POLICY "Org members can view all courses"
  ON courses FOR SELECT
  TO authenticated
  USING (is_org_member(organization_id, auth.uid()));

-- Org members can create courses
CREATE POLICY "Org members can create courses"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK (is_org_member(organization_id, auth.uid()));

-- Org members can update courses
CREATE POLICY "Org members can update courses"
  ON courses FOR UPDATE
  TO authenticated
  USING (is_org_member(organization_id, auth.uid()))
  WITH CHECK (is_org_member(organization_id, auth.uid()));

-- Course deletion is handled by delete_course_cascade() RPC (SECURITY DEFINER).
-- No DELETE policy needed for regular users.

-- ============================================
-- 5. COURSE_SESSIONS
-- ============================================

-- Public: anyone can read sessions for public courses
CREATE POLICY "Course sessions are viewable by everyone"
  ON course_sessions FOR SELECT
  TO authenticated, anon
  USING (true);

-- Org members can manage sessions
CREATE POLICY "Org members can create sessions"
  ON course_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id
      AND is_org_member(c.organization_id, auth.uid())
    )
  );

CREATE POLICY "Org members can update sessions"
  ON course_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id
      AND is_org_member(c.organization_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id
      AND is_org_member(c.organization_id, auth.uid())
    )
  );

CREATE POLICY "Org members can delete sessions"
  ON course_sessions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id
      AND is_org_member(c.organization_id, auth.uid())
    )
  );

-- ============================================
-- 6. SIGNUPS
-- (INSERT policy already exists from security_fixes migration)
-- (UPDATE policy for cancellation exists from remove_waitlist migration)
-- ============================================

-- Students can view their own signups (by user_id)
CREATE POLICY "Students can view own signups"
  ON signups FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Org members can view all signups for their organization
CREATE POLICY "Org members can view org signups"
  ON signups FOR SELECT
  TO authenticated
  USING (is_org_member(organization_id, auth.uid()));

-- Anon users need to read signups for capacity checks on public pages
CREATE POLICY "Anon can view signup counts"
  ON signups FOR SELECT
  TO anon
  USING (true);

-- Org members can update signups (mark payment, cancel, etc.)
CREATE POLICY "Org members can update signups"
  ON signups FOR UPDATE
  TO authenticated
  USING (is_org_member(organization_id, auth.uid()))
  WITH CHECK (is_org_member(organization_id, auth.uid()));

-- Org members can delete signups
CREATE POLICY "Org members can delete signups"
  ON signups FOR DELETE
  TO authenticated
  USING (is_org_member(organization_id, auth.uid()));

-- ============================================
-- 7. CONVERSATIONS
-- ============================================

-- Org members can view conversations for their organization
CREATE POLICY "Org members can view conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (is_org_member(organization_id, auth.uid()));

-- Students can view their own conversations
CREATE POLICY "Students can view own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Authenticated users can create conversations (students contacting teachers)
CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_org_member(organization_id, auth.uid()));

-- Org members can update conversations (mark read, archive)
CREATE POLICY "Org members can update conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (is_org_member(organization_id, auth.uid()))
  WITH CHECK (is_org_member(organization_id, auth.uid()));

-- Students can update their own conversations (mark read)
CREATE POLICY "Students can update own conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Org members can delete conversations
CREATE POLICY "Org members can delete conversations"
  ON conversations FOR DELETE
  TO authenticated
  USING (is_org_member(organization_id, auth.uid()));

-- ============================================
-- 8. MESSAGES
-- ============================================

-- Users can view messages in conversations they have access to
CREATE POLICY "Users can view messages in own conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.user_id = auth.uid() OR is_org_member(c.organization_id, auth.uid()))
    )
  );

-- Users can send messages in conversations they have access to
CREATE POLICY "Users can send messages in own conversations"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.user_id = auth.uid() OR is_org_member(c.organization_id, auth.uid()))
    )
  );

-- Org members can update messages (mark read)
CREATE POLICY "Conversation participants can update messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.user_id = auth.uid() OR is_org_member(c.organization_id, auth.uid()))
    )
  );

-- ============================================
-- 9. COURSE_SIGNUP_PACKAGES
-- ============================================

-- Public: anyone can view packages (needed for public course detail pricing)
CREATE POLICY "Signup packages are viewable by everyone"
  ON course_signup_packages FOR SELECT
  TO authenticated, anon
  USING (true);

-- Org members can manage packages
CREATE POLICY "Org members can create packages"
  ON course_signup_packages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id
      AND is_org_member(c.organization_id, auth.uid())
    )
  );

CREATE POLICY "Org members can update packages"
  ON course_signup_packages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id
      AND is_org_member(c.organization_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id
      AND is_org_member(c.organization_id, auth.uid())
    )
  );

CREATE POLICY "Org members can delete packages"
  ON course_signup_packages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id
      AND is_org_member(c.organization_id, auth.uid())
    )
  );
