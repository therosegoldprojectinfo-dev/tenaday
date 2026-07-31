-- ============================================================
-- NUMIO — RLS HARDENING v3
-- Run this in Supabase SQL editor LAST (after all other files).
-- Closes direct-write vectors left open by rls_setup.sql.
-- ============================================================

-- ============================================================
-- STEP 1: Add set_activated RPC BEFORE revoking the column.
-- App.jsx sets activated via direct client update (lines 144,153).
-- We must replace that with a SECURITY DEFINER RPC first,
-- otherwise revoking the column breaks activation permanently.
-- After deploying this SQL, update App.jsx to call this RPC.
-- ============================================================

CREATE OR REPLACE FUNCTION set_profile_activated()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET activated = true WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION set_profile_activated() FROM anon;
GRANT EXECUTE ON FUNCTION set_profile_activated() TO authenticated;


-- ============================================================
-- STEP 2: Revoke table-level UPDATE first (required for
-- column-level REVOKEs to have any effect in Postgres —
-- column revokes are no-ops if role holds table-level grant).
-- Then re-grant UPDATE on the safe columns only.
-- ============================================================

-- kid_profiles: revoke all UPDATE, re-grant only name + emoji
REVOKE UPDATE ON kid_profiles FROM authenticated;
GRANT UPDATE (name) ON kid_profiles TO authenticated;

-- profiles: revoke all UPDATE, re-grant only safe fields
REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (display_name, language) ON profiles TO authenticated;

-- NOTE: coin_balance, streak_count, streak_last_date → RPC only
-- NOTE: parent_pin → set only at signup via upsert (INSERT path)
-- NOTE: activated → set_profile_activated() RPC only


-- ============================================================
-- STEP 3: Lock down claims and rewards direct writes
-- (may already be done by security_hardening_v2.sql,
-- using IF EXISTS so safe to re-run)
-- ============================================================

DROP POLICY IF EXISTS "claims_insert" ON claims;
DROP POLICY IF EXISTS "rewards_insert" ON rewards;
DROP POLICY IF EXISTS "rewards_update" ON rewards;


-- ============================================================
-- STEP 4: Restrict exam INSERT to max 20 questions.
-- Closes the exam-forgery → unlimited coins exploit.
-- Client saveExam() inserts 15 questions — still works.
-- ============================================================

DROP POLICY IF EXISTS "exams_insert" ON exams;
DROP POLICY IF EXISTS "exams_update" ON exams;

CREATE POLICY "exams_insert" ON exams
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND jsonb_array_length(questions) <= 20
  );


-- ============================================================
-- STEP 5: Update complete_quiz_and_award_coins with server-side
-- question count cap (defense in depth — blocks forged exams
-- even if they somehow pass the INSERT policy above).
-- ============================================================

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
  MAX_QUESTIONS  int := 20;
  COINS_PER_Q    int := 2;
BEGIN
  SELECT jsonb_array_length(questions) INTO question_count
  FROM exams
  WHERE id = p_exam_id AND user_id = auth.uid();

  IF NOT FOUND OR question_count IS NULL THEN
    RAISE EXCEPTION 'Exam not found or unauthorized';
  END IF;

  -- Server-side cap — reject forged exams
  IF question_count > MAX_QUESTIONS THEN
    RAISE EXCEPTION 'Invalid exam: question count exceeds maximum';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM kid_profiles WHERE id = p_kid_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Idempotency: already completed → return 0 coins
  IF EXISTS (SELECT 1 FROM quiz_completions WHERE exam_id = p_exam_id AND kid_id = p_kid_id) THEN
    SELECT coin_balance INTO new_balance FROM kid_profiles WHERE id = p_kid_id AND user_id = auth.uid();
    RETURN jsonb_build_object('coinsAwarded', 0, 'newBalance', COALESCE(new_balance, 0));
  END IF;

  INSERT INTO quiz_completions (exam_id, kid_id) VALUES (p_exam_id, p_kid_id)
  ON CONFLICT DO NOTHING;

  coins_to_award := question_count * COINS_PER_Q;

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


-- ============================================================
-- VERIFICATION — run these after applying to confirm it worked
-- ============================================================

-- 1. Should return 0 rows (no table-level UPDATE on kid_profiles):
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants
-- WHERE table_name = 'kid_profiles' AND grantee = 'authenticated' AND privilege_type = 'UPDATE';

-- 2. Should show only 'name' column grant:
-- SELECT grantee, column_name, privilege_type FROM information_schema.column_privileges
-- WHERE table_name = 'kid_profiles' AND grantee = 'authenticated' AND privilege_type = 'UPDATE';

-- 3. Should return 0 rows (no insert on claims):
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'claims' AND cmd = 'INSERT';

-- 4. Should show exams_insert with question count check:
-- SELECT policyname, with_check FROM pg_policies WHERE tablename = 'exams' AND cmd = 'INSERT';
