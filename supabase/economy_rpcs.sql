-- ============================================================
-- NUMIO — ECONOMY RPCs
-- Run this in Supabase SQL editor AFTER rls_setup.sql
-- ============================================================

-- ── Add coins to a kid (atomic) ──────────────────────────────────
CREATE OR REPLACE FUNCTION add_coins_to_kid(kid_id uuid, amount int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance int;
BEGIN
  IF amount < 0 OR amount > 1000 THEN
    RAISE EXCEPTION 'Invalid coin amount';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM kid_profiles WHERE id = kid_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE kid_profiles
  SET coin_balance = GREATEST(0, coin_balance + amount)
  WHERE id = kid_id
  RETURNING coin_balance INTO new_balance;

  RETURN new_balance;
END;
$$;

-- ── Deduct coins from a kid (atomic) ─────────────────────────────
CREATE OR REPLACE FUNCTION deduct_coins_from_kid(kid_id uuid, amount int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance int;
  current_balance int;
BEGIN
  SELECT coin_balance INTO current_balance
  FROM kid_profiles WHERE id = kid_id AND user_id = auth.uid();

  IF NOT FOUND THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF current_balance < amount THEN RAISE EXCEPTION 'Not enough coins'; END IF;

  UPDATE kid_profiles
  SET coin_balance = coin_balance - amount
  WHERE id = kid_id
  RETURNING coin_balance INTO new_balance;

  RETURN new_balance;
END;
$$;

-- ── Update streak for a kid (server-side date logic) ─────────────
CREATE OR REPLACE FUNCTION update_kid_streak(kid_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile record;
  today date := CURRENT_DATE;
  yesterday date := CURRENT_DATE - 1;
  new_streak int;
BEGIN
  SELECT streak_count, streak_last_date INTO profile
  FROM kid_profiles WHERE id = kid_id AND user_id = auth.uid();

  IF NOT FOUND THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  IF profile.streak_last_date = today THEN
    RETURN jsonb_build_object('streakCount', profile.streak_count, 'isNewDay', false, 'previousStreak', profile.streak_count);
  END IF;

  new_streak := CASE WHEN profile.streak_last_date = yesterday THEN profile.streak_count + 1 ELSE 1 END;

  UPDATE kid_profiles SET streak_count = new_streak, streak_last_date = today WHERE id = kid_id;

  RETURN jsonb_build_object('streakCount', new_streak, 'isNewDay', true, 'previousStreak', profile.streak_count);
END;
$$;

-- ── Claim a reward for a kid (atomic balance check) ──────────────
CREATE OR REPLACE FUNCTION claim_reward_for_kid(p_reward_id uuid, p_kid_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reward_cost int;
  current_balance int;
  claim_id uuid;
BEGIN
  SELECT coin_balance INTO current_balance
  FROM kid_profiles WHERE id = p_kid_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT cost INTO reward_cost FROM rewards WHERE id = p_reward_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Reward not found'; END IF;

  IF current_balance < reward_cost THEN RAISE EXCEPTION 'Not enough coins'; END IF;

  UPDATE kid_profiles SET coin_balance = coin_balance - reward_cost WHERE id = p_kid_id;

  INSERT INTO claims (user_id, kid_id, reward_id, status)
  VALUES (auth.uid(), p_kid_id, p_reward_id, 'pending')
  RETURNING id INTO claim_id;

  RETURN claim_id;
END;
$$;

-- ── Permissions ───────────────────────────────────────────────────
REVOKE ALL ON FUNCTION add_coins_to_kid(uuid, int) FROM anon;
REVOKE ALL ON FUNCTION deduct_coins_from_kid(uuid, int) FROM anon;
REVOKE ALL ON FUNCTION update_kid_streak(uuid) FROM anon;
REVOKE ALL ON FUNCTION claim_reward_for_kid(uuid, uuid) FROM anon;

GRANT EXECUTE ON FUNCTION add_coins_to_kid(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_coins_from_kid(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION update_kid_streak(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_reward_for_kid(uuid, uuid) TO authenticated;

-- ── Complete quiz and award coins (server-derived amount) ────────
-- Replaces the client-supplied addCoins() call.
-- Verifies the exam belongs to this family, derives coin amount
-- from question count server-side — client cannot supply amount.
-- COINS_PER_QUESTION = 2 (matches Quiz.jsx constant)
CREATE OR REPLACE FUNCTION complete_quiz_and_award_coins(
  p_exam_id uuid,
  p_kid_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  question_count int;
  coins_to_award int;
  new_balance    int;
BEGIN
  -- Verify exam belongs to this authenticated user's family
  SELECT jsonb_array_length(questions) INTO question_count
  FROM exams
  WHERE id = p_exam_id AND user_id = auth.uid();

  IF NOT FOUND OR question_count IS NULL THEN
    RAISE EXCEPTION 'Exam not found or unauthorized';
  END IF;

  -- Verify kid belongs to this family
  IF NOT EXISTS (
    SELECT 1 FROM kid_profiles WHERE id = p_kid_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Derive coins server-side (2 per question) — client never supplies amount
  coins_to_award := question_count * 2;

  UPDATE kid_profiles
  SET coin_balance = GREATEST(0, coin_balance + coins_to_award)
  WHERE id = p_kid_id
  RETURNING coin_balance INTO new_balance;

  RETURN jsonb_build_object(
    'coinsAwarded', coins_to_award,
    'newBalance',   new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION complete_quiz_and_award_coins(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION complete_quiz_and_award_coins(uuid, uuid) TO authenticated;

-- ── Revoke direct client access to raw coin mutation RPCs ────────
-- add_coins_to_kid and deduct_coins_from_kid are no longer called
-- from any app code path. Only complete_quiz_and_award_coins and
-- claim_reward_for_kid (via economy.js) are the live coin paths.
-- Revoking authenticated access closes the devtools farming vector.
REVOKE EXECUTE ON FUNCTION add_coins_to_kid(uuid, int) FROM authenticated;
REVOKE EXECUTE ON FUNCTION deduct_coins_from_kid(uuid, int) FROM authenticated;
