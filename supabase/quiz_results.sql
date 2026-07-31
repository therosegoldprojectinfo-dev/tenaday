-- ============================================================
-- NUMIO — quiz_results table
-- Run AFTER rls_hardening_v3.sql
-- Stores per-quiz score for parent visibility and analytics.
-- Coins remain flat (effort-based) — everyone gets full coins.
-- ============================================================

CREATE TABLE IF NOT EXISTS quiz_results (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id     uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  kid_id      uuid NOT NULL REFERENCES kid_profiles(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score_pct   int NOT NULL CHECK (score_pct >= 0 AND score_pct <= 100),
  correct     int NOT NULL,
  total       int NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_results_select" ON quiz_results
  FOR SELECT USING (auth.uid() = user_id);

REVOKE ALL ON quiz_results FROM anon, authenticated;

-- ============================================================
-- Update complete_quiz_and_award_coins to accept score and
-- store results. Coins stay FLAT (question_count * 2) regardless
-- of score — effort is always rewarded.
-- ============================================================

CREATE OR REPLACE FUNCTION complete_quiz_and_award_coins(
  p_exam_id    uuid,
  p_kid_id     uuid,
  p_correct    int DEFAULT NULL,
  p_total      int DEFAULT NULL,
  p_wrong_ids  jsonb DEFAULT '[]'
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
  score_pct      int;
  MAX_QUESTIONS  int := 20;
  COINS_PER_Q    int := 2;
  v_user_id      uuid := auth.uid();
BEGIN
  -- Verify exam belongs to this family
  SELECT jsonb_array_length(questions) INTO question_count
  FROM exams WHERE id = p_exam_id AND user_id = v_user_id;

  IF NOT FOUND OR question_count IS NULL THEN
    RAISE EXCEPTION 'Exam not found or unauthorized';
  END IF;

  IF question_count > MAX_QUESTIONS THEN
    RAISE EXCEPTION 'Invalid exam: question count exceeds maximum';
  END IF;

  -- Verify kid belongs to this family
  IF NOT EXISTS (
    SELECT 1 FROM kid_profiles WHERE id = p_kid_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Idempotency: already completed → return 0 coins
  IF EXISTS (SELECT 1 FROM quiz_completions WHERE exam_id = p_exam_id AND kid_id = p_kid_id) THEN
    SELECT coin_balance INTO new_balance FROM kid_profiles WHERE id = p_kid_id AND user_id = v_user_id;
    RETURN jsonb_build_object('coinsAwarded', 0, 'newBalance', COALESCE(new_balance, 0));
  END IF;

  -- Mark completed
  INSERT INTO quiz_completions (exam_id, kid_id) VALUES (p_exam_id, p_kid_id)
  ON CONFLICT DO NOTHING;

  -- Flat coins — everyone gets full reward for effort
  coins_to_award := question_count * COINS_PER_Q;

  -- Award coins
  UPDATE kid_profiles
  SET coin_balance = GREATEST(0, coin_balance + coins_to_award)
  WHERE id = p_kid_id
  RETURNING coin_balance INTO new_balance;

  -- Store result for parent visibility + analytics
  IF p_correct IS NOT NULL AND p_total IS NOT NULL AND p_total > 0 THEN
    score_pct := GREATEST(0, LEAST(100, ROUND((p_correct::numeric / p_total::numeric) * 100)));
    INSERT INTO quiz_results (exam_id, kid_id, user_id, score_pct, correct, total)
    VALUES (p_exam_id, p_kid_id, v_user_id, score_pct, p_correct, p_total)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'coinsAwarded', coins_to_award,
    'newBalance',   new_balance,
    'scorePct',     COALESCE(score_pct, 100)
  );
END;
$$;

REVOKE ALL ON FUNCTION complete_quiz_and_award_coins(uuid, uuid, int, int, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION complete_quiz_and_award_coins(uuid, uuid, int, int, jsonb) TO authenticated;

-- Drop old 2-arg version
DROP FUNCTION IF EXISTS complete_quiz_and_award_coins(uuid, uuid);
