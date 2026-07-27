-- ============================================================
-- NUMIO — REJECT CLAIM RPC (v2 — server-side amount derivation)
-- Run this in Supabase SQL editor
-- ============================================================

-- Parent session tracking table
-- Set when PIN is verified, expires after 30 minutes
CREATE TABLE IF NOT EXISTS parent_sessions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  verified_until timestamptz NOT NULL
);

ALTER TABLE parent_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON parent_sessions FROM anon, authenticated;

-- Helper: check if current user has an active parent session
CREATE OR REPLACE FUNCTION is_parent_verified()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM parent_sessions
    WHERE user_id = auth.uid()
      AND verified_until > now()
  );
$$;

-- Update all parent-only RPCs to check parent session

-- create_reward_for_family: requires parent verification
CREATE OR REPLACE FUNCTION create_reward_for_family(p_name text, p_cost int)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reward_id uuid;
BEGIN
  IF NOT is_parent_verified() THEN
    RAISE EXCEPTION 'Parent verification required';
  END IF;
  IF p_cost < 1 OR p_cost > 10000 THEN RAISE EXCEPTION 'Invalid cost'; END IF;
  IF length(p_name) < 1 OR length(p_name) > 100 THEN RAISE EXCEPTION 'Invalid name'; END IF;

  INSERT INTO rewards (user_id, name, cost)
  VALUES (auth.uid(), p_name, p_cost)
  RETURNING id INTO reward_id;

  RETURN reward_id;
END;
$$;

-- delete_reward_for_family: requires parent verification
CREATE OR REPLACE FUNCTION delete_reward_for_family(p_reward_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_parent_verified() THEN
    RAISE EXCEPTION 'Parent verification required';
  END IF;

  DELETE FROM rewards WHERE id = p_reward_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Reward not found or unauthorized'; END IF;
END;
$$;

-- approve_claim_for_family: requires parent verification
CREATE OR REPLACE FUNCTION approve_claim_for_family(p_claim_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_parent_verified() THEN
    RAISE EXCEPTION 'Parent verification required';
  END IF;

  UPDATE claims SET status = 'approved'
  WHERE id = p_claim_id AND user_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Claim not found, already approved, or unauthorized'; END IF;
END;
$$;

-- reject_claim_for_family: NO client-supplied refund amount or kid_id
-- Derives EVERYTHING server-side from the claim and reward rows
CREATE OR REPLACE FUNCTION reject_claim_for_family(p_claim_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kid_id uuid;
  v_refund int;
BEGIN
  IF NOT is_parent_verified() THEN
    RAISE EXCEPTION 'Parent verification required';
  END IF;

  -- Derive kid_id and refund amount server-side from claim + reward rows
  SELECT c.kid_id, r.cost
  INTO v_kid_id, v_refund
  FROM claims c
  JOIN rewards r ON r.id = c.reward_id
  WHERE c.id = p_claim_id
    AND c.user_id = auth.uid()
    AND c.status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim not found, already processed, or unauthorized';
  END IF;

  -- Reject the claim
  UPDATE claims SET status = 'rejected' WHERE id = p_claim_id;

  -- Refund exact reward cost to kid atomically
  IF v_kid_id IS NOT NULL AND v_refund > 0 THEN
    UPDATE kid_profiles
    SET coin_balance = coin_balance + v_refund
    WHERE id = v_kid_id AND user_id = auth.uid();
  END IF;
END;
$$;

-- Permissions
REVOKE ALL ON FUNCTION verify_parent_pin(text) FROM anon;
REVOKE ALL ON FUNCTION is_parent_verified() FROM anon;
REVOKE ALL ON FUNCTION create_reward_for_family(text, int) FROM anon;
REVOKE ALL ON FUNCTION delete_reward_for_family(uuid) FROM anon;
REVOKE ALL ON FUNCTION approve_claim_for_family(uuid) FROM anon;
REVOKE ALL ON FUNCTION reject_claim_for_family(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION verify_parent_pin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION is_parent_verified() TO authenticated;
GRANT EXECUTE ON FUNCTION create_reward_for_family(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_reward_for_family(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_claim_for_family(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_claim_for_family(uuid) TO authenticated;

-- ============================================================
-- PIN HASH UPGRADE (previously pin_hash_migration.sql)
-- Supersedes verify_parent_pin defined earlier in this file.
-- Client sends SHA-256("numio-pin:"+pin), stored value is also
-- SHA-256 hash — plaintext PIN never touches network or DB.
-- ============================================================
CREATE OR REPLACE FUNCTION verify_parent_pin(input_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_pin text;
  recent_attempts int;
BEGIN
  SELECT COUNT(*) INTO recent_attempts
  FROM pin_attempts
  WHERE user_id = auth.uid()
    AND attempt_time > now() - interval '15 minutes';

  IF recent_attempts >= 5 THEN
    RAISE EXCEPTION 'Too many attempts. Try again in 15 minutes.';
  END IF;

  INSERT INTO pin_attempts (user_id) VALUES (auth.uid());

  SELECT parent_pin INTO stored_pin
  FROM profiles WHERE id = auth.uid();

  -- Hash comparison: coalesce on NULL prevents early exit on missing PIN
  -- Inputs are fixed-length SHA-256 hex strings (64 chars); network jitter
  -- far exceeds any byte-level timing signal in practice
  IF coalesce(stored_pin, '') = input_pin AND stored_pin IS NOT NULL THEN
    DELETE FROM pin_attempts WHERE user_id = auth.uid();
    INSERT INTO parent_sessions (user_id, verified_until)
    VALUES (auth.uid(), now() + interval '30 minutes')
    ON CONFLICT (user_id) DO UPDATE SET verified_until = now() + interval '30 minutes';
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION verify_parent_pin(text) FROM anon;
GRANT EXECUTE ON FUNCTION verify_parent_pin(text) TO authenticated;
