-- ============================================================
-- NUMIO — COMPLETE RLS SETUP
-- Run this in Supabase SQL editor
-- ============================================================


-- ============================================================
-- TABLE: profiles
-- Category: PER-USER PRIVATE
-- Reason: id = auth.uid(), contains PIN, language, display name
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE USING (auth.uid() = id);


-- ============================================================
-- TABLE: kid_profiles
-- Category: PER-USER PRIVATE
-- Reason: user_id links each kid to one family account
-- ============================================================

ALTER TABLE kid_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kid_profiles_select" ON kid_profiles;
DROP POLICY IF EXISTS "kid_profiles_insert" ON kid_profiles;
DROP POLICY IF EXISTS "kid_profiles_update" ON kid_profiles;
DROP POLICY IF EXISTS "kid_profiles_delete" ON kid_profiles;

CREATE POLICY "kid_profiles_select" ON kid_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "kid_profiles_insert" ON kid_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "kid_profiles_update" ON kid_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "kid_profiles_delete" ON kid_profiles
  FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- TABLE: chapters
-- Category: PER-USER PRIVATE
-- Reason: user_id ties each chapter to one family
-- Note: coin_balance column on this table is a stray — consider
--       dropping it (it belongs on kid_profiles, not chapters)
-- ============================================================

ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chapters_select" ON chapters;
DROP POLICY IF EXISTS "chapters_insert" ON chapters;
DROP POLICY IF EXISTS "chapters_update" ON chapters;
DROP POLICY IF EXISTS "chapters_delete" ON chapters;

CREATE POLICY "chapters_select" ON chapters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "chapters_insert" ON chapters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chapters_update" ON chapters
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "chapters_delete" ON chapters
  FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- TABLE: exams
-- Category: PER-USER PRIVATE
-- Reason: user_id ties each exam to the family that generated it
-- ============================================================

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exams_select" ON exams;
DROP POLICY IF EXISTS "exams_insert" ON exams;
DROP POLICY IF EXISTS "exams_update" ON exams;
DROP POLICY IF EXISTS "exams_delete" ON exams;

CREATE POLICY "exams_select" ON exams
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "exams_insert" ON exams
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "exams_update" ON exams
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "exams_delete" ON exams
  FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- TABLE: rewards
-- Category: PER-USER PRIVATE
-- Reason: user_id ties reward pool to one family (parent sets it)
-- ============================================================

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rewards_select" ON rewards;
DROP POLICY IF EXISTS "rewards_insert" ON rewards;
DROP POLICY IF EXISTS "rewards_update" ON rewards;
DROP POLICY IF EXISTS "rewards_delete" ON rewards;

CREATE POLICY "rewards_select" ON rewards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "rewards_insert" ON rewards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "rewards_update" ON rewards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "rewards_delete" ON rewards
  FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- TABLE: claims
-- Category: PER-USER PRIVATE
-- Reason: user_id ties claims to the family that made them
-- ============================================================

ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "claims_select" ON claims;
DROP POLICY IF EXISTS "claims_insert" ON claims;
DROP POLICY IF EXISTS "claims_update" ON claims;
DROP POLICY IF EXISTS "claims_delete" ON claims;

CREATE POLICY "claims_select" ON claims
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "claims_insert" ON claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "claims_update" ON claims
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "claims_delete" ON claims
  FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- TABLE: usage_logs
-- Category: ADMIN-ONLY
-- Reason: internal billing/monitoring data, users must never
--         read or write it directly. Accessible only via
--         service role key (dashboard + edge functions).
--         No authenticated or anon access at all.
-- ============================================================

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usage_logs_select" ON usage_logs;
DROP POLICY IF EXISTS "usage_logs_insert" ON usage_logs;
DROP POLICY IF EXISTS "usage_logs_update" ON usage_logs;
DROP POLICY IF EXISTS "usage_logs_delete" ON usage_logs;

-- No policies created = anon and authenticated roles are
-- completely blocked. Only service_role bypasses RLS.
-- Edge functions use SUPABASE_SERVICE_ROLE_KEY to insert.

-- Revoke direct access from all non-service roles
REVOKE SELECT, INSERT, UPDATE, DELETE ON usage_logs FROM anon, authenticated;
