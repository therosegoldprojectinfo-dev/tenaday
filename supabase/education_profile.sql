-- ============================================================
-- NUMIO — kid_profiles education context
-- Adds country / region / grade so the quiz engine knows WHO
-- the learner is (curriculum context), not just WHAT the photo
-- shows.
-- Run this after rls_hardening_v3.sql (kid_profiles already
-- has a column-level GRANT UPDATE (name) — we widen it here).
-- ============================================================

ALTER TABLE kid_profiles
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS region  text,
  ADD COLUMN IF NOT EXISTS grade   text;

COMMENT ON COLUMN kid_profiles.country IS 'e.g. "South Africa", "Canada" — set once in Numio+ customization';
COMMENT ON COLUMN kid_profiles.region  IS 'Province/state/region, only asked when relevant for that country (e.g. "Gauteng", "Quebec"). Nullable — some countries only need grade.';
COMMENT ON COLUMN kid_profiles.grade   IS 'School grade/level as entered in onboarding, e.g. "Grade 1". Kept as text since grade naming varies by country.';

-- rls_hardening_v3.sql locked kid_profiles to:
--   GRANT UPDATE (name) ON kid_profiles TO authenticated;
-- Widen it to also allow the parent to set education context.
-- Nothing economy-related (coin_balance, streak_count) is touched —
-- those stay RPC-only.
REVOKE UPDATE ON kid_profiles FROM authenticated;
GRANT UPDATE (name, country, region, grade) ON kid_profiles TO authenticated;

-- Sanity check after running — should show exactly these 4 columns:
-- SELECT column_name FROM information_schema.column_privileges
-- WHERE table_name = 'kid_profiles' AND grantee = 'authenticated' AND privilege_type = 'UPDATE';
