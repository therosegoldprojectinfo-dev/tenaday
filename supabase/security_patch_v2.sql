-- ============================================================
-- NUMIO — Security Patch v2
-- Run AFTER security_patch_v1.sql
-- ============================================================
-- Fix: REVOKE SELECT (parent_pin) in v1 was a no-op because
-- authenticated still held table-level SELECT on profiles.
-- Column-level revokes require table-level revoke first.
--
-- This does it correctly:
-- 1. Revoke table-level SELECT entirely
-- 2. Re-grant SELECT on all safe columns only (not parent_pin)
-- ============================================================

-- Step 1: Revoke table-level SELECT
REVOKE SELECT ON profiles FROM authenticated;

-- Step 2: Re-grant all safe columns (everything except parent_pin)
GRANT SELECT (
  id,
  display_name,
  language,
  activated,
  created_at
) ON profiles TO authenticated;

-- Verify with:
-- SELECT privilege_type FROM information_schema.role_table_grants
-- WHERE table_name='profiles' AND grantee='authenticated' AND privilege_type='SELECT';
-- Must return 0 rows (no table-level SELECT remains)
--
-- SELECT column_name FROM information_schema.column_privileges
-- WHERE table_name='profiles' AND grantee='authenticated' AND privilege_type='SELECT';
-- Must show id, display_name, language, activated, created_at — NOT parent_pin
