-- ============================================================
-- NUMIO — Security Patch v1
-- Run AFTER rls_hardening_v3.sql
-- ============================================================

-- Revoke client SELECT on parent_pin column
-- Prevents a kid reading the hash from devtools and replaying it
-- to verify_parent_pin to get a parent session.
-- profiles_select policy still allows reading all other columns.
REVOKE SELECT (parent_pin) ON profiles FROM authenticated;
