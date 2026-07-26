-- ============================================================
-- NUMIO — SECURITY HARDENING v2
-- Run this in Supabase SQL editor AFTER economy_rpcs.sql
-- ============================================================

-- ── 1. REWARDS: revoke direct insert/update/delete from clients ──
-- Parents must use RPCs for create/delete, keeping audit trail

CREATE OR REPLACE FUNCTION create_reward_for_family(p_name text, p_cost int)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reward_id uuid;
BEGIN
  IF p_cost < 1 OR p_cost > 10000 THEN
    RAISE EXCEPTION 'Invalid cost';
  END IF;
  IF length(p_name) < 1 OR length(p_name) > 100 THEN
    RAISE EXCEPTION 'Invalid name';
  END IF;

  INSERT INTO rewards (user_id, name, cost)
  VALUES (auth.uid(), p_name, p_cost)
  RETURNING id INTO reward_id;

  RETURN reward_id;
END;
$$;

CREATE OR REPLACE FUNCTION delete_reward_for_family(p_reward_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rewards
  WHERE id = p_reward_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reward not found or unauthorized';
  END IF;
END;
$$;

-- Approve claim RPC (only parent can approve, only pending claims)
CREATE OR REPLACE FUNCTION approve_claim_for_family(p_claim_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE claims
  SET status = 'approved'
  WHERE id = p_claim_id
    AND user_id = auth.uid()
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim not found, already approved, or unauthorized';
  END IF;
END;
$$;

-- ── 2. Tighten RLS: rewards — read-only for authenticated users ──
-- (create/delete go through RPCs only)

DROP POLICY IF EXISTS "rewards_insert" ON rewards;
DROP POLICY IF EXISTS "rewards_update" ON rewards;
DROP POLICY IF EXISTS "rewards_delete" ON rewards;

-- No direct insert/update/delete from client — RPCs only
-- Select remains (users need to read their own rewards)

-- ── 3. Tighten RLS: claims — no direct update from client ────────
-- (approve goes through RPC only)

DROP POLICY IF EXISTS "claims_update" ON claims;
DROP POLICY IF EXISTS "claims_delete" ON claims;

-- No direct update/delete on claims — use RPCs

-- ── 4. Add per-query ownership filter on claims select ───────────
DROP POLICY IF EXISTS "claims_select" ON claims;
CREATE POLICY "claims_select" ON claims
  FOR SELECT USING (auth.uid() = user_id);

-- ── 5. Add per-query ownership filter on rewards select ──────────
DROP POLICY IF EXISTS "rewards_select" ON rewards;
CREATE POLICY "rewards_select" ON rewards
  FOR SELECT USING (auth.uid() = user_id);

-- ── 6. Fix rate limit race condition in edge function ─────────────
-- Atomic counter per user per day using a separate table

CREATE TABLE IF NOT EXISTS daily_quiz_counts (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  count int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

ALTER TABLE daily_quiz_counts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON daily_quiz_counts FROM anon, authenticated;

CREATE OR REPLACE FUNCTION increment_daily_quiz_count(p_user_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count int;
  max_daily int := 20;
BEGIN
  INSERT INTO daily_quiz_counts (user_id, date, count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET count = daily_quiz_counts.count + 1
  RETURNING count INTO new_count;

  IF new_count > max_daily THEN
    -- Rollback the increment
    UPDATE daily_quiz_counts
    SET count = count - 1
    WHERE user_id = p_user_id AND date = CURRENT_DATE;
    RAISE EXCEPTION 'Daily limit reached';
  END IF;

  RETURN new_count;
END;
$$;

REVOKE ALL ON FUNCTION increment_daily_quiz_count(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_daily_quiz_count(uuid) TO service_role;

-- ── 7. Permissions for new RPCs ──────────────────────────────────
REVOKE ALL ON FUNCTION create_reward_for_family(text, int) FROM anon;
REVOKE ALL ON FUNCTION delete_reward_for_family(uuid) FROM anon;
REVOKE ALL ON FUNCTION approve_claim_for_family(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION create_reward_for_family(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_reward_for_family(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_claim_for_family(uuid) TO authenticated;

-- ── 8. Add PIN attempt throttling to verify_parent_pin ───────────
CREATE TABLE IF NOT EXISTS pin_attempts (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_time timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, attempt_time)
);

ALTER TABLE pin_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON pin_attempts FROM anon, authenticated;

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
  -- Rate limit: max 5 attempts in last 15 minutes
  SELECT COUNT(*) INTO recent_attempts
  FROM pin_attempts
  WHERE user_id = auth.uid()
    AND attempt_time > now() - interval '15 minutes';

  IF recent_attempts >= 5 THEN
    RAISE EXCEPTION 'Too many attempts. Try again in 15 minutes.';
  END IF;

  -- Record this attempt
  INSERT INTO pin_attempts (user_id) VALUES (auth.uid());

  -- Check PIN
  SELECT parent_pin INTO stored_pin
  FROM profiles
  WHERE id = auth.uid();

  IF stored_pin IS NOT NULL AND stored_pin = input_pin THEN
    -- Clear attempts on success
    DELETE FROM pin_attempts WHERE user_id = auth.uid();
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION verify_parent_pin(text) FROM anon;
GRANT EXECUTE ON FUNCTION verify_parent_pin(text) TO authenticated;

-- ── 9. Fix html lang — add language column to profiles query ─────
-- (handled in App.jsx already, this is a reminder)

-- ── 10. CORS tightening — handled in edge function ───────────────
-- (see generate-exam/index.ts update)
