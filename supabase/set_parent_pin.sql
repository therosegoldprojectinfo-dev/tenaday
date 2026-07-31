-- ============================================================
-- NUMIO — set_parent_pin RPC
-- Run this in Supabase SQL editor AFTER rls_hardening_v3.sql
-- ============================================================
-- Why this exists:
-- rls_hardening_v3.sql revokes UPDATE on profiles from authenticated
-- and only re-grants display_name + language.
-- parent_pin cannot be written by the client directly after v3.
-- This SECURITY DEFINER function is the only write path for it.
-- Called once at signup from Onboarding.jsx after the profile INSERT.
-- ============================================================

CREATE OR REPLACE FUNCTION set_parent_pin(p_pin_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate: must be a 64-char hex string (SHA-256 output)
  IF p_pin_hash IS NULL OR length(p_pin_hash) != 64 THEN
    RAISE EXCEPTION 'Invalid PIN hash';
  END IF;

  -- Only writes to the calling user's own profile
  UPDATE profiles SET parent_pin = p_pin_hash WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION set_parent_pin(text) FROM anon;
GRANT EXECUTE ON FUNCTION set_parent_pin(text) TO authenticated;
