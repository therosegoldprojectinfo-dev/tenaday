-- ============================================================
-- NUMIO — set_parent_pin RPC (v2)
-- Run this in Supabase SQL editor AFTER rls_hardening_v3.sql
-- ============================================================
-- Why this exists:
-- rls_hardening_v3.sql revokes UPDATE on profiles from authenticated.
-- parent_pin cannot be written by the client directly after v3.
--
-- TWO USE CASES:
-- 1. Signup: no old PIN exists yet — p_old_pin_hash is NULL,
--    function checks that no PIN is set yet before writing.
-- 2. PIN change (future UI): old PIN must be verified first.
--
-- Security: requires is_parent_verified() OR no existing PIN.
-- A child cannot call this to overwrite a parent's PIN because:
--   - At signup: parent_pin IS NULL so only the signup flow hits this
--   - After signup: existing PIN must be provided and match
-- ============================================================

CREATE OR REPLACE FUNCTION set_parent_pin(p_pin_hash text, p_old_pin_hash text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_pin text;
BEGIN
  -- Validate: must be a 64-char string (SHA-256 hex output)
  IF p_pin_hash IS NULL OR length(p_pin_hash) != 64 THEN
    RAISE EXCEPTION 'Invalid PIN hash';
  END IF;

  -- Get existing PIN
  SELECT parent_pin INTO stored_pin FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- CASE 1: No PIN set yet (signup flow) — allow write freely
  IF stored_pin IS NULL THEN
    UPDATE profiles SET parent_pin = p_pin_hash WHERE id = auth.uid();
    RETURN;
  END IF;

  -- CASE 2: PIN already exists — require old PIN to be provided and correct
  -- This prevents a child from overwriting the parent PIN from devtools
  IF p_old_pin_hash IS NULL THEN
    RAISE EXCEPTION 'Current PIN required to change PIN';
  END IF;

  IF stored_pin != p_old_pin_hash THEN
    RAISE EXCEPTION 'Current PIN is incorrect';
  END IF;

  UPDATE profiles SET parent_pin = p_pin_hash WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION set_parent_pin(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION set_parent_pin(text, text) TO authenticated;

-- Drop the old single-arg version if it exists
DROP FUNCTION IF EXISTS set_parent_pin(text);
